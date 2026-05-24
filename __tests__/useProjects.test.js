const mockGetActiveProjects = jest.fn();
const mockGetDeletedProjects = jest.fn();
const mockSoftDeleteProject = jest.fn(() => Promise.resolve());
const mockRestoreProject = jest.fn(() => Promise.resolve());
const mockHardDeleteProject = jest.fn(() => Promise.resolve());
const mockCreateProject = jest.fn();

jest.mock('../services/firestore', () => ({
  getActiveProjects: (...args) => mockGetActiveProjects(...args),
  getDeletedProjects: (...args) => mockGetDeletedProjects(...args),
  softDeleteProject: (...args) => mockSoftDeleteProject(...args),
  restoreProject: (...args) => mockRestoreProject(...args),
  hardDeleteProject: (...args) => mockHardDeleteProject(...args),
  createProject: (...args) => mockCreateProject(...args),
  updateProject: jest.fn(() => Promise.resolve()),
}));

jest.mock('../firebase', () => ({}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProjects } from '../hooks/useProjects';

const TEST_PROJECT = {
  id: 'p1',
  nombre: 'Bufanda',
  etiqueta: 'WIP',
  deletedAt: null,
  fechaCreacion: new Date(),
};

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGetActiveProjects.mockResolvedValue({
    projects: [TEST_PROJECT],
    lastVisible: null,
    hasMore: false,
  });
  mockGetDeletedProjects.mockResolvedValue([]);
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('useProjects — initial load', () => {
  test('populates activeProjects after mount', async () => {
    const { result } = renderHook(() => useProjects('test-uid'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeProjects).toHaveLength(1);
    expect(result.current.activeProjects[0].id).toBe('p1');
    expect(result.current.deletedProjects).toHaveLength(0);
  });
});

describe('useProjects — softDelete', () => {
  test('moves project from activeProjects to deletedProjects', async () => {
    const { result } = renderHook(() => useProjects('test-uid'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.softDelete('p1');
    });

    expect(result.current.activeProjects).toHaveLength(0);
    expect(result.current.deletedProjects).toHaveLength(1);
    expect(result.current.deletedProjects[0].id).toBe('p1');
    expect(mockSoftDeleteProject).toHaveBeenCalledWith('p1');
  });
});

describe('useProjects — restore', () => {
  test('moves project from deletedProjects back to activeProjects with deletedAt: null', async () => {
    const { result } = renderHook(() => useProjects('test-uid'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // First soft-delete so the project is in the deleted list
    await act(async () => {
      await result.current.softDelete('p1');
    });
    expect(result.current.deletedProjects).toHaveLength(1);

    // Now restore
    await act(async () => {
      await result.current.restore('p1');
    });

    expect(result.current.deletedProjects).toHaveLength(0);
    expect(result.current.activeProjects).toHaveLength(1);
    expect(result.current.activeProjects[0].deletedAt).toBeNull();
    expect(mockRestoreProject).toHaveBeenCalledWith('p1');
  });
});

describe('useProjects — hardDelete', () => {
  test('removes project from deletedProjects and calls hardDeleteProject', async () => {
    const { result } = renderHook(() => useProjects('test-uid'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.softDelete('p1');
    });
    expect(result.current.deletedProjects).toHaveLength(1);

    await act(async () => {
      await result.current.hardDelete('p1');
    });

    expect(result.current.deletedProjects).toHaveLength(0);
    expect(mockHardDeleteProject).toHaveBeenCalledWith('p1');
  });
});
