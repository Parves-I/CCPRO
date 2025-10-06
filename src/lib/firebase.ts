// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlCCeQIEFsI7WAQW6Dr_F5RleVaQGzaZM",
  authDomain: "ccpro-cd22d.firebaseapp.com",
  projectId: "ccpro-cd22d",
  storageBucket: "ccpro-cd22d.appspot.com",
  messagingSenderId: "977415440835",
  appId: "1:977415440835:web:f22566399a30fa54169576",
  measurementId: "G-4Z4TZXEHDZ"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
