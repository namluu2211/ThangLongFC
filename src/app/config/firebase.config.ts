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
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('🚨 Firebase configuration is incomplete. Please check your environment variables.');
  console.log('Required environment variables:');
  console.log('- NG_APP_FIREBASE_API_KEY');
  console.log('- NG_APP_FIREBASE_PROJECT_ID');
  console.log('- NG_APP_FIREBASE_AUTH_DOMAIN');
  console.log('- NG_APP_FIREBASE_DATABASE_URL');
  console.log('- NG_APP_FIREBASE_STORAGE_BUCKET');
  console.log('- NG_APP_FIREBASE_MESSAGING_SENDER_ID');
  console.log('- NG_APP_FIREBASE_APP_ID');
  console.log('- NG_APP_FIREBASE_MEASUREMENT_ID (optional)');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only if running in browser and measurement ID is provided
try {
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    getAnalytics(app);
  }
} catch (error) {
  console.warn('Firebase Analytics could not be initialized:', error);
}