// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyA8LGY9V5Y_mMAdo76vRslUaeykzzUbx48",
  authDomain: "mia-fcm-d8555.firebaseapp.com",
  projectId: "mia-fcm-d8555",
  storageBucket: "mia-fcm-d8555.firebasestorage.app",
  messagingSenderId: "673675435415",
  appId: "1:673675435415:web:7a73f1c143c3dee6f3b8d2",
  measurementId: "G-JC3CBSN2BF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);