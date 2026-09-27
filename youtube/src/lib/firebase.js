// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCyNeRKX5BSf6PCH7H1xmgB2LdXAPhlzs",
  authDomain: "yourtube-4be30.firebaseapp.com",
  projectId: "yourtube-4be30",
  storageBucket: "yourtube-4be30.firebasestorage.app",
  messagingSenderId: "238656326737",
  appId: "1:238656326737:web:ae29a3819fc76573f8fc70"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };
