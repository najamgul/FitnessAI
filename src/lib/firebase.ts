
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCSom4Zef_Kye0l8BA2khppS27dsT7mScc",
  authDomain: "nutrigenius-ai-tugip.firebaseapp.com",
  projectId: "nutrigenius-ai-tugip",
  storageBucket: "nutrigenius-ai-tugip.firebasestorage.app",
  messagingSenderId: "380152437986",
  appId: "1:380152437986:web:b96a8790d3516cd16d12bb",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
