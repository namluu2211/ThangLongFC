// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
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
  appId: environment.firebase.appId
};

// Validate required Firebase configuration
const hasValidConfig = firebaseConfig.apiKey && 
                      firebaseConfig.projectId && 
                      firebaseConfig.databaseURL &&
                      !firebaseConfig.apiKey.includes('{{') && 
                      !firebaseConfig.projectId.includes('{{') &&
                      !firebaseConfig.apiKey.includes('dev-api-key') && // Skip dev placeholder
                      firebaseConfig.apiKey.length > 20; // Ensure it's a real API key

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
    // Check if Firebase app already exists
    const existingApps = getApps();
    if (existingApps.length > 0) {
      console.log('🔥 Using existing Firebase app instance from config');
      app = existingApps[0];
    } else {
      console.log('🔥 Initializing new Firebase app from config');
      app = initializeApp(firebaseConfig);
    }
    console.log('✅ Firebase initialized successfully');
    
    // Analytics disabled to prevent measurement ID errors
    console.log('📊 Firebase Analytics disabled to prevent configuration errors');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    app = null;
  }
} else {
  console.log('🔄 Running in development mode without Firebase');
}

export const firebaseApp = app;