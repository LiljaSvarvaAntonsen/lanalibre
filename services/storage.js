import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from '../firebase';

const storage = getStorage(app);

export async function uploadPatron(uid, diarioId, { uri, name }) {
  const path = `patrones/${uid}/${diarioId}/${Date.now()}_${name}`;
  const storageRef = ref(storage, path);
  const response = await fetch(uri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function uploadInspiracion(uid, diarioId, { uri, name }) {
  const path = `inspiracion/${uid}/${diarioId}/${Date.now()}_${name}`;
  const storageRef = ref(storage, path);
  const response = await fetch(uri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function deleteFile(storagePath) {
  await deleteObject(ref(storage, storagePath));
}

export async function uploadEntradaStrokes(uid, diarioId, entradaId, strokes) {
  const path = `entradas/${uid}/${diarioId}/${entradaId}/strokes.json`;
  const storageRef = ref(storage, path);
  const blob = new Blob([JSON.stringify(strokes)], { type: 'application/json' });
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function fetchEntradaStrokes(url) {
  const response = await fetch(url);
  return response.json();
}

export async function uploadEntradaFile(uid, diarioId, { uri, name }) {
  const path = `inspiracion/${uid}/${diarioId}/${Date.now()}_${name}`;
  const storageRef = ref(storage, path);
  const response = await fetch(uri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return { url, storagePath: path };
}
