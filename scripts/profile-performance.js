#!/usr/bin/env node
/*
 * Performance Profiling Script
 * Builds production bundle with stats-json and outputs key metrics.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd){
  execSync(cmd, { stdio: 'inherit' });
}

function build(){
  console.log('🔄 Building production bundle with stats...');
  run('npm run build -- --configuration production --stats-json');
}

function findStatsJson(){
  const candidates = [
    path.join(process.cwd(), 'dist', 'browser', 'stats.json'),
    path.join(process.cwd(), 'dist', 'stats.json'),
    path.join(process.cwd(), 'dist', 'thanglong-fc', 'stats.json')
  ];
  for(const c of candidates){ if(fs.existsSync(c)) return c; }
  // Fallback: recursive search limited depth
  const distDir = path.join(process.cwd(), 'dist');
  if(fs.existsSync(distDir)){
    const entries = fs.readdirSync(distDir);
    for(const e of entries){
      const p = path.join(distDir, e, 'stats.json');
      if(fs.existsSync(p)) return p;
    }
  }
  return null;
}

function analyze(){
  const statsPath = findStatsJson();
  if(!statsPath){
    console.error('❌ stats.json not found in expected locations.');
    console.error('Checked dist/browser, dist/, dist/thanglong-fc and shallow subdirectories.');
    process.exit(1);
  }
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
  // Angular v20 stats format: outputs object keyed by file name; gather JS/CSS assets.
  let outputs = stats?.outputs || stats; // fallback in case structure differs
  if(outputs && outputs.inputs){ // we are at a nested level when truncated
    outputs = stats.outputs || {}; // ensure correct root
  }
  const assetEntries = Object.entries(outputs || {})
    .filter(([name, meta]) => typeof meta === 'object' && meta && 'bytes' in meta && !name.endsWith('.map'))
    .map(([name, meta]) => ({ name, size: meta.bytes }));
  const totalBytes = assetEntries.reduce((s,a)=> s + (a.size||0),0);
  const largest = assetEntries.slice().sort((a,b)=> (b.size||0)-(a.size||0)).slice(0,15);
  const bundles = assetEntries.filter(a => /(main|polyfills|runtime|vendor)/.test(a.name));
  console.log('\n📊 Bundle Size Summary');
  console.log('--------------------------------');
  console.log('Total assets (excl. maps):', (totalBytes/1024).toFixed(2), 'KB');
  if(bundles.length){
    bundles.forEach(b => console.log(`${b.name.padEnd(30)} ${(b.size/1024).toFixed(2)} KB`));
  } else {
    console.log('No primary bundles matched regex (main|polyfills|runtime|vendor).');
  }
  console.log('\nTop Largest Assets:');
  largest.forEach(a => console.log(` - ${a.name.padEnd(30)} ${(a.size/1024).toFixed(2)} KB`));
  // Simple heuristic suggestions
  if(totalBytes > 1500 * 1024){
    console.log('\n⚠️ Consider code-splitting: total > 1.5MB.');
  }
  if(!bundles.some(b => /vendor/.test(b.name))){
    console.log('\nℹ️ Vendor bundle not detected (Angular application builder may merge vendor into main).');
  }
  console.log('\n✅ Profiling complete');
}

try {
  build();
  analyze();
} catch(e){
  console.error('Profiling failed:', e.message);
  process.exit(1);
}