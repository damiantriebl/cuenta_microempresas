import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator, initializeAuth } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
const firebaseConfig = {
  apiKey: "AIzaSyD0OINpP6cOeAno5m9a8EXcaRJbT69Lbqo",
  authDomain: "campo-9fb40.firebaseapp.com",
  projectId: "campo-9fb40",
  storageBucket: "campo-9fb40.appspot.com",
  appId: "1:149722424399:web:099267684d39d0e910f63a",
  measurementId: "G-VHT54J6WM6"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
let _auth;
if (Platform.OS === 'web') {
	_auth = getAuth(app);
} else {
	try {
		_auth = initializeAuth(app, {
			persistence: AsyncStorage as any,
		});
	} catch (e: any) {
		_auth = getAuth(app);
	}
}
export const auth = _auth;
if (__DEV__) {
}
