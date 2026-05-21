import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import app from '../firebase';

const db = getFirestore(app);

export async function createUserDocument(uid, { nombre = '', fotoPerfil = null } = {}) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { nombre, fotoPerfil, fechaRegistro: serverTimestamp() });
  }
}

export async function getUserDocument(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

const PAGE_SIZE = 20;

export async function createProject(uid, { nombre, etiqueta }) {
  console.log('[firestore] createProject uid:', uid, 'nombre:', nombre);
  const ref = await addDoc(collection(db, 'projects'), {
    uId: uid,
    nombre,
    etiqueta,
    fechaCreacion: serverTimestamp(),
    deletedAt: null,
  });
  console.log('[firestore] createProject success, id:', ref.id);
  return { id: ref.id, uId: uid, nombre, etiqueta, deletedAt: null };
}

export async function getActiveProjects(uid, lastVisible = null) {
  console.log('[firestore] getActiveProjects uid:', uid, 'lastVisible:', lastVisible ? 'set' : 'null');
  const constraints = [
    where('uId', '==', uid),
    where('deletedAt', '==', null),
    orderBy('fechaCreacion', 'desc'),
    limit(PAGE_SIZE),
  ];
  if (lastVisible) constraints.push(startAfter(lastVisible));
  try {
    const snap = await getDocs(query(collection(db, 'projects'), ...constraints));
    const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log('[firestore] getActiveProjects returned', projects.length, 'projects');
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { projects, lastVisible: lastDoc, hasMore: snap.docs.length === PAGE_SIZE };
  } catch (err) {
    console.log('[firestore] getActiveProjects ERROR:', err.code, err.message);
    throw err;
  }
}

export async function getDeletedProjects(uid) {
  const snap = await getDocs(
    query(
      collection(db, 'projects'),
      where('uId', '==', uid),
      where('deletedAt', '!=', null),
      orderBy('deletedAt', 'desc'),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getProject(id) {
  const snap = await getDoc(doc(db, 'projects', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateProject(id, data) {
  await updateDoc(doc(db, 'projects', id), { ...data, fechaModificacion: serverTimestamp() });
}

export async function softDeleteProject(id) {
  await updateDoc(doc(db, 'projects', id), { deletedAt: serverTimestamp() });
}

export async function restoreProject(id) {
  await updateDoc(doc(db, 'projects', id), { deletedAt: null });
}

export async function hardDeleteProject(id) {
  await deleteDoc(doc(db, 'projects', id));
}

export async function saveResultadoCalculadora(projectId, data) {
  await updateDoc(doc(db, 'projects', projectId), {
    resultadoCalculadora: { ...data, fechaGuardado: new Date() },
    fechaModificacion: serverTimestamp(),
  });
}

export async function getResultadoCalculadora(projectId) {
  const snap = await getDoc(doc(db, 'projects', projectId));
  return snap.exists() ? (snap.data().resultadoCalculadora ?? null) : null;
}

export async function saveResultadoPrevisualización(projectId, data) {
  await updateDoc(doc(db, 'projects', projectId), {
    resultadoPrevisualización: { ...data, fechaGuardado: new Date() },
    fechaModificacion: serverTimestamp(),
  });
}

export async function getResultadoPrevisualización(projectId) {
  const snap = await getDoc(doc(db, 'projects', projectId));
  return snap.exists() ? (snap.data().resultadoPrevisualización ?? null) : null;
}

// ── Diarios ───────────────────────────────────────────────────────────────────

export async function createDiario(uid, nombre, proyectoId = null, proyectoNombre = null) {
  const ref = await addDoc(collection(db, 'diarios'), {
    uId: uid,
    nombre,
    proyectoId,
    proyectoNombre,
    textoLibre: '',
    contadorFilas: 0,
    timer: 0,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function getDiarios(uid) {
  const snap = await getDocs(
    query(collection(db, 'diarios'), where('uId', '==', uid), orderBy('fechaCreacion', 'desc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getDiario(diarioId) {
  const snap = await getDoc(doc(db, 'diarios', diarioId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateDiario(diarioId, data) {
  await updateDoc(doc(db, 'diarios', diarioId), { ...data, fechaActualizacion: serverTimestamp() });
}

export async function deleteDiario(diarioId) {
  await deleteDoc(doc(db, 'diarios', diarioId));
}

export async function getDiarioByProyecto(proyectoId) {
  const snap = await getDocs(
    query(collection(db, 'diarios'), where('proyectoId', '==', proyectoId), limit(1)),
  );
  return snap.docs.length > 0 ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
}

// ── Colores ───────────────────────────────────────────────────────────────────

export async function addEntradaColor(diarioId, { nombre, valorHex }) {
  const ref = await addDoc(collection(db, 'diarios', diarioId, 'colores'), { nombre, valorHex });
  return ref.id;
}

export async function getColores(diarioId) {
  const snap = await getDocs(collection(db, 'diarios', diarioId, 'colores'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteEntradaColor(diarioId, colorId) {
  await deleteDoc(doc(db, 'diarios', diarioId, 'colores', colorId));
}

// ── Archivos refs ─────────────────────────────────────────────────────────────

export async function addArchivoPatron(diarioId, { urlStorage, storagePath }) {
  const ref = await addDoc(collection(db, 'diarios', diarioId, 'archivosPatron'), {
    urlStorage,
    storagePath,
    fechaSubida: serverTimestamp(),
  });
  return ref.id;
}

export async function getArchivosPatron(diarioId) {
  const snap = await getDocs(collection(db, 'diarios', diarioId, 'archivosPatron'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addArchivoInspiracion(diarioId, { urlStorage, storagePath }) {
  const ref = await addDoc(collection(db, 'diarios', diarioId, 'archivosInspiracion'), {
    urlStorage,
    storagePath,
    fechaSubida: serverTimestamp(),
  });
  return ref.id;
}

export async function getArchivosInspiracion(diarioId) {
  const snap = await getDocs(collection(db, 'diarios', diarioId, 'archivosInspiracion'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteArchivoRef(diarioId, subcolleccion, archivoId) {
  await deleteDoc(doc(db, 'diarios', diarioId, subcolleccion, archivoId));
}

// ── Entradas ──────────────────────────────────────────────────────────────────

export async function createEntrada(diarioId, nombre) {
  const ref = await addDoc(collection(db, 'diarios', diarioId, 'entradas'), {
    nombre,
    elementos: [],
    fechaCreacion: serverTimestamp(),
    fechaModificacion: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function getEntradas(diarioId) {
  const snap = await getDocs(
    query(collection(db, 'diarios', diarioId, 'entradas'), orderBy('fechaCreacion', 'asc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getEntrada(diarioId, entradaId) {
  const snap = await getDoc(doc(db, 'diarios', diarioId, 'entradas', entradaId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateEntrada(diarioId, entradaId, data) {
  await updateDoc(doc(db, 'diarios', diarioId, 'entradas', entradaId), {
    ...data,
    fechaModificacion: serverTimestamp(),
  });
}

export async function deleteEntrada(diarioId, entradaId) {
  await deleteDoc(doc(db, 'diarios', diarioId, 'entradas', entradaId));
}

// ── User / settings ───────────────────────────────────────────────────────────

export async function updateUserDocument(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

export async function saveUserSettings(uid, settings) {
  await updateDoc(doc(db, 'users', uid), settings);
}

export async function getAllUserProjects(uid) {
  const snap = await getDocs(
    query(collection(db, 'projects'), where('uId', '==', uid), orderBy('fechaCreacion', 'desc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllUserDiarios(uid) {
  const snap = await getDocs(
    query(collection(db, 'diarios'), where('uId', '==', uid), orderBy('fechaCreacion', 'desc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
