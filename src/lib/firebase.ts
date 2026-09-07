import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

// Firebase Configuration requested by user
const firebaseConfig = {
  apiKey: "AIzaSyDSI1bB7CjMhdus7fgtY4RHemCOhw1aK3w",
  authDomain: "campusvote-5f805.firebaseapp.com",
  projectId: "campusvote-5f805",
  storageBucket: "campusvote-5f805.firebasestorage.app",
  messagingSenderId: "940183018658",
  appId: "1:940183018658:web:e42da320af1dc17cb4cbfb",
  measurementId: "G-DMJH12MCF2",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Configure Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();

// Export popup sign-in utility
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Return credential and user details
    return result.user;
  } catch (error) {
    console.error("Firebase Auth Google Error: ", error);
    throw error;
  }
}

// Export logout utility
export async function logoutFirebase() {
  await signOut(auth);
}
