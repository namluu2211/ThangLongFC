// DEVELOPMENT ENVIRONMENT CONFIGURATION 
// Firebase config loaded from environment variables
// Values are injected during build process from .env.local

export const environment = {
  production: false,
  enableAnalytics: false, // Disable analytics in development
  // Feature gating flags (development defaults)
  features: {
    performanceMonitoring: true, // allow performance service to run locally for tuning
    assetOptimization: false, // disable heavy preloading in dev to speed rebuilds
    componentPreload: false, // disable preload to observe raw lazy loading behavior
    firebaseRealtime: true, // keep realtime for iterative development
    aiAnalysis: true // allow AI analysis component loading
    ,fileCrud: true // enable local file-based CRUD server usage in dev
  },
  firebase: {
    // Firebase config - use placeholder for build replacement, or real config for development
    apiKey: 'AIzaSyA8LGY9V5Y_mMAdo76vRslUaeykzzUbx48',
    authDomain: 'mia-fcm-d8555.firebaseapp.com',
    databaseURL: 'https://mia-fcm-d8555-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'mia-fcm-d8555',
    storageBucket: 'mia-fcm-d8555.appspot.com',
    messagingSenderId: '673675435415',
    appId: '1:673675435415:web:7a73f1c143c3dee6f3b8d2',
    measurementId: 'G-JC3CBSN2BF'
  }
};
