import firebaseAdmin from 'firebase-admin';
const firebase = require('firebase/firebase');
import 'firebase/firestore';

import { GOOGLE_APPLICATION_CREDENTIALS } from './src/env';

/* const FIREBASE_CREDENTIALS = {
  apiKey: "AIzaSyCp5jzdQHCYXUC4hdkSH5humduGbHVLey8",
  authDomain: "virtual-meet-rtc.firebaseapp.com",
  projectId: "virtual-meet-rtc",
  storageBucket: "virtual-meet-rtc.appspot.com",
  messagingSenderId: "134930753150",
  appId: "1:134930753150:web:f2c895c73a1d233ec4da2f",
  measurementId: "G-75RBG6BECP",
}; */

export const firebaseApp = firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(GOOGLE_APPLICATION_CREDENTIALS),
});
export const firestore = firebase.firestore();
