import { calcularConsumo, MULTIPLICADORES } from '../services/calculadora';

const BASE_INPUT = {
  metrosEtiqueta: 200,
  gramosEtiqueta: 100,
  tension: 10,
  tipoPunto: 'punto_bajo',
  dimensiones: { ancho: 10, largo: 10 },
};

// With BASE_INPUT:
//   metrosPor100g = 200 / 1 = 200
//   area = 100, densidad = 1, multiplicador = 1.0
//   metrosTotales = 100 × 1 × 1.0 / 10 = 10
//   gramosTotales = 10 / 200 × 100 = 5
//   resultadoFinal = 5 × 1.1 = 5.5

describe('calcularConsumo — punto_bajo', () => {
  test('returns correct resultadoFinal for known inputs', () => {
    const result = calcularConsumo(BASE_INPUT);
    expect(result.metrosTotales).toBeCloseTo(10);
    expect(result.gramosTotales).toBeCloseTo(5);
    expect(result.resultadoFinal).toBeCloseTo(5.5);
  });
});

describe('calcularConsumo — punto_alto multiplier', () => {
  test('result is 30% lower than punto_bajo', () => {
    const base = calcularConsumo(BASE_INPUT);
    const alto = calcularConsumo({ ...BASE_INPUT, tipoPunto: 'punto_alto' });
    expect(alto.resultadoFinal).toBeCloseTo(base.resultadoFinal * MULTIPLICADORES.punto_alto);
  });
});

describe('calcularConsumo — puntos_densos multiplier', () => {
  test('result is 30% higher than punto_bajo', () => {
    const base = calcularConsumo(BASE_INPUT);
    const densos = calcularConsumo({ ...BASE_INPUT, tipoPunto: 'puntos_densos' });
    expect(densos.resultadoFinal).toBeCloseTo(base.resultadoFinal * MULTIPLICADORES.puntos_densos);
  });
});

describe('calcularConsumo — 10% margin', () => {
  test('resultadoFinal is always gramosTotales × 1.10', () => {
    const result = calcularConsumo(BASE_INPUT);
    expect(result.resultadoFinal).toBeCloseTo(result.gramosTotales * 1.1);
  });
});

describe('calcularConsumo — validation', () => {
  test('throws when a required field is missing', () => {
    expect(() => calcularConsumo({ ...BASE_INPUT, metrosEtiqueta: null })).toThrow('validation');
    expect(() => calcularConsumo({ ...BASE_INPUT, gramosEtiqueta: 0 })).toThrow('validation');
    expect(() => calcularConsumo({ ...BASE_INPUT, tipoPunto: undefined })).toThrow('validation');
    expect(() => calcularConsumo({ ...BASE_INPUT, dimensiones: { ancho: 10, largo: -1 } })).toThrow('validation');
  });
});

describe('calcularConsumo — MULTIPLICADORES export', () => {
  test('has exactly 3 keys with correct values', () => {
    expect(Object.keys(MULTIPLICADORES)).toHaveLength(3);
    expect(MULTIPLICADORES.punto_bajo).toBe(1.0);
    expect(MULTIPLICADORES.punto_alto).toBe(0.7);
    expect(MULTIPLICADORES.puntos_densos).toBe(1.3);
  });
});

describe('calcularConsumo — validation edge cases', () => {
  test('unknown tipoPunto throws validation', () => {
    expect(() => calcularConsumo({ ...BASE_INPUT, tipoPunto: 'crochet_magico' })).toThrow('validation');
  });

  test('dimensiones: undefined throws validation', () => {
    expect(() => calcularConsumo({ ...BASE_INPUT, dimensiones: undefined })).toThrow('validation');
  });
});

// 50×80 cm, tension 15, punto_bajo, 300m/100g yarn
// metrosPor100g=300, area=4000, densidad=(15/10)²=2.25
// metrosTotales=4000×2.25×1.0/10=900, gramosTotales=900/300×100=300
// resultadoFinal=300×1.1=330
describe('calcularConsumo — formula verification with real-world values', () => {
  test('scarf 50×80 cm yields 330 g with 300m/100g yarn at tension 15', () => {
    const result = calcularConsumo({
      metrosEtiqueta: 300,
      gramosEtiqueta: 100,
      tension: 15,
      tipoPunto: 'punto_bajo',
      dimensiones: { ancho: 50, largo: 80 },
    });
    expect(result.metrosTotales).toBeCloseTo(900);
    expect(result.gramosTotales).toBeCloseTo(300);
    expect(result.resultadoFinal).toBeCloseTo(330);
  });
});
