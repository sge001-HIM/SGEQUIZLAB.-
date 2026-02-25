// SGEQUIZLAB — Firebase Config
// Replace with your own credentials from Firebase Console > Project Settings > Your Apps

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC3ctOLIgZFnK8mJSyOgOwkX1wWW8UOUb4",
  authDomain: "sgequizlab.firebaseapp.com",
  projectId: "sgequizlab",
  storageBucket: "sgequizlab.firebasestorage.app",
  messagingSenderId: "199423426359",
  appId: "1:199423426359:web:7bae4139109a2d529424b2",
  measurementId: "G-X6H3XR1S7X"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
