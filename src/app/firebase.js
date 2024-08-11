// Import the required Firebase services
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCh9UeRMItvnBkzqvMCiiWzACxKY6VtUW4",
  authDomain: "customer-support-ai-5f79b.firebaseapp.com",
  projectId: "customer-support-ai-5f79b",
  storageBucket: "customer-support-ai-5f79b.appspot.com",
  messagingSenderId: "465064621200",
  appId: "1:465064621200:web:cbab774cf96434db3d1415"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Export the auth and googleProvider
export { auth, googleProvider };
