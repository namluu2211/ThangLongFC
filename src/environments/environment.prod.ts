// SECURE PRODUCTION ENVIRONMENT CONFIGURATION

export const environment = {
  production: true,
  apiUrl: 'https://api.myapp.com',
  firebase: {
    apiKey: '{{NG_APP_FIREBASE_API_KEY}}',
    authDomain: '{{NG_APP_FIREBASE_AUTH_DOMAIN}}',
    projectId: '{{NG_APP_FIREBASE_PROJECT_ID}}',
    storageBucket: '{{NG_APP_FIREBASE_STORAGE_BUCKET}}',
    messagingSenderId: '{{NG_APP_FIREBASE_MESSAGING_SENDER_ID}}',
    appId: '{{NG_APP_FIREBASE_APP_ID}}',
    measurementId: '{{NG_APP_FIREBASE_MEASUREMENT_ID}}'
  }
};
