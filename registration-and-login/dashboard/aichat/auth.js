import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged as onAuthChanged } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from './firebase-config.js'; // тот же firebase-config, но тоже через CDN

class AuthService {
  constructor() {
    this.currentUser = null;
    this.onAuthStateChangedCallbacks = [];

    onAuthChanged(auth, (user) => {
      this.currentUser = user;
      this.onAuthStateChangedCallbacks.forEach(cb => cb(user));
    });
  }

  async register(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  onAuthStateChanged(callback) {
    this.onAuthStateChangedCallbacks.push(callback);
    return () => {
      const index = this.onAuthStateChangedCallbacks.indexOf(callback);
      if (index > -1) this.onAuthStateChangedCallbacks.splice(index, 1);
    };
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getErrorMessage(errorCode) {
    const errors = {
      'auth/user-not-found': 'No user found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/requires-recent-login': 'Please sign in again to continue.',
      'auth/invalid-credential': 'Invalid email or password. Please try again.'
    };
    return errors[errorCode] || 'An unexpected error occurred. Please try again.';
  }
}

export default new AuthService();