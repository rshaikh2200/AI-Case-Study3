// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDvUCLFwH1OIt9CZM1JiN_659jRGcBrzI0",
    authDomain: "ai-customer-support-c55b2.firebaseapp.com",
    projectId: "ai-customer-support-c55b2",
    storageBucket: "ai-customer-support-c55b2.appspot.com",
    messagingSenderId: "134582745880",
    appId: "1:134582745880:web:59ea13c0dffc6e483ebc6d"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app); // Initialize Firestore
export const auth = getAuth(app)
export { app, firestore };