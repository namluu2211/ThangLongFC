// DEVELOPMENT ENVIRONMENT CONFIGURATION 
// Firebase config loaded from environment variables
// Values are injected during build process from .env.local

export const environment = {
  production: false,
  enableAnalytics: false, // Disable analytics in development
  firebase: {
    // Development config - using placeholder values for local development
    apiKey: 'dev-mode-placeholder',
    authDomain: 'localhost',
    databaseURL: 'https://localhost/dev-database',
    projectId: 'dev-project',
    storageBucket: 'dev-storage',
    messagingSenderId: 'dev-sender',
    appId: 'dev-app-id'
    // measurementId removed - analytics disabled in development
  }
};
