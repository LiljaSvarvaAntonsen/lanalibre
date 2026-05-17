import { createContext, useContext, useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import i18n from '../i18n';
import {
  signInWithGoogleCredential,
  signInWithApple as authSignInWithApple,
  signOut as authSignOut,
  onAuthChange,
} from '../services/auth';
import { createUserDocument } from '../services/firestore';

WebBrowser.maybeCompleteAuthSession();

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const [, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? webClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? webClientId,
    webClientId,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params?.id_token ?? response.authentication?.idToken;
    if (!idToken) {
      setError(i18n.t('errors.googleToken'));
      return;
    }
    setError(null);
    signInWithGoogleCredential(idToken)
      .then((result) =>
        createUserDocument(result.user.uid, {
          nombre: result.user.displayName ?? '',
          fotoPerfil: result.user.photoURL ?? null,
        })
      )
      .catch((err) => setError(err.message));
  }, [response]);

  useEffect(() => {
    return onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
  }, []);

  async function signInWithGoogle() {
    if (!webClientId) {
      setError(i18n.t('errors.googleNotConfigured'));
      return;
    }
    setError(null);
    await promptAsync();
  }

  async function signInWithApple() {
    setError(null);
    try {
      const result = await authSignInWithApple();
      await createUserDocument(result.user.uid, {
        nombre: result.user.displayName ?? '',
        fotoPerfil: result.user.photoURL ?? null,
      });
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') {
        setError(err.message);
      }
    }
  }

  async function signOut() {
    setError(null);
    try {
      await authSignOut();
    } catch (err) {
      setError(err.message);
    }
  }

  function devSignIn() {
    setUser({ uid: 'dev-user', displayName: 'Dev User', email: 'dev@localhost', photoURL: null });
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, signInWithApple, signOut, devSignIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
