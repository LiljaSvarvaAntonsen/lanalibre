jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    Svg: ({ children, ...props }) => <View {...props}>{children}</View>,
    Rect: (props) => <View {...props} />,
    Line: (props) => <View {...props} />,
  };
});

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es' }]),
}));

jest.mock('../firebase', () => ({}));

import { render } from '@testing-library/react-native';
import React from 'react';
import { buildCanvasParams, TIPOS_PROYECTO, PATRONES_PUNTO } from '../services/previsualización';
import PreviewCanvas from '../components/PreviewCanvas';

// ─── Unit tests: buildCanvasParams ───────────────────────────────────────────

describe('buildCanvasParams — valid inputs', () => {
  test('always returns tipoProyecto manta with ancho/largo medidas', () => {
    const result = buildCanvasParams({
      dim1: '100',
      dim2: '150',
      colores: ['#FF0000', '#00FF00'],
      patronPunto: PATRONES_PUNTO.rayasV,
    });
    expect(result.tipoProyecto).toBe('manta');
    expect(result.medidas).toEqual({ ancho: 100, largo: 150 });
    expect(result.colores).toEqual(['#FF0000', '#00FF00']);
    expect(result.patronPunto).toBe(PATRONES_PUNTO.rayasV);
  });

  test('accepts up to 10 colours and passes squareSeed through', () => {
    const colores = Array.from({ length: 10 }, (_, i) => `#${String(i).padStart(6, '0')}`);
    const result = buildCanvasParams({
      dim1: '80',
      dim2: '100',
      colores,
      patronPunto: PATRONES_PUNTO.grannySquares,
      squareSeed: 42,
    });
    expect(result.colores).toHaveLength(10);
    expect(result.squareSeed).toBe(42);
  });

  test('returns correct structure for all PATRONES_PUNTO', () => {
    Object.values(PATRONES_PUNTO).forEach((p) => {
      expect(() =>
        buildCanvasParams({
          dim1: '100',
          dim2: '120',
          colores: ['#FFFFFF', '#000000'],
          patronPunto: p,
        }),
      ).not.toThrow();
    });
  });

  test('defaults squareSeed to 0 when not provided', () => {
    const result = buildCanvasParams({
      dim1: '50',
      dim2: '60',
      colores: ['#AA0000', '#00AA00'],
      patronPunto: PATRONES_PUNTO.rayasH,
    });
    expect(result.squareSeed).toBe(0);
  });
});

describe('buildCanvasParams — validation', () => {
  const valid = {
    dim1: '100',
    dim2: '150',
    colores: ['#FF0000', '#00FF00'],
    patronPunto: PATRONES_PUNTO.rayasV,
  };

  test('throws validation error when dim1 is missing', () => {
    expect(() => buildCanvasParams({ ...valid, dim1: '' })).toThrow('validation');
  });

  test('throws validation error when dim1 is not a positive number', () => {
    expect(() => buildCanvasParams({ ...valid, dim1: 'abc' })).toThrow('validation');
    expect(() => buildCanvasParams({ ...valid, dim1: '0' })).toThrow('validation');
  });

  test('throws validation error when dim2 is zero or negative', () => {
    expect(() => buildCanvasParams({ ...valid, dim2: '0' })).toThrow('validation');
    expect(() => buildCanvasParams({ ...valid, dim2: '-5' })).toThrow('validation');
  });

  test('throws validation error when colores has fewer than 2 colours', () => {
    expect(() => buildCanvasParams({ ...valid, colores: [] })).toThrow('validation');
    expect(() => buildCanvasParams({ ...valid, colores: ['#FF0000'] })).toThrow('validation');
  });

  test('throws validation error when colores has more than 10 colours', () => {
    const tooMany = Array.from({ length: 11 }, (_, i) => `#${String(i).padStart(6, '0')}`);
    expect(() => buildCanvasParams({ ...valid, colores: tooMany })).toThrow('validation');
  });

  test('throws validation error when patronPunto is invalid', () => {
    expect(() => buildCanvasParams({ ...valid, patronPunto: 'chevron' })).toThrow('validation');
    expect(() => buildCanvasParams({ ...valid, patronPunto: 'liso' })).toThrow('validation');
  });

  test('error object includes specific failing fields', () => {
    try {
      buildCanvasParams({ ...valid, colores: [], dim1: '' });
    } catch (err) {
      expect(err.fields.colores).toBeTruthy();
      expect(err.fields.dim1).toBeTruthy();
      expect(err.fields.dim2).toBeUndefined();
    }
  });
});

// ─── Component tests: PreviewCanvas ──────────────────────────────────────────

const BASE_CANVAS_PROPS = {
  medidas: { ancho: 100, largo: 150 },
  colores: ['#C17B4E', '#E8C9A0'],
  width: 300,
};

describe('PreviewCanvas — renders without crashing', () => {
  test('renders vertical stripes pattern', () => {
    expect(() =>
      render(
        <PreviewCanvas {...BASE_CANVAS_PROPS} patronPunto={PATRONES_PUNTO.rayasV} />,
      ),
    ).not.toThrow();
  });

  test('renders horizontal stripes pattern', () => {
    expect(() =>
      render(
        <PreviewCanvas {...BASE_CANVAS_PROPS} patronPunto={PATRONES_PUNTO.rayasH} />,
      ),
    ).not.toThrow();
  });

  test('renders granny squares pattern', () => {
    expect(() =>
      render(
        <PreviewCanvas {...BASE_CANVAS_PROPS} patronPunto={PATRONES_PUNTO.grannySquares} />,
      ),
    ).not.toThrow();
  });

  test('renders granny squares with 6 colours (per-square variation)', () => {
    const colores = ['#C17B4E', '#E8C9A0', '#8BB8A8', '#F5EEE0', '#8B6B5A', '#9AB89A'];
    expect(() =>
      render(
        <PreviewCanvas
          {...BASE_CANVAS_PROPS}
          colores={colores}
          patronPunto={PATRONES_PUNTO.grannySquares}
          squareSeed={12345}
        />,
      ),
    ).not.toThrow();
  });

  test('renders with unknown pattern without crashing (fallback solid fill)', () => {
    expect(() =>
      render(
        <PreviewCanvas {...BASE_CANVAS_PROPS} patronPunto="unknown_pattern" />,
      ),
    ).not.toThrow();
  });
});
