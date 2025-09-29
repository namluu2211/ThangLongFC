// DEVELOPMENT ENVIRONMENT CONFIGURATION 
// Firebase config loaded from environment variables
// Values are injected during build process from .env.local

export const environment = {
  production: false,
  enableAnalytics: false, // Disable analytics in development
  firebase: {
    // Development config - replace with your actual Firebase project values
    apiKey: process.env['NG_APP_FIREBASE_API_KEY'] || 'AIzaSyDevelopmentKey',
    authDomain: process.env['NG_APP_FIREBASE_AUTH_DOMAIN'] || 'thanglong-fc-dev.firebaseapp.com',
    databaseURL: process.env['NG_APP_FIREBASE_DATABASE_URL'] || 'https://thanglong-fc-dev-default-rtdb.asia-southeast1.firebasedatabase.app/',
    projectId: process.env['NG_APP_FIREBASE_PROJECT_ID'] || 'thanglong-fc-dev',
    storageBucket: process.env['NG_APP_FIREBASE_STORAGE_BUCKET'] || 'thanglong-fc-dev.appspot.com',
    messagingSenderId: process.env['NG_APP_FIREBASE_MESSAGING_SENDER_ID'] || '123456789012',
    appId: process.env['NG_APP_FIREBASE_APP_ID'] || '1:123456789012:web:abcdefghijklmnop123456'
    // measurementId removed - analytics disabled in development
  }
};
