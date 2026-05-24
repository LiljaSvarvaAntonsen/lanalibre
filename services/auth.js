import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser,
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

export async function signInAnonymously() {
  return firebaseSignInAnonymously(auth);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function deleteAccount() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user');
  await deleteUser(currentUser);
}
