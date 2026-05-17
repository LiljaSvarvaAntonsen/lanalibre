import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import app from '../firebase';

const auth = getAuth(app);

export const getCurrentUser = () => auth.currentUser;

export async function signInWithGoogleCredential(idToken) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signInWithApple() {
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = provider.credential({
    idToken: appleCredential.identityToken,
  });
  return signInWithCredential(auth, firebaseCredential);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
