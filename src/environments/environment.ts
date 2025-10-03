// DEVELOPMENT ENVIRONMENT CONFIGURATION 
// Firebase config loaded from environment variables
// Values are injected during build process from .env.local

export const environment = {
  production: false,
  enableAnalytics: false, // Disable analytics in development
  firebase: {
    // Firebase config - use placeholder for build replacement, or real config for development
    apiKey: '{{NG_APP_FIREBASE_API_KEY}}',
    authDomain: '{{NG_APP_FIREBASE_AUTH_DOMAIN}}',
    databaseURL: '{{NG_APP_FIREBASE_DATABASE_URL}}',
    projectId: '{{NG_APP_FIREBASE_PROJECT_ID}}',
    storageBucket: '{{NG_APP_FIREBASE_STORAGE_BUCKET}}',
    messagingSenderId: '{{NG_APP_FIREBASE_MESSAGING_SENDER_ID}}',
    appId: '{{NG_APP_FIREBASE_APP_ID}}',
    measurementId: '{{NG_APP_FIREBASE_MEASUREMENT_ID}}'
  }
};
