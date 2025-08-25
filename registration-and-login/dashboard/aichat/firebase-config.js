// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
  authDomain: "educonnect-958e2.firebaseapp.com",
  projectId: "educonnect-958e2",
  storageBucket: "educonnect-958e2.firebasestorage.app",
  messagingSenderId: "1044066506835",
  appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;