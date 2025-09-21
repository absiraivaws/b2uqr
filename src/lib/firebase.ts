import { initializeApp, getApp, getApps } from 'firebase/app';

const firebaseConfig = {
  "projectId": "studio-6224064853-3084d",
  "appId": "1:331407500516:web:1f973bdff96712fb26f8f1",
  "apiKey": "AIzaSyAMO9IPwJqvSvRero5OsM9nWGzkCDdLDkY",
  "authDomain": "studio-6224064853-3084d.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "331407500516"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export { app };
