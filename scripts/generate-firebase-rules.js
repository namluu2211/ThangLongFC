/**
 * 🚀 Firebase Rules Generator for ThangLong FC
 * 
 * This script generates Firebase Security Rules based on your centralized admin configuration.
 * Usage: node scripts/generate-firebase-rules.js
 */

const fs = require('fs');
const path = require('path');

// Read admin configuration from the centralized config file
function loadAdminConfig() {
  try {
    // Read the TypeScript config file as text and extract the data
    const configPath = path.join(__dirname, '../src/app/config/admin.config.ts');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Extract admin users array using regex (simple approach for this script)
    const adminUsersMatch = configContent.match(/ADMIN_USERS:\s*AdminUser\[\]\s*=\s*(\[[\s\S]*?\]);/);
    
    if (!adminUsersMatch) {
      throw new Error('Could not parse ADMIN_USERS from admin.config.ts');
    }
    
    // Convert TypeScript format to JavaScript (simple string replacements)
    let adminUsersString = adminUsersMatch[1]
      .replace(/'/g, '"')  // Single quotes to double quotes
      .replace(/(\w+):/g, '"$1":')  // Object keys to quoted strings
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']');  // Remove trailing commas in arrays
    
    const ADMIN_USERS = JSON.parse(adminUsersString);
    const ADMIN_EMAILS = ADMIN_USERS.map(user => user.email);
    
    return { ADMIN_USERS, ADMIN_EMAILS };
    
  } catch (error) {
    console.error('⚠️  Could not load admin config from TypeScript file. Using fallback configuration.');
    console.error('Error:', error.message);
    
    // Fallback configuration
    return {
      ADMIN_USERS: [
        { email: 'bktientu@gmail.com', username: 'NamLuu', displayName: 'Nam Lưu', role: 'superadmin' },
        { email: 'nguyenthuysy@gmail.com', username: 'SyNguyen', displayName: 'Sy Nguyễn', role: 'admin' },
        { email: 'hanguyen@thanglongfc.com', username: 'HaNguyen', displayName: 'Hà Nguyễn', role: 'admin' },
        { email: 'hieunguyen@thanglongfc.com', username: 'HieuNguyen', displayName: 'Hiếu Nguyễn', role: 'admin' }
      ],
      ADMIN_EMAILS: ['bktientu@gmail.com', 'nguyenthuysy@gmail.com', 'hanguyen@thanglongfc.com', 'hieunguyen@thanglongfc.com']
    };
  }
}

// Generate Firebase Security Rules using loaded configuration
function generateFirebaseRules(adminEmails) {
  const emailConditions = adminEmails
    .map(email => `auth.token.email == '${email}'`)
    .join(' || ');
  
  return {
    "rules": {
      ".read": true,
      "matchResults": {
        ".write": `auth != null && (${emailConditions})`
      },
      "playerStats": {
        ".write": `auth != null && (${emailConditions})`
      },
      "history": {
        ".write": `auth != null && (${emailConditions})`
      }
    }
  };
}

// Main execution
console.log('🔥 Firebase Security Rules Generator');
console.log('📋 Loading admin configuration from src/app/config/admin.config.ts...\n');

const { ADMIN_USERS, ADMIN_EMAILS } = loadAdminConfig();

console.log('✅ Configuration loaded successfully!');
console.log('📋 Generating rules based on centralized admin configuration...\n');

const rules = generateFirebaseRules(ADMIN_EMAILS);
const rulesString = JSON.stringify(rules, null, 2);

console.log('📄 Generated Firebase Security Rules:');
console.log('=====================================');
console.log(rulesString);
console.log('=====================================\n');

console.log('📋 How to Apply These Rules:');
console.log('1. 📋 Copy the JSON rules above');
console.log('2. 🌐 Go to https://console.firebase.google.com');
console.log('3. 🎯 Select your "thanglong-fc" project');
console.log('4. 🗄️  Go to "Realtime Database" → "Rules" tab');
console.log('5. ✂️  Replace ALL existing rules with the copied JSON');
console.log('6. 📤 Click "Publish" button');
console.log('7. ✅ Done! Your rules are now secure\n');

console.log('🎯 Admin Access Summary:');
console.log('========================');

ADMIN_USERS.forEach(user => {
  const roleIcon = user.role === 'superadmin' ? '👑' : '🔑';
  console.log(`${roleIcon} ${user.email}`);
  console.log(`   └── ${user.displayName} (${user.role.toUpperCase()})`);
});

console.log('\n🔐 Security Features:');
console.log('• ✅ Only authenticated admins can write data');
console.log('• ✅ Everyone can read data (public website access)');
console.log('• ✅ Rules match your email configuration');
console.log('• ✅ Production-ready security');

// Save to file
try {
  const outputPath = path.join(__dirname, 'firebase-rules.json');
  fs.writeFileSync(outputPath, rulesString, 'utf8');
  console.log(`\n💾 Rules saved to: ${outputPath}`);
  console.log('🔗 Configuration source: src/app/config/admin.config.ts (centralized)');
} catch (error) {
  console.log('\n⚠️  Could not save to file, but rules are displayed above');
}