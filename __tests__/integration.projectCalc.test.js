const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockAddDoc = jest.fn(() => Promise.resolve({ id: 'proj-1' }));
const mockGetDoc = jest.fn(() => Promise.resolve({ exists: () => false }));
const mockServerTimestamp = jest.fn(() => 'MOCK_TS');
const mockCollection = jest.fn();
const mockDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: (...args) => mockDoc(...args),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: (...args) => mockGetDoc(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: jest.fn(() => Promise.resolve()),
  collection: (...args) => mockCollection(...args),
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
}));

jest.mock('../firebase', () => ({}));

import { createProject, saveResultadoCalculadora, getResultadoCalculadora } from '../services/firestore';

afterEach(() => jest.clearAllMocks());

const CALC_DATA = {
  metrosTotales: 900,
  gramosTotales: 300,
  resultadoFinal: 330,
  metrosEtiqueta: 300,
  gramosEtiqueta: 100,
  tension: 15,
  tipoPunto: 'punto_bajo',
  dimensiones: { ancho: 50, largo: 80 },
};

describe('createProject', () => {
  test('returns project with id, nombre, etiqueta and deletedAt: null', async () => {
    const project = await createProject('uid-1', { nombre: 'Bufanda', etiqueta: 'WIP' });

    expect(project.id).toBe('proj-1');
    expect(project.nombre).toBe('Bufanda');
    expect(project.etiqueta).toBe('WIP');
    expect(project.deletedAt).toBeNull();
  });
});

describe('saveResultadoCalculadora', () => {
  test('calls updateDoc with resultadoCalculadora key containing the calc fields', async () => {
    await saveResultadoCalculadora('proj-1', CALC_DATA);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockUpdateDoc.mock.calls[0];
    expect(data).toHaveProperty('resultadoCalculadora');
    const saved = data.resultadoCalculadora;
    expect(saved.metrosTotales).toBe(900);
    expect(saved.gramosTotales).toBe(300);
    expect(saved.resultadoFinal).toBe(330);
  });
});

describe('getResultadoCalculadora', () => {
  test('returns the embedded resultadoCalculadora when it exists', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ resultadoCalculadora: CALC_DATA }),
    });

    const result = await getResultadoCalculadora('proj-1');

    expect(result).toEqual(CALC_DATA);
  });

  test('returns null when the project has no saved result', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ nombre: 'Bufanda' }),
    });

    const result = await getResultadoCalculadora('proj-1');

    expect(result).toBeNull();
  });
});

describe('integration: create project → save calculator result → result on project detail', () => {
  test('saved result is retrievable and has correct resultadoFinal', async () => {
    // Step 1: create project
    const project = await createProject('uid-1', { nombre: 'Bufanda', etiqueta: 'WIP' });
    expect(project.id).toBe('proj-1');

    // Step 2: save calculator result
    await saveResultadoCalculadora(project.id, CALC_DATA);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);

    // Step 3: simulate Firestore returning the saved document
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ resultadoCalculadora: CALC_DATA }),
    });

    // Step 4: retrieve and verify
    const result = await getResultadoCalculadora(project.id);
    expect(result.resultadoFinal).toBe(330);
    expect(result.tipoPunto).toBe('punto_bajo');
  });
});
