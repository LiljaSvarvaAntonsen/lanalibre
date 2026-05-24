const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockSetDoc = jest.fn(() => Promise.resolve());
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockAddDoc = jest.fn(() => Promise.resolve({ id: 'new-id' }));
const mockGetDocs = jest.fn(() => Promise.resolve({ docs: [] }));
const mockServerTimestamp = jest.fn(() => 'MOCK_TIMESTAMP');
const mockQuery = jest.fn((...args) => args);
const mockWhere = jest.fn((...args) => args);
const mockOrderBy = jest.fn((...args) => args);
const mockLimit = jest.fn((...args) => args);
const mockStartAfter = jest.fn((...args) => args);
const mockCollection = jest.fn();
const mockDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: (...args) => mockDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  collection: (...args) => mockCollection(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: (...args) => mockOrderBy(...args),
  limit: (...args) => mockLimit(...args),
  startAfter: (...args) => mockStartAfter(...args),
  getDocs: (...args) => mockGetDocs(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock('../firebase', () => ({}));

import {
  softDeleteProject,
  restoreProject,
  hardDeleteProject,
  getActiveProjects,
  getDeletedProjects,
} from '../services/firestore';

afterEach(() => jest.clearAllMocks());

describe('softDeleteProject', () => {
  test('calls setDoc with a deletedAt field', async () => {
    await softDeleteProject('proj-1');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockSetDoc.mock.calls[0];
    expect(data).toHaveProperty('deletedAt');
  });
});

describe('restoreProject', () => {
  test('calls setDoc with deletedAt: null', async () => {
    await restoreProject('proj-1');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockSetDoc.mock.calls[0];
    expect(data).toEqual({ deletedAt: null });
  });
});

describe('hardDeleteProject', () => {
  test('calls deleteDoc', async () => {
    await hardDeleteProject('proj-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

describe('getActiveProjects', () => {
  test('queries with where deletedAt == null', async () => {
    await getActiveProjects('uid-1');
    const whereCall = mockWhere.mock.calls.find(
      (call) => call[0] === 'deletedAt' && call[1] === '==' && call[2] === null,
    );
    expect(whereCall).toBeDefined();
  });

  test('returns empty projects array when no docs', async () => {
    const result = await getActiveProjects('uid-1');
    expect(result.projects).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});

describe('getDeletedProjects', () => {
  test('queries with where deletedAt != null', async () => {
    await getDeletedProjects('uid-1');
    const whereCall = mockWhere.mock.calls.find(
      (call) => call[0] === 'deletedAt' && call[1] === '!=',
    );
    expect(whereCall).toBeDefined();
  });

  test('returns empty array when no docs', async () => {
    const result = await getDeletedProjects('uid-1');
    expect(result).toEqual([]);
  });
});

describe('client-side search filter', () => {
  const projects = [
    { id: '1', nombre: 'Bufanda azul', etiqueta: 'WIP' },
    { id: '2', nombre: 'Gorro de lana', etiqueta: 'FO' },
    { id: '3', nombre: 'Bufanda roja', etiqueta: 'PHD' },
  ];

  function filterProjects(list, query) {
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((p) => p.nombre.toLowerCase().includes(q));
  }

  test('empty query returns all items', () => {
    expect(filterProjects(projects, '')).toHaveLength(3);
  });

  test('matching query returns only matching items', () => {
    const result = filterProjects(projects, 'bufanda');
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.nombre.toLowerCase().includes('bufanda'))).toBe(true);
  });

  test('case-insensitive match', () => {
    const result = filterProjects(projects, 'GORRO');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  test('no match returns empty array', () => {
    expect(filterProjects(projects, 'calcetín')).toHaveLength(0);
  });
});
