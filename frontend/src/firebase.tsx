import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { FIREBASE_API_KEY } from './utils/env';

const FIREBASE_CREDENTIALS = {
  apiKey: FIREBASE_API_KEY,
  authDomain: 'virtual-meet-rtc.firebaseapp.com',
  projectId: 'virtual-meet-rtc',
  storageBucket: 'virtual-meet-rtc.appspot.com',
  messagingSenderId: '134930753150',
  appId: '1:134930753150:web:f2c895c73a1d233ec4da2f',
  measurementId: 'G-75RBG6BECP',
};

if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CREDENTIALS);
}
export const firestore = firebase.firestore();
