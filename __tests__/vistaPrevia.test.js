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
  test('returns correct structure for bufanda', () => {
    const result = buildCanvasParams({
      tipoProyecto: 'bufanda',
      dim1: '15',
      dim2: '75',
      colores: ['#FF0000'],
      patronPunto: PATRONES_PUNTO.liso,
    });
    expect(result.tipoProyecto).toBe('bufanda');
    expect(result.medidas).toEqual({ ancho: 15, largo: 75 });
    expect(result.colores).toEqual(['#FF0000']);
    expect(result.patronPunto).toBe('liso');
  });

  test('returns correct dimension keys for gorro (circunferencia + altura)', () => {
    const result = buildCanvasParams({
      tipoProyecto: 'gorro',
      dim1: '56',
      dim2: '22',
      colores: ['#00FF00'],
      patronPunto: PATRONES_PUNTO.rayasV,
    });
    expect(result.medidas).toEqual({ circunferencia: 56, altura: 22 });
  });

  test('returns correct structure for all TIPOS_PROYECTO', () => {
    TIPOS_PROYECTO.forEach((tipo) => {
      expect(() =>
        buildCanvasParams({
          tipoProyecto: tipo,
          dim1: '30',
          dim2: '50',
          colores: ['#AABBCC'],
          patronPunto: PATRONES_PUNTO.liso,
        }),
      ).not.toThrow();
    });
  });

  test('returns correct structure for all PATRONES_PUNTO', () => {
    Object.values(PATRONES_PUNTO).forEach((p) => {
      expect(() =>
        buildCanvasParams({
          tipoProyecto: 'manta',
          dim1: '100',
          dim2: '120',
          colores: ['#FFFFFF'],
          patronPunto: p,
        }),
      ).not.toThrow();
    });
  });
});

describe('buildCanvasParams — validation', () => {
  const valid = {
    tipoProyecto: 'bufanda',
    dim1: '15',
    dim2: '75',
    colores: ['#FF0000'],
    patronPunto: PATRONES_PUNTO.liso,
  };

  test('throws validation error when tipoProyecto is missing', () => {
    expect(() => buildCanvasParams({ ...valid, tipoProyecto: '' })).toThrow('validation');
  });

  test('throws validation error when tipoProyecto is invalid', () => {
    expect(() => buildCanvasParams({ ...valid, tipoProyecto: 'chaleco' })).toThrow('validation');
  });

  test('throws validation error when dim1 is missing', () => {
    expect(() => buildCanvasParams({ ...valid, dim1: '' })).toThrow('validation');
  });

  test('throws validation error when dim2 is zero or negative', () => {
    expect(() => buildCanvasParams({ ...valid, dim2: '0' })).toThrow('validation');
    expect(() => buildCanvasParams({ ...valid, dim2: '-5' })).toThrow('validation');
  });

  test('throws validation error when colores is empty', () => {
    expect(() => buildCanvasParams({ ...valid, colores: [] })).toThrow('validation');
  });

  test('throws validation error when patronPunto is invalid', () => {
    expect(() => buildCanvasParams({ ...valid, patronPunto: 'chevron' })).toThrow('validation');
  });

  test('error object includes specific failing fields', () => {
    try {
      buildCanvasParams({ ...valid, tipoProyecto: '', colores: [] });
    } catch (err) {
      expect(err.fields.tipoProyecto).toBeTruthy();
      expect(err.fields.colores).toBeTruthy();
      expect(err.fields.dim1).toBeUndefined();
    }
  });
});

// ─── Component tests: PreviewCanvas ──────────────────────────────────────────

const BASE_CANVAS_PROPS = {
  tipoProyecto: 'bufanda',
  medidas: { ancho: 15, largo: 75 },
  colores: ['#C17B4E', '#E8C9A0'],
  width: 300,
};

describe('PreviewCanvas — renders without crashing', () => {
  test('renders liso pattern', () => {
    expect(() =>
      render(
        <PreviewCanvas {...BASE_CANVAS_PROPS} patronPunto={PATRONES_PUNTO.liso} />,
      ),
    ).not.toThrow();
  });

  test('renders rayas_v (vertical stripes) pattern', () => {
    expect(() =>
      render(
        <PreviewCanvas {...BASE_CANVAS_PROPS} patronPunto={PATRONES_PUNTO.rayasV} />,
      ),
    ).not.toThrow();
  });

  test('renders rayas_h (horizontal stripes) pattern', () => {
    expect(() =>
      render(
        <PreviewCanvas {...BASE_CANVAS_PROPS} patronPunto={PATRONES_PUNTO.rayasH} />,
      ),
    ).not.toThrow();
  });

  test('renders with a single colour', () => {
    expect(() =>
      render(
        <PreviewCanvas
          {...BASE_CANVAS_PROPS}
          colores={['#7A9E7E']}
          patronPunto={PATRONES_PUNTO.rayasV}
        />,
      ),
    ).not.toThrow();
  });

  test('renders gorro type with circunferencia/altura medidas', () => {
    expect(() =>
      render(
        <PreviewCanvas
          tipoProyecto="gorro"
          medidas={{ circunferencia: 56, altura: 22 }}
          colores={['#8BB8A8']}
          patronPunto={PATRONES_PUNTO.liso}
          width={300}
        />,
      ),
    ).not.toThrow();
  });
});
