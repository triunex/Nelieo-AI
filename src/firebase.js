// Import the functions you need from the SDKs you need
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBKN6zmcgmCY26k8Ih5t8wXwJReWjJlYTU",
  authDomain: "cognix-1fc5a.firebaseapp.com",
  projectId: "cognix-1fc5a",
  storageBucket: "cognix-1fc5a.firebasestorage.app",
  messagingSenderId: "61927170789",
  appId: "1:61927170789:web:78c0f6e3a214cd702aea0c",
  measurementId: "G-TNX36F4B5N",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);


