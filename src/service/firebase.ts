import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, DATABSE_URL} from "@env";

const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: AUTH_DOMAIN,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID,
  appId: APP_ID,
  databaseURL: DATABSE_URL, 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with proper error handling
let auth;
try {
  // First try to get existing auth instance
  auth = getAuth(app);
} catch (error) {
  console.log('getAuth failed, trying initializeAuth:', error);
  try {
    // If getAuth fails, initialize new auth with persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (initError) {
    console.error('Both getAuth and initializeAuth failed:', initError);
    // Last resort: try to get auth without persistence
    auth = getAuth(app);
  }
}

// Initialize other Firebase services
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

export { app, auth, db, storage, realtimeDb };
