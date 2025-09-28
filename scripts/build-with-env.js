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
  
  // Load from files
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`📁 Loading environment variables from ${path.basename(envPath)}...`);
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      break; // Use the first file found
    }
  }
  
  // Merge with system environment variables (for CI/CD)
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('NG_APP_') && !envVars[key]) {
      envVars[key] = process.env[key];
    }
  });
  
  // Set environment variables
  Object.keys(envVars).forEach(key => {
    process.env[key] = envVars[key];
    const maskedValue = envVars[key].length > 10 ? 
      envVars[key].substring(0, 10) + '...' : 
      envVars[key];
    console.log(`✅ Set ${key}=${maskedValue}`);
  });
  
  console.log('🔥 Environment variables loaded successfully!\n');
  return envVars;
}

// Replace environment placeholders in environment files
function replaceEnvironmentPlaceholders(envVars) {
  const environmentFiles = [
    path.join(__dirname, '..', 'src', 'environments', 'environment.ts'),
    path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts')
  ];
  
  environmentFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`🔄 Processing ${path.basename(filePath)}...`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      let replaced = false;
      
      // Replace placeholders with actual values
      Object.keys(envVars).forEach(key => {
        const placeholder = `{{${key}}}`;
        if (content.includes(placeholder)) {
          content = content.replace(new RegExp(placeholder, 'g'), envVars[key]);
          replaced = true;
          console.log(`  ✅ Replaced ${placeholder}`);
        }
      });
      
      if (replaced) {
        // Create backup
        const backupPath = filePath + '.backup';
        fs.copyFileSync(filePath, backupPath);
        
        // Write updated content
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  💾 Updated ${path.basename(filePath)}`);
      }
    }
  });
}

// Run Angular build with environment variables
function runBuild() {
  const buildType = process.argv[2] || 'development';
  const command = buildType === 'production' ? 'build:prod' : 'build';
  
  console.log(`🚀 Running Angular build (${buildType})...`);
  
  const child = spawn('npm', ['run', command], {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Build completed successfully!');
    } else {
      console.log(`\n❌ Build failed with code ${code}`);
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

const envVars = loadEnvFile();
replaceEnvironmentPlaceholders(envVars);

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

runBuild();