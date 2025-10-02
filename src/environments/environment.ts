// DEVELOPMENT ENVIRONMENT CONFIGURATION 
// Firebase config loaded from environment variables
// Values are injected during build process from .env.local

export const environment = {
  production: false,
  enableAnalytics: false, // Disable analytics in development
  firebase: {
    // Firebase config - use placeholder for build replacement, or real config for development
    apiKey: 'AIzaSyA8LGBtRjlMoelaxDn2-Xz0k9n_7qHlkZE', // Use your actual API key from Firebase console
    authDomain: 'mia-fcm-d8555.firebaseapp.com',
    databaseURL: 'https://mia-fcm-d8555-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'mia-fcm-d8555',
    storageBucket: 'mia-fcm-d8555.appspot.com',
    messagingSenderId: '673675435427',
    appId: '1:673675435427:web:087c64e74bea15b5628b4d',
    measurementId: 'G-JC3CBSN2LW'
  }
};
