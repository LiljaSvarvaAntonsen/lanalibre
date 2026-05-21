import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getAllUserProjects, getAllUserDiarios } from './firestore';

export async function exportUserData(uid) {
  console.log('[export] exportUserData start, uid:', uid);

  console.log('[export] fetching projects and diarios...');
  const [projects, diarios] = await Promise.all([
    getAllUserProjects(uid),
    getAllUserDiarios(uid),
  ]);
  console.log('[export] fetched:', projects.length, 'projects,', diarios.length, 'diarios');

  const payload = {
    exportedAt: new Date().toISOString(),
    uid,
    projects,
    diarios,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  console.log('[export] cacheDirectory:', FileSystem.cacheDirectory);
  if (!cacheDir) throw new Error('expo-file-system: cacheDirectory and documentDirectory are both unavailable');
  const jsonPath = cacheDir + 'lanalibre_export.json';
  console.log('[export] writing JSON to', jsonPath);
  await FileSystem.writeAsStringAsync(jsonPath, jsonStr, { encoding: 'utf8' });
  console.log('[export] JSON written');

  const sharingAvailable = await Sharing.isAvailableAsync();
  console.log('[export] Sharing.isAvailableAsync:', sharingAvailable);
  if (sharingAvailable) {
    console.log('[export] opening share sheet for JSON...');
    await Sharing.shareAsync(jsonPath, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar datos',
    });
    console.log('[export] JSON share sheet closed');
  }

  console.log('[export] generating PDF...');
  const html = buildExportHtml(payload);
  const { uri: pdfUri } = await Print.printToFileAsync({ html });
  console.log('[export] PDF generated at', pdfUri);
  if (await Sharing.isAvailableAsync()) {
    console.log('[export] opening share sheet for PDF...');
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Exportar datos (PDF)',
    });
    console.log('[export] PDF share sheet closed');
  }

  console.log('[export] exportUserData complete');
}

function buildExportHtml({ exportedAt, projects, diarios }) {
  const projectRows = projects
    .map(
      (p) =>
        `<tr><td>${p.nombre}</td><td>${p.etiqueta}</td><td>${p.deletedAt ? 'Eliminado' : 'Activo'}</td></tr>`,
    )
    .join('');

  const diaryRows = diarios
    .map((d) => `<tr><td>${d.nombre}</td><td>${d.proyectoNombre ?? '—'}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: sans-serif; padding: 32px; color: #1A1A1A; }
    h1 { color: #7C6AAF; }
    h2 { color: #7C6AAF; margin-top: 32px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #C8BBE8; padding: 8px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #D4CFC7; }
    .meta { color: #A8A9A6; font-size: 12px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>LanaLibre — Exportación de datos</h1>
  <p class="meta">Exportado el: ${new Date(exportedAt).toLocaleString('es')}</p>
  <h2>Proyectos (${projects.length})</h2>
  <table>
    <tr><th>Nombre</th><th>Etiqueta</th><th>Estado</th></tr>
    ${projectRows || '<tr><td colspan="3">Sin proyectos</td></tr>'}
  </table>
  <h2>Diarios (${diarios.length})</h2>
  <table>
    <tr><th>Nombre</th><th>Proyecto vinculado</th></tr>
    ${diaryRows || '<tr><td colspan="2">Sin diarios</td></tr>'}
  </table>
</body>
</html>`;
}
