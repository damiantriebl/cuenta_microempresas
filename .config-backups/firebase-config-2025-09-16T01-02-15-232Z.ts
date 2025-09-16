// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator, initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getMessaging, isSupported } from "firebase/messaging";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD0OINpP6cOeAno5m9a8EXcaRJbT69Lbqo",
  authDomain: "campo-9fb40.firebaseapp.com",
  projectId: "campo-9fb40",
  storageBucket: "campo-9fb40.appspot.com",
  messagingSenderId: "149722424399",
  appId: "1:149722424399:web:099267684d39d0e910f63a",
  measurementId: "G-VHT54J6WM6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth with persistence on native; default getAuth on web
let _auth;
if (Platform.OS === 'web') {
	_auth = getAuth(app);
} else {
	try {
		_auth = initializeAuth(app, {
			persistence: getReactNativePersistence(AsyncStorage as unknown as any),
		});
	} catch (e: any) {
		// Fallback if already initialized (fast refresh / duplicate init)
		_auth = getAuth(app);
	}
}
export const auth = _auth;

// Initialize Cloud Messaging (only if supported)
let messaging: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}
export { messaging };

// Development environment setup
if (__DEV__) {
  // Connect to emulators if in development
  // Uncomment these lines if you want to use Firebase emulators
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}
