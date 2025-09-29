// PRODUCTION ENVIRONMENT CONFIGURATION
// Firebase config loaded from environment variables  
// Values are injected during build process from GitHub Secrets or .env.local
// Updated: 2025-09-28 - Deploy with corrected Firebase database region URL

export const environment = {
  production: true,
  enableAnalytics: true, // Enable analytics in production
  apiUrl: 'https://api.thanglong-fc.com',
  firebase: {
    // Production values should be replaced during build process
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
    // measurementId removed - analytics disabled to prevent configuration errors
  }
};
