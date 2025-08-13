
// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import './firebase-types';

// Firebase configuration - updated to new project
const firebaseConfig = {
  apiKey: "AIzaSyAzc1Zp5knZQjav4AFI6GnDU4s6kBfAUyw",
  authDomain: "brixel7-app.firebaseapp.com",
  projectId: "brixel7-app",
  storageBucket: "brixel7-app.firebasestorage.app",
  messagingSenderId: "632344731647",
  appId: "1:632344731647:web:366132645485f31f5851ca"
};

// Initialize Firebase (prevent duplicate app error)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  if (error.code === 'app/duplicate-app') {
    // App already initialized, get the existing instance
    app = initializeApp(firebaseConfig, 'secondary');
  } else {
    throw error;
  }
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Google Sign-In function using Firebase popup; falls back to redirect
export const signInWithGoogle = async (): Promise<void> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken;
    if (!idToken) throw new Error('Failed to obtain Google ID token');

    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        throw new Error(parsed.message || 'Google login failed');
      } catch {
        throw new Error('Google login failed');
      }
    }
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
};

// Handle redirect result helper (use in pages to complete redirect flow)
export const completeGoogleRedirectIfPresent = async (): Promise<boolean> => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return false;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken;
    if (!idToken) return false;
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken }),
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Sign out function
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Auth state observer
export const observeAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export default app;
