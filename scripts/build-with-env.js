const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load environment variables from .env.local or system environment
function loadEnvFile() {
  // Try .env.local first, then .env, then system environment
  const envPaths = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env')
  ];
  
  let envVars = {};
  
  // Load from files (local development)
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`📁 Loading environment variables from ${path.basename(envPath)}...`);
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            let value = valueParts.join('=').trim();
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            envVars[key.trim()] = value;
          }
        }
      });
      break; // Use the first file found
    }
  }
  
  // Load from system environment variables (for CI/CD and production)
  const requiredEnvVars = [
    'NG_APP_FIREBASE_API_KEY',
    'NG_APP_FIREBASE_AUTH_DOMAIN', 
    'NG_APP_FIREBASE_PROJECT_ID',
    'NG_APP_FIREBASE_STORAGE_BUCKET',
    'NG_APP_FIREBASE_DATABASE_URL',
    'NG_APP_FIREBASE_MESSAGING_SENDER_ID',
    'NG_APP_FIREBASE_APP_ID',
    'NG_APP_FIREBASE_MEASUREMENT_ID'
  ];
  
  // Check system environment (prioritized for CI/CD)
  requiredEnvVars.forEach(key => {
    if (process.env[key]) {
      envVars[key] = process.env[key];
    }
  });
  
  // Check for any other NG_APP_ variables
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('NG_APP_') && process.env[key]) {
      envVars[key] = process.env[key];
    }
  });
  
  // Validate required Firebase environment variables
  const missingVars = requiredEnvVars.filter(key => !envVars[key] || envVars[key].startsWith('{{'));
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required Firebase environment variables:');
    missingVars.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Make sure to:');
    console.error('   - Set GitHub Secrets for CI/CD deployment');  
    console.error('   - Create .env.local file for local development');
    console.error('   - Check ENVIRONMENT.md for setup instructions\n');
  }
  
  // Set environment variables and show status
  Object.keys(envVars).forEach(key => {
    if (envVars[key] && !envVars[key].startsWith('{{')) {
      process.env[key] = envVars[key];
      const maskedValue = envVars[key].length > 10 ? 
        envVars[key].substring(0, 10) + '...' : 
        envVars[key];
      console.log(`✅ Set ${key}=${maskedValue}`);
    } else {
      console.warn(`⚠️  ${key} is missing or has placeholder value`);
    }
  });
  
  console.log(`\n🔥 Environment variables loaded: ${Object.keys(envVars).length} found\n`);
  return envVars;
}

// Replace environment placeholders in environment files
function replaceEnvironmentPlaceholders(envVars) {
  const environmentFiles = [
    path.join(__dirname, '..', 'src', 'environments', 'environment.ts'),
    path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts')
  ];
  
  let totalReplacements = 0;
  
  environmentFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`🔄 Processing ${path.basename(filePath)}...`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      let replaced = false;
      let fileReplacements = 0;
      
      // Replace placeholders with actual values
      Object.keys(envVars).forEach(key => {
        const placeholder = `{{${key}}}`;
        if (content.includes(placeholder)) {
          // Only replace if we have a valid value (not another placeholder)
          if (envVars[key] && !envVars[key].startsWith('{{')) {
            content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), envVars[key]);
            replaced = true;
            fileReplacements++;
            console.log(`  ✅ Replaced ${placeholder}`);
          } else {
            console.warn(`  ⚠️  Skipping ${placeholder} - no valid value available`);
          }
        }
      });
      
      // Check if there are any remaining placeholders
      const remainingPlaceholders = content.match(/\{\{[^}]+\}\}/g);
      if (remainingPlaceholders) {
        console.warn(`  ⚠️  Warning: ${remainingPlaceholders.length} placeholders still remain:`, remainingPlaceholders);
      }
      
      if (replaced) {
        // Create backup
        const backupPath = filePath + '.backup';
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(filePath, backupPath);
        }
        
        // Write updated content
        fs.writeFileSync(filePath, content, 'utf8');
        totalReplacements += fileReplacements;
        console.log(`  💾 Updated ${path.basename(filePath)} (${fileReplacements} replacements)`);
      } else {
        console.log(`  ℹ️  No changes needed for ${path.basename(filePath)}`);
      }
    } else {
      console.warn(`  ⚠️  File not found: ${path.basename(filePath)}`);
    }
  });
  
  console.log(`\n🎯 Total placeholders replaced: ${totalReplacements}\n`);
  return totalReplacements;
}

// Run Angular build with environment variables
function runBuild() {
  const buildType = process.argv[2] || 'production';
  
  console.log(`🚀 Running Angular ${buildType === 'development' ? 'build (dev)' : 'build (production)'}...`);
  
  let buildCommand;
  let buildArgs;
  
  if (buildType === 'production') {
    buildCommand = 'ng';
    buildArgs = ['build', '--configuration', 'production', '--base-href=/', '--output-path=dist/browser'];
  } else {
    buildCommand = 'ng';
    buildArgs = ['build', '--configuration', 'development', '--output-path=dist/browser'];
  }
  
  const child = spawn(buildCommand, buildArgs, {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✅ Angular ${buildType} build completed successfully!`);
      
      if (buildType === 'production') {
        console.log('🎯 Production build ready for deployment');
        console.log('📁 Output directory: dist/browser/');
        console.log('🚀 Deploy with: npm run deploy:firebase');
      }
    } else {
      console.log(`\n❌ Build failed with code ${code}`);
      console.log('💡 Check the error messages above for details');
    }
    process.exit(code);
  });
}

// Restore environment files from backup
function restoreEnvironmentFiles() {
  const environmentFiles = [
    path.join(__dirname, '..', 'src', 'environments', 'environment.ts'),
    path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts')
  ];
  
  environmentFiles.forEach(filePath => {
    const backupPath = filePath + '.backup';
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, filePath);
      fs.unlinkSync(backupPath);
      console.log(`🔄 Restored ${path.basename(filePath)}`);
    }
  });
}

// Main execution
console.log('🔥 ThangLong FC Secure Environment Builder');
console.log('==========================================\n');

try {
  // Load environment variables
  const envVars = loadEnvFile();
  
  // Validate we have the minimum required configuration
  const requiredVars = [
    'NG_APP_FIREBASE_API_KEY',
    'NG_APP_FIREBASE_AUTH_DOMAIN', 
    'NG_APP_FIREBASE_PROJECT_ID'
  ];
  
  const missingRequired = requiredVars.filter(key => 
    !envVars[key] || envVars[key].startsWith('{{') || envVars[key].trim() === ''
  );
  
  if (missingRequired.length > 0) {
    console.error('❌ CRITICAL: Missing required Firebase configuration!');
    console.error('Missing variables:', missingRequired);
    console.error('\n📋 To fix this:');
    console.error('1. For local development: Create .env.local with Firebase config');
    console.error('2. For CI/CD: Set GitHub repository secrets');
    console.error('3. Check ENVIRONMENT.md for detailed setup instructions\n');
    process.exit(1);
  }
  
  // Replace placeholders in environment files
  const replacements = replaceEnvironmentPlaceholders(envVars);
  
  if (replacements === 0) {
    console.warn('⚠️  Warning: No placeholders were replaced. Environment files may already be processed.\n');
  } else {
    console.log(`✅ Successfully processed ${replacements} environment variables\n`);
  }
  
  // Handle cleanup on exit
  process.on('exit', () => {
    console.log('\n🧹 Cleaning up environment files...');
    restoreEnvironmentFiles();
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 Build interrupted, cleaning up...');
    restoreEnvironmentFiles();
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Build terminated, cleaning up...');
    restoreEnvironmentFiles();
    process.exit(1);
  });

  // Start the build process
  runBuild();
  
} catch (error) {
  console.error('❌ FATAL ERROR during environment setup:', error.message);
  console.error(error.stack);
  
  // Attempt cleanup before exit
  try {
    restoreEnvironmentFiles();
  } catch (cleanupError) {
    console.error('Failed to cleanup environment files:', cleanupError.message);
  }
  
  process.exit(1);
}