// PRODUCTION ENVIRONMENT CONFIGURATION
// Firebase config loaded from environment variables  
// Values are injected during build process from GitHub Secrets or .env.local
// Updated: 2025-09-28 - Deploy with corrected Firebase database region URL

export const environment = {
  production: true,
  enableAnalytics: true, // Enable analytics in production
  apiUrl: process.env['NG_APP_API_URL'] || 'https://api.thanglong-fc.com',
  firebase: {
    apiKey: process.env['NG_APP_FIREBASE_API_KEY'] || '',
    authDomain: process.env['NG_APP_FIREBASE_AUTH_DOMAIN'] || '',
    databaseURL: process.env['NG_APP_FIREBASE_DATABASE_URL'] || '',
    projectId: process.env['NG_APP_FIREBASE_PROJECT_ID'] || '',
    storageBucket: process.env['NG_APP_FIREBASE_STORAGE_BUCKET'] || '',
    messagingSenderId: process.env['NG_APP_FIREBASE_MESSAGING_SENDER_ID'] || '',
    appId: process.env['NG_APP_FIREBASE_APP_ID'] || ''
    // measurementId removed - analytics disabled to prevent configuration errors
  }
};
