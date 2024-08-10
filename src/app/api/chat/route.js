// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app); // Initialize Firestore
const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export { app, firestore, auth, googleProvider };
