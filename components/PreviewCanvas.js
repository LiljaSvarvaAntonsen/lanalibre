import { forwardRef } from 'react';
import { Svg, Rect } from 'react-native-svg';
import { PATRONES_PUNTO, GRANNY_SQUARE_CM, STRIPE_CM } from '../services/previsualización';

const MAX_GRID = 20;

function rotateArray(arr, n) {
  const len = arr.length;
  if (len === 0) return arr;
  const offset = ((n % len) + len) % len;
  return [...arr.slice(offset), ...arr.slice(0, offset)];
}

function getSquareColors(colors, row, col, squareSeed, colCount) {
  if (colors.length <= 5) return colors;
  const subsetSize = Math.min(colors.length, 5);
  const offset = (squareSeed + row * colCount + col) % colors.length;
  return Array.from({ length: subsetSize }, (_, i) => colors[(offset + i) % colors.length]);
}

function computeGrid(medidas, patronPunto, colsProp, rowsProp) {
  const ancho = medidas?.ancho ?? 120;
  const largo = medidas?.largo ?? 120;
  const isStripe = patronPunto === PATRONES_PUNTO.rayasV || patronPunto === PATRONES_PUNTO.rayasH;
  const unitCm = isStripe ? STRIPE_CM : GRANNY_SQUARE_CM;
  const cols = colsProp ?? Math.max(1, Math.min(MAX_GRID, Math.round(ancho / unitCm)));
  const rows = rowsProp ?? Math.max(1, Math.min(MAX_GRID, Math.round(largo / unitCm)));
  return { cols, rows };
}

// forwardRef exposes the Svg node so callers can call ref.current.toDataURL() for PNG capture.
const PreviewCanvas = forwardRef(function PreviewCanvas(
  { medidas, colores, patronPunto, width, squareSeed = 0, cols: colsProp, rows: rowsProp },
  ref,
) {
  const canvasSize = width;
  const safeColors = colores && colores.length > 0 ? colores : ['#C8BBE8'];
  const { cols, rows } = computeGrid(medidas, patronPunto, colsProp, rowsProp);

  function renderStripes() {
    const isVertical = patronPunto === PATRONES_PUNTO.rayasV;
    const stripeCount = isVertical ? cols : rows;
    const stripeSize = canvasSize / stripeCount;

    return Array.from({ length: stripeCount }, (_, i) => {
      const color = safeColors[i % safeColors.length];
      return isVertical ? (
        <Rect key={i} x={i * stripeSize} y={0} width={stripeSize} height={canvasSize} fill={color} />
      ) : (
        <Rect key={i} x={0} y={i * stripeSize} width={canvasSize} height={stripeSize} fill={color} />
      );
    });
  }

  function renderGrannySquares() {
    const sq = canvasSize / Math.max(cols, rows);
    const elements = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const seq = getSquareColors(safeColors, row, col, squareSeed, cols);
        const N = seq.length;
        const t = sq / (2 * N);

        for (let i = 0; i < N; i++) {
          const inset = i * t;
          const side = sq - 2 * inset;
          elements.push(
            <Rect
              key={`${row}-${col}-${i}`}
              x={col * sq + inset}
              y={row * sq + inset}
              width={side}
              height={side}
              fill={seq[i]}
            />,
          );
        }
      }
    }

    return elements;
  }

  function renderContent() {
    if (patronPunto === PATRONES_PUNTO.grannySquares) return renderGrannySquares();
    if (patronPunto === PATRONES_PUNTO.rayasV || patronPunto === PATRONES_PUNTO.rayasH) {
      return renderStripes();
    }
    return <Rect x={0} y={0} width={canvasSize} height={canvasSize} fill={safeColors[0]} />;
  }

  return (
    <Svg ref={ref} width={canvasSize} height={canvasSize}>
      {renderContent()}
    </Svg>
  );
});

export default PreviewCanvas;
