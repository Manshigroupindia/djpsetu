import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

// Deven Jha Productions Setu Firebase Project Configuration (djpsetu)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC6pk4dTNaxVxQ0oUT8kJc7rG_8eORf350",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "djpsetu.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "djpsetu",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "djpsetu.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "563911939753",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:563911939753:web:d774fb9c09c6bc7337bbb8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ETB3K62DBK"
};

// Singleton initialization - ensures Firebase is initialized only once
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Safe Analytics initialization for browser environments
export let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics unsupported or blocked
  });
}

// Authorized Director Email Constant
export const AUTHORIZED_DIRECTOR_EMAIL = (
  import.meta.env.VITE_AUTHORIZED_DIRECTOR_EMAIL || "devenjhaofficial@gmail.com"
).trim().toLowerCase();

export default app;
