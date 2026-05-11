import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  enableMultiTabIndexedDbPersistence,
  enableNetwork,
  disableNetwork,
  terminate,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Production Firebase configuration
// All values come from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Validation: Ensure all required config is present
function validateConfig() {
  const required = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("[LCPS] Missing Firebase environment variables:", missing);
    if (typeof window !== "undefined") {
      // Client-side only
      throw new Error(
        `Firebase initialization failed. Missing environment variables: ${missing.join(", ")}`
      );
    }
  }
}

// Initialize Firebase with error handling
let app: FirebaseApp;
try {
  validateConfig();
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  console.error("[LCPS] Firebase initialization error:", error);
  throw error;
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-southeast1");

// Production optimizations
if (typeof window !== "undefined") {
  // Client-side only code

  // Enable session persistence for multi-device access
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("[LCPS] Auth persistence error:", error);
  });

  // Enable Firestore offline persistence for production
  // This allows the app to work offline and sync when reconnected
  enableMultiTabIndexedDbPersistence(db).catch((error) => {
    if (error.code === "failed-precondition") {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn("[LCPS] Firestore persistence: Multiple tabs open");
    } else if (error.code === "unimplemented") {
      // Browser doesn't support IndexedDB
      console.warn("[LCPS] Firestore persistence: Browser doesn't support IndexedDB");
    }
  });

  // Development emulators (only in dev mode)
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
    console.log("[LCPS] Using Firebase emulators");
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    connectFunctionsEmulator(functions, "localhost", 5001);
  }
}

// Health check function for monitoring
export async function checkFirebaseConnection(): Promise<boolean> {
  try {
    // Simple Firestore check - try to enable network
    await enableNetwork(db);
    return true;
  } catch (error) {
    console.error("[LCPS] Firebase connection check failed:", error);
    return false;
  }
}

// Enable Firestore network (useful after connection loss)
export async function enableDbNetwork() {
  try {
    await enableNetwork(db);
    console.log("[LCPS] Firebase network enabled");
  } catch (error) {
    console.error("[LCPS] Failed to enable Firebase network:", error);
  }
}

// Disable Firestore network (useful for testing offline mode)
export async function disableDbNetwork() {
  try {
    await disableNetwork(db);
    console.log("[LCPS] Firebase network disabled (offline mode)");
  } catch (error) {
    console.error("[LCPS] Failed to disable Firebase network:", error);
  }
}

export default app;
