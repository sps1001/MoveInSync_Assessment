import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from "firebase/auth";
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
let app;
try {
  if (!global.firebaseApp) {
    app = initializeApp(firebaseConfig);
    global.firebaseApp = app;
  } else {
    app = global.firebaseApp;
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

// Initialize Auth with persistence
let auth: Auth;
try {
  auth = getAuth(app);
} catch (error) {
  console.error('Auth initialization error:', error);
  // Fallback to basic auth initialization
  auth = getAuth(app);
}

// Export Firebase services
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

export { app, auth, db, storage, realtimeDb };
