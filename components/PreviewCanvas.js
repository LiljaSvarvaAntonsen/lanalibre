import { forwardRef } from 'react';
import { Svg, Rect } from 'react-native-svg';
import { PATRONES_PUNTO } from '../services/previsualización';

const STRIPE_COUNT = 12;

// forwardRef exposes the Svg node so callers can call ref.current.toDataURL() for PNG capture.
const PreviewCanvas = forwardRef(function PreviewCanvas({ tipoProyecto, medidas, colores, patronPunto, width }, ref) {
  const dimValues = Object.values(medidas);
  const [d1, d2] = dimValues;

  const aspectRatio = d2 / d1;
  const canvasHeight = Math.min(width * aspectRatio, width * 2);
  const canvasWidth = width;

  const safeColors = colores && colores.length > 0 ? colores : ['#C8BBE8'];
  const baseColor = safeColors[0];

  function renderStripes() {
    if (patronPunto === PATRONES_PUNTO.liso) {
      return <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill={baseColor} />;
    }

    const isVertical = patronPunto === PATRONES_PUNTO.rayasV;
    const stripeSize = isVertical
      ? canvasWidth / STRIPE_COUNT
      : canvasHeight / STRIPE_COUNT;

    const count = Math.ceil((isVertical ? canvasWidth : canvasHeight) / stripeSize) + 1;

    return Array.from({ length: count }, (_, i) => {
      const color = safeColors[i % safeColors.length];
      return isVertical ? (
        <Rect
          key={i}
          x={i * stripeSize}
          y={0}
          width={stripeSize}
          height={canvasHeight}
          fill={color}
        />
      ) : (
        <Rect
          key={i}
          x={0}
          y={i * stripeSize}
          width={canvasWidth}
          height={stripeSize}
          fill={color}
        />
      );
    });
  }

  return (
    <Svg ref={ref} width={canvasWidth} height={canvasHeight}>
      {renderStripes()}
    </Svg>
  );
});

export default PreviewCanvas;
