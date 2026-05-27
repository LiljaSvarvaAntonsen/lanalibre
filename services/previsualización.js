export const GRANNY_SQUARE_CM = 15;
export const STRIPE_CM = 5;
const MAX_GRID = 20;

export const TIPOS_PROYECTO = ['bufanda', 'manta', 'gorro', 'top'];

export const PATRONES_PUNTO = {
  rayasV: 'rayas_v',
  rayasH: 'rayas_h',
  grannySquares: 'granny_squares',
};

export const DIMENSIONES_POR_TIPO = {
  bufanda: { dim1: 'ancho', dim2: 'largo' },
  manta:   { dim1: 'ancho', dim2: 'largo' },
  top:     { dim1: 'ancho', dim2: 'largo' },
  gorro:   { dim1: 'circunferencia', dim2: 'altura' },
};

/**
 * buildCanvasParams({ dim1, dim2, colores, patronPunto, squareSeed })
 * Pure function — no Firebase. Throws Error('validation') on bad input.
 * Returns a serialisable params object for Firestore and PreviewCanvas.
 * tipoProyecto is always 'manta' — this tool is blanket-only.
 */
export function buildCanvasParams({ dim1, dim2, colores, patronPunto, squareSeed = 0 }) {
  const errors = {};

  const d1 = parseFloat(dim1);
  const d2 = parseFloat(dim2);
  if (!dim1 || isNaN(d1) || d1 <= 0) errors.dim1 = true;
  if (!dim2 || isNaN(d2) || d2 <= 0) errors.dim2 = true;

  if (!colores || colores.length < 2 || colores.length > 10) errors.colores = true;

  if (!patronPunto || !Object.values(PATRONES_PUNTO).includes(patronPunto)) {
    errors.patronPunto = true;
  }

  if (Object.keys(errors).length > 0) {
    const err = new Error('validation');
    err.fields = errors;
    throw err;
  }

  const isStripe = patronPunto === PATRONES_PUNTO.rayasV || patronPunto === PATRONES_PUNTO.rayasH;
  const unitCm = isStripe ? STRIPE_CM : GRANNY_SQUARE_CM;
  const cols = Math.max(1, Math.min(MAX_GRID, Math.round(d1 / unitCm)));
  const rows = Math.max(1, Math.min(MAX_GRID, Math.round(d2 / unitCm)));

  return {
    tipoProyecto: 'manta',
    medidas: { ancho: d1, largo: d2 },
    colores,
    patronPunto,
    squareSeed,
    cols,
    rows,
  };
}
