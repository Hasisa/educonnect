
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
    import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
    import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

    const firebaseConfig = {
      apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
      authDomain: "educonnect-958e2.firebaseapp.com",
      projectId: "educonnect-958e2",
      storageBucket: "educonnect-958e2.appspot.com",
      messagingSenderId: "1044066506835",
      appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const dashboardEl = document.getElementById('admin-dashboard');

    function showDashboard() {
      dashboardEl.style.display = 'block';
      console.log("Admin dashboard shown ✅");
    }

    function showNoAccess() {
      alert("You are not an admin. Access denied.");
      dashboardEl.style.display = 'none';
    }

    async function checkAdminByEmail(user) {
      if (!user?.email) return showNoAccess();

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", user.email));
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          console.log("No user document found for this email!");
          return showNoAccess();
        }

        const docSnap = querySnap.docs[0]; // первый документ (emails уникальные)
        const data = docSnap.data();
        console.log("User data:", data);

        if (data.admin === true) {
          showDashboard();
        } else {
          showNoAccess();
        }
      } catch (err) {
        console.error("Error checking admin by email:", err);
        showNoAccess();
      }
    }

    onAuthStateChanged(auth, (user) => {
      if (user) {
        checkAdminByEmail(user);
      } else {
        alert("You must be logged in to access the admin panel.");
        dashboardEl.style.display = 'none';
      }
    });