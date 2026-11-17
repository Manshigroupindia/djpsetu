import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

// Explicit Firebase Configuration for djpinvoice Project
// Must not fall back to root environment variables to avoid reading djpsetu credentials
export const firebaseConfig = {
  apiKey: "AIzaSyB0OIgL4zBIAbalFfH8Q6J6I_5jVKp3K1k",
  authDomain: "djpinvoice.firebaseapp.com",
  projectId: "djpinvoice",
  storageBucket: "djpinvoice.firebasestorage.app",
  messagingSenderId: "192919055333",
  appId: "1:192919055333:web:43c9e6111527f3519b5d0c",
  measurementId: "G-ZLPJV2DFXN",
};

// Isolated Named Firebase App for djpinvoice - Prevents collision with djpsetu
export const INVOICE_APP_NAME = 'djpinvoiceApp';

export const app: FirebaseApp =
  getApps().find((a) => a.name === INVOICE_APP_NAME) ||
  initializeApp(firebaseConfig, INVOICE_APP_NAME);

// Initialize Firebase Auth on isolated app
export const auth: Auth = getAuth(app);

// Initialize Cloud Firestore on isolated app
export const firestore: Firestore = getFirestore(app);

// Safe Firebase Storage lazy initializer for djpinvoice
let _storageInstance: FirebaseStorage | null = null;
export function getInvoiceStorage(): FirebaseStorage {
  if (!_storageInstance) {
    try {
      _storageInstance = getStorage(app, "djpinvoice.firebasestorage.app");
    } catch {
      _storageInstance = getStorage(app);
    }
  }
  return _storageInstance;
}

// Resilient storage export that does not throw on module import
export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    try {
      const inst = getInvoiceStorage();
      const val = (inst as any)[prop];
      return typeof val === 'function' ? val.bind(inst) : val;
    } catch (err) {
      console.warn('Firebase Storage access warning:', err);
      return undefined;
    }
  },
});

// Initialize Analytics conditionally (only when supported in browser environment)
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch((err) => {
      console.warn('Firebase Analytics not supported in this environment:', err);
    });
}

export default app;
