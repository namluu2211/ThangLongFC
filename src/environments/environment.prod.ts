// PRODUCTION ENVIRONMENT CONFIGURATION
// Firebase config loaded from environment variables  
// Values are injected during build process from GitHub Secrets or .env.local
// Updated: 2025-09-28 - Deploy with corrected Firebase database region URL

export const environment = {
  production: true,
  apiUrl: '{{NG_APP_API_URL}}',
  firebase: {
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
