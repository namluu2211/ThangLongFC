// DEVELOPMENT ENVIRONMENT CONFIGURATION 
// This is a fallback configuration for 'ng serve' development
// For production, use the build script that replaces placeholders

export const environment = {
  production: false,
  firebase: {
    // These values will be loaded from localStorage or default to demo mode
    // The app will detect missing config and switch to localStorage mode
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: ''
  }
};

// Development mode: detect if Firebase config is missing and provide fallback
const isValidFirebaseConfig = () => {
  return environment.firebase.apiKey && 
         environment.firebase.projectId && 
         environment.firebase.authDomain;
};

// If Firebase config is missing, log a helpful message
if (!isValidFirebaseConfig()) {
  console.warn('🔧 DEVELOPMENT MODE: Firebase configuration not found');
  console.warn('💡 The app will run in offline mode using localStorage');
  console.warn('📋 To use Firebase in development:');
  console.warn('   1. Create .env.local with your Firebase config');
  console.warn('   2. Run: npm run build && npm start');
  console.warn('   3. Or check ENVIRONMENT.md for setup instructions');
}