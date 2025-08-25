// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
  authDomain: "educonnect-958e2.firebaseapp.com",
  databaseURL: "https://educonnect-958e2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "educonnect-958e2",
  storageBucket: "educonnect-958e2.firebasestorage.app",
  messagingSenderId: "1044066506835",
  appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6",
  measurementId: "G-B8T5RKWZ5T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore
export const db = getFirestore(app);
