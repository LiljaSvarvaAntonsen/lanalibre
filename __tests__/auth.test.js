jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  signOut: jest.fn(() => Promise.resolve()),
  GoogleAuthProvider: { credential: jest.fn() },
  OAuthProvider: jest.fn(() => ({ credential: jest.fn() })),
  signInWithCredential: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('../firebase', () => ({}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

import { signOut, getCurrentUser } from '../services/auth';
import { signOut as firebaseSignOut } from 'firebase/auth';

describe('auth service', () => {
  afterEach(() => jest.clearAllMocks());

  test('signOut calls Firebase signOut', async () => {
    await signOut();
    expect(firebaseSignOut).toHaveBeenCalled();
  });

  test('signOut resolves without throwing', async () => {
    await expect(signOut()).resolves.toBeUndefined();
  });

  test('getCurrentUser returns the current auth user', () => {
    const result = getCurrentUser();
    expect(result).toBeNull();
  });
});
