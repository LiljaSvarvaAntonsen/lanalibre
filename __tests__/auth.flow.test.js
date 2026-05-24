const mockSetDoc = jest.fn(() => Promise.resolve());
const mockGetDoc = jest.fn(() => Promise.resolve({ exists: () => false }));
const mockServerTimestamp = jest.fn(() => 'MOCK_TS');
const mockDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: (...args) => mockDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  addDoc: jest.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => args),
  orderBy: jest.fn((...args) => args),
  limit: jest.fn((...args) => args),
  startAfter: jest.fn((...args) => args),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  signOut: jest.fn(() => Promise.resolve()),
  GoogleAuthProvider: { credential: jest.fn() },
  OAuthProvider: jest.fn(() => ({ credential: jest.fn() })),
  signInWithCredential: jest.fn(),
  signInAnonymously: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  deleteUser: jest.fn(() => Promise.resolve()),
}));

jest.mock('../firebase', () => ({}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

import { signInWithGoogleCredential, onAuthChange } from '../services/auth';
import { signInWithCredential, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { createUserDocument } from '../services/firestore';

afterEach(() => jest.clearAllMocks());

describe('signInWithGoogleCredential', () => {
  test('calls GoogleAuthProvider.credential with idToken then signInWithCredential', async () => {
    const MOCK_CREDENTIAL = { provider: 'google.com' };
    const MOCK_RESULT = { user: { uid: 'uid-123' } };
    GoogleAuthProvider.credential.mockReturnValueOnce(MOCK_CREDENTIAL);
    signInWithCredential.mockResolvedValueOnce(MOCK_RESULT);

    const result = await signInWithGoogleCredential('test-id-token');

    expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('test-id-token');
    expect(signInWithCredential).toHaveBeenCalledWith(expect.any(Object), MOCK_CREDENTIAL);
    expect(result).toBe(MOCK_RESULT);
  });
});

describe('createUserDocument', () => {
  test('new user — calls setDoc with nombre, fotoPerfil, fechaRegistro', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    await createUserDocument('uid-new', { nombre: 'Lilja', fotoPerfil: null });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockSetDoc.mock.calls[0];
    expect(data).toMatchObject({ nombre: 'Lilja', fotoPerfil: null });
    expect(data).toHaveProperty('fechaRegistro');
  });

  test('existing user — does not call setDoc', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true });

    await createUserDocument('uid-existing', { nombre: 'Lilja' });

    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('onAuthChange', () => {
  test('calls onAuthStateChanged with the provided callback and returns unsubscribe', () => {
    const unsubscribe = jest.fn();
    onAuthStateChanged.mockReturnValueOnce(unsubscribe);
    const callback = jest.fn();

    const result = onAuthChange(callback);

    expect(onAuthStateChanged).toHaveBeenCalledWith(expect.any(Object), callback);
    expect(result).toBe(unsubscribe);
  });
});
