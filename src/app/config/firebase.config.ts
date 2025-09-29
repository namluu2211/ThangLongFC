// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { environment } from '../../environments/environment';

// Firebase configuration loaded from environment
// This supports both local development and GitHub Actions with secrets
export const firebaseConfig = {
  apiKey: environment.firebase.apiKey,
  authDomain: environment.firebase.authDomain,
  databaseURL: environment.firebase.databaseURL,
  projectId: environment.firebase.projectId,
  storageBucket: environment.firebase.storageBucket,
  messagingSenderId: environment.firebase.messagingSenderId,
  appId: environment.firebase.appId,
  measurementId: environment.firebase.measurementId
};

// Validate required Firebase configuration
const hasValidConfig = firebaseConfig.apiKey && 
                      firebaseConfig.projectId && 
                      !firebaseConfig.apiKey.includes('{{') && 
                      !firebaseConfig.projectId.includes('{{');

if (!hasValidConfig) {
  console.warn('⚠️ Firebase configuration contains placeholder values or is incomplete.');
  console.warn('The application will run in offline mode for development.');
  console.log('📋 To enable Firebase, set these environment variables:');
  console.log('- NG_APP_FIREBASE_API_KEY');
  console.log('- NG_APP_FIREBASE_PROJECT_ID');
  console.log('- NG_APP_FIREBASE_AUTH_DOMAIN');
  console.log('- NG_APP_FIREBASE_DATABASE_URL');
  console.log('- NG_APP_FIREBASE_STORAGE_BUCKET');
  console.log('- NG_APP_FIREBASE_MESSAGING_SENDER_ID');
  console.log('- NG_APP_FIREBASE_APP_ID');
  console.log('- NG_APP_FIREBASE_MEASUREMENT_ID (optional)');
}

export const isFirebaseConfigValid = hasValidConfig;

// Initialize Firebase only if configuration is valid
let app: import('firebase/app').FirebaseApp | null = null;

if (isFirebaseConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
    
    // Initialize Analytics only if running in browser and measurement ID is provided
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      getAnalytics(app);
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    app = null;
  }
} else {
  console.log('🔄 Running in development mode without Firebase');
}

export const firebaseApp = app;