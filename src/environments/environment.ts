// DEV ENVIRONMENT CONFIGURATION

export const environment = {
  production: true,
  enableAnalytics: true, // Enable analytics in production
  apiUrl: 'https://api.thanglong-fc.com',
  // Feature gating flags (production tuned)
  features: {
    performanceMonitoring: false, // disable continuous perf monitoring to save CPU
    assetOptimization: true, // enable avatar & critical asset preload
    componentPreload: true, // preload select components after idle
    firebaseRealtime: true, // keep realtime sync
    aiAnalysis: true // allow AI analysis (can be toggled if costly)
    ,fileCrud: false // disable file-based CRUD in production
  },
  firebase: {
    // Production values should be replaced during build process
    apiKey: 'AIzaSyA8LGY9V5Y_mMAdo76vRslUaeykzzUbx48',
    authDomain: 'mia-fcm-d8555.firebaseapp.com',
    databaseURL: 'https://mia-fcm-d8555-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'mia-fcm-d8555',
    storageBucket: 'mia-fcm-d8555.appspot.com',
    messagingSenderId: '673675435415',
    appId: '1:673675435415:web:7a73f1c143c3dee6f3b8d2',
    measurementId: 'G-JC3CBSN2BF'
    // measurementId restored - will be injected from environment variables
  }
};
