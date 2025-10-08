const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  let envVars = {};
  
  if (fs.existsSync(envPath)) {
    console.log('📁 Loading environment variables from .env.local...');
    
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
  }
  
  // Set environment variables
  Object.keys(envVars).forEach(key => {
    if (envVars[key]) {
      process.env[key] = envVars[key];
      const maskedValue = envVars[key].length > 10 ? 
        envVars[key].substring(0, 10) + '...' : 
        envVars[key];
      console.log(`✅ Set ${key}=${maskedValue}`);
    }
  });
  
  console.log(`\n🔥 Environment variables loaded: ${Object.keys(envVars).length} found\n`);
  return envVars;
}

// Replace environment placeholders in environment files
function replaceEnvironmentPlaceholders(envVars) {
  const environmentFile = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
  
  if (fs.existsSync(environmentFile)) {
    console.log('🔄 Processing environment.ts for development...');
    
    let content = fs.readFileSync(environmentFile, 'utf8');
    
    // Create backup first
    const backupPath = environmentFile + '.dev-backup';
    fs.writeFileSync(backupPath, content, 'utf8');
    
    let fileReplacements = 0;
    
    // Replace placeholders with actual values
    Object.keys(envVars).forEach(key => {
      const placeholder = `{{${key}}}`;
      if (content.includes(placeholder)) {
        if (envVars[key] && !envVars[key].startsWith('{{')) {
          content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), envVars[key]);
          fileReplacements++;
          console.log(`  ✅ Replaced ${placeholder}`);
        }
      }
    });
    
    if (fileReplacements > 0) {
      fs.writeFileSync(environmentFile, content, 'utf8');
      console.log(`  💾 Updated environment.ts (${fileReplacements} replacements)\n`);
    }
    
    return fileReplacements;
  }
  
  return 0;
}

// Restore environment file from backup
function restoreEnvironmentFile() {
  const environmentFile = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
  const backupPath = environmentFile + '.dev-backup';
  
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, environmentFile);
    fs.unlinkSync(backupPath);
    console.log('🔄 Restored environment.ts to original state');
  }
}

// Main execution
console.log('🔥 ThangLong FC Development Server with Environment Loading');
console.log('=========================================================\n');

try {
  // Load environment variables
  const envVars = loadEnvFile();
  
  // Replace placeholders in environment file
  const replacements = replaceEnvironmentPlaceholders(envVars);
  
  if (replacements > 0) {
    console.log(`✅ Successfully processed ${replacements} environment variables\n`);
  }
  
  // Handle cleanup on exit
  process.on('exit', () => {
    console.log('\n🧹 Cleaning up environment file...');
    restoreEnvironmentFile();
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 Server interrupted, cleaning up...');
    restoreEnvironmentFile();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Server terminated, cleaning up...');
    restoreEnvironmentFile();
    process.exit(0);
  });

  // Start Angular development server on port 4201
  console.log('🚀 Starting Angular development server on port 4201...\n');
  
  const child = spawn('ng', ['serve', '--port', '4201', '--open'], {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });
  
  child.on('close', (code) => {
    console.log(`\n🛑 Development server stopped with code ${code}`);
    restoreEnvironmentFile();
    process.exit(code);
  });
  
} catch (error) {
  console.error('❌ FATAL ERROR during development server setup:', error.message);
  
  // Attempt cleanup before exit
  try {
    restoreEnvironmentFile();
  } catch (cleanupError) {
    console.error('Failed to cleanup environment file:', cleanupError.message);
  }
  
  process.exit(1);
}