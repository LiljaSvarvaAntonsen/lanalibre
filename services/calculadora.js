export const MULTIPLICADORES = {
  punto_bajo: 1.0,
  punto_alto: 0.7,
  puntos_densos: 1.3,
};

const FACTOR_BASE = 10;

export function calcularConsumo({ metrosEtiqueta, gramosEtiqueta, tension, tipoPunto, dimensiones }) {
  const { ancho, largo } = dimensiones ?? {};

  if (
    !metrosEtiqueta || metrosEtiqueta <= 0 ||
    !gramosEtiqueta || gramosEtiqueta <= 0 ||
    !tension || tension <= 0 ||
    !ancho || ancho <= 0 ||
    !largo || largo <= 0 ||
    !tipoPunto || !(tipoPunto in MULTIPLICADORES)
  ) {
    throw new Error('validation');
  }

  const multiplicador = MULTIPLICADORES[tipoPunto];
  const metrosPor100g = metrosEtiqueta / (gramosEtiqueta / 100);
  const areaProyecto = ancho * largo;
  const densidad = (tension / FACTOR_BASE) ** 2;
  const metrosTotales = (areaProyecto * densidad * multiplicador) / FACTOR_BASE;
  const gramosTotales = (metrosTotales / metrosPor100g) * 100;
  const resultadoFinal = gramosTotales * 1.1;
  const ovillosTotales = Math.ceil(resultadoFinal / gramosEtiqueta);

  return { metrosTotales, gramosTotales, resultadoFinal, ovillosTotales };
}
