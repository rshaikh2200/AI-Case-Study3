// Import the required Firebase services
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCh9UeRMItvnBkzqvMCiiWzACxKY6VtUW4",
  authDomain: "customer-support-ai-5f79b.firebaseapp.com",
  projectId: "customer-support-ai-5f79b",
  storageBucket: "customer-support-ai-5f79b.appspot.com",
  messagingSenderId: "465064621200",
  appId: "1:465064621200:web:cbab774cf96434db3d1415"
};



const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Export the auth and googleProvider
export { auth, googleProvider, db };
