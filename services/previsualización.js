export const TIPOS_PROYECTO = ['bufanda', 'manta', 'gorro', 'top'];

export const PATRONES_PUNTO = {
  liso: 'liso',
  rayasV: 'rayas_v',
  rayasH: 'rayas_h',
};

// Which dimension labels each type uses
export const DIMENSIONES_POR_TIPO = {
  bufanda: { dim1: 'ancho', dim2: 'largo' },
  manta:   { dim1: 'ancho', dim2: 'largo' },
  top:     { dim1: 'ancho', dim2: 'largo' },
  gorro:   { dim1: 'circunferencia', dim2: 'altura' },
};

/**
 * buildCanvasParams({ tipoProyecto, dim1, dim2, colores, patronPunto })
 * Pure function — no Firebase. Throws Error('validation') on bad input.
 * Returns a serialisable params object that can be stored in Firestore
 * and passed directly to <PreviewCanvas> to regenerate the canvas.
 */
export function buildCanvasParams({ tipoProyecto, dim1, dim2, colores, patronPunto }) {
  const errors = {};

  if (!tipoProyecto || !TIPOS_PROYECTO.includes(tipoProyecto)) {
    errors.tipoProyecto = true;
  }

  const d1 = parseFloat(dim1);
  const d2 = parseFloat(dim2);
  if (!dim1 || isNaN(d1) || d1 <= 0) errors.dim1 = true;
  if (!dim2 || isNaN(d2) || d2 <= 0) errors.dim2 = true;

  if (!colores || colores.length === 0) errors.colores = true;

  if (!patronPunto || !Object.values(PATRONES_PUNTO).includes(patronPunto)) {
    errors.patronPunto = true;
  }

  if (Object.keys(errors).length > 0) {
    const err = new Error('validation');
    err.fields = errors;
    throw err;
  }

  const dimLabels = DIMENSIONES_POR_TIPO[tipoProyecto];

  return {
    tipoProyecto,
    medidas: {
      [dimLabels.dim1]: d1,
      [dimLabels.dim2]: d2,
    },
    colores,
    patronPunto,
  };
}
