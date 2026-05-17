import { useState, useEffect, useCallback } from 'react';
import {
  createProject as fsCreateProject,
  getActiveProjects,
  getDeletedProjects,
  updateProject as fsUpdateProject,
  softDeleteProject as fsSoftDelete,
  restoreProject as fsRestore,
  hardDeleteProject as fsHardDelete,
} from '../services/firestore';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isExpired(deletedAt) {
  if (!deletedAt) return false;
  const ts = deletedAt.toDate ? deletedAt.toDate() : new Date(deletedAt);
  return Date.now() - ts.getTime() > THIRTY_DAYS_MS;
}

export function useProjects(uid) {
  const [activeProjects, setActiveProjects] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const [activeResult, deleted] = await Promise.all([
        getActiveProjects(uid),
        getDeletedProjects(uid),
      ]);
      setActiveProjects(activeResult.projects);
      setLastVisible(activeResult.lastVisible);
      setHasMore(activeResult.hasMore);

      const expired = deleted.filter(isExpired);
      const live = deleted.filter((p) => !isExpired(p));
      setDeletedProjects(live);
      await Promise.all(expired.map((p) => fsHardDelete(p.id)));
    } catch (err) {
      console.log('[useProjects] load error:', err.code, err.message, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    if (!hasMore || !uid) return;
    try {
      const result = await getActiveProjects(uid, lastVisible);
      setActiveProjects((prev) => [...prev, ...result.projects]);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err.message);
    }
  }

  async function createProject(nombre, etiqueta) {
    const project = await fsCreateProject(uid, { nombre, etiqueta });
    setActiveProjects((prev) => [project, ...prev]);
    return project;
  }

  async function updateProject(id, data) {
    await fsUpdateProject(id, data);
    setActiveProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
    );
  }

  async function softDelete(id) {
    await fsSoftDelete(id);
    const project = activeProjects.find((p) => p.id === id);
    setActiveProjects((prev) => prev.filter((p) => p.id !== id));
    if (project) {
      setDeletedProjects((prev) => [
        { ...project, deletedAt: { toDate: () => new Date() } },
        ...prev,
      ]);
    }
  }

  async function restore(id) {
    await fsRestore(id);
    const project = deletedProjects.find((p) => p.id === id);
    setDeletedProjects((prev) => prev.filter((p) => p.id !== id));
    if (project) {
      setActiveProjects((prev) => [{ ...project, deletedAt: null }, ...prev]);
    }
  }

  async function hardDelete(id) {
    await fsHardDelete(id);
    setDeletedProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return {
    activeProjects,
    deletedProjects,
    loading,
    error,
    hasMore,
    loadMore,
    refresh: load,
    createProject,
    updateProject,
    softDelete,
    restore,
    hardDelete,
  };
}
