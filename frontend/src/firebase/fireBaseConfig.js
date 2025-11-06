// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; 
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBKWIPqOBkE6LfmO0Aep8r2Wd5UED8UaDg",
  authDomain: "medical-b681f.firebaseapp.com",
  projectId: "medical-b681f",
  storageBucket: "medical-b681f.firebasestorage.app",
  messagingSenderId: "378066011109",
  appId: "1:378066011109:web:717da883813d7ba636a50c",
  measurementId: "G-C0XTMN18ME"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const auth = getAuth(app);