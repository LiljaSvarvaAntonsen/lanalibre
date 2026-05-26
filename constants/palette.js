export const PALETTE = [
  {
    group: 'Blancos y neutros',
    swatches: [
      { name: 'Blanco',      hex: '#FFFFFF' },
      { name: 'Crema',       hex: '#FFFDD0' },
      { name: 'Marfil',      hex: '#FDFDE7' },
      { name: 'Écru',        hex: '#C2B280' },
      { name: 'Avena',       hex: '#E8DCC8' },
      { name: 'Lino',        hex: '#D8C9A3' },
      { name: 'Gris claro',  hex: '#D3D3D3' },
      { name: 'Gris medio',  hex: '#9E9E9E' },
      { name: 'Carbón',      hex: '#4A4A4A' },
      { name: 'Negro',       hex: '#1A1A1A' },
    ],
  },
  {
    group: 'Rosas y rojos',
    swatches: [
      { name: 'Rosa bebé',        hex: '#FFD1DC' },
      { name: 'Rubor',            hex: '#F4A7B9' },
      { name: 'Rosa polvorienta', hex: '#D4A0A0' },
      { name: 'Salmón',           hex: '#FA8072' },
      { name: 'Coral',            hex: '#FF6B6B' },
      { name: 'Rosa intenso',     hex: '#FF69B4' },
      { name: 'Frambuesa',        hex: '#C71585' },
      { name: 'Rosa',             hex: '#FF007F' },
      { name: 'Rojo tomate',      hex: '#FF4444' },
      { name: 'Rojo ladrillo',    hex: '#B22222' },
      { name: 'Burdeos',          hex: '#800020' },
      { name: 'Vino',             hex: '#722F37' },
    ],
  },
  {
    group: 'Naranjas y amarillos',
    swatches: [
      { name: 'Mantequilla',     hex: '#FFF6C2' },
      { name: 'Limón',           hex: '#FFF044' },
      { name: 'Girasol',         hex: '#FFD700' },
      { name: 'Amarillo dorado', hex: '#FFC200' },
      { name: 'Mostaza',         hex: '#FFDB58' },
      { name: 'Ámbar',           hex: '#FFBF00' },
      { name: 'Ocre',            hex: '#CC7722' },
      { name: 'Mandarina',       hex: '#FF8C42' },
      { name: 'Naranja quemado', hex: '#CC5500' },
      { name: 'Cobre',           hex: '#B87333' },
      { name: 'Canela',          hex: '#D2691E' },
      { name: 'Terracota',       hex: '#C07050' },
      { name: 'Óxido',           hex: '#B7410E' },
    ],
  },
  {
    group: 'Verdes',
    swatches: [
      { name: 'Menta',         hex: '#AAF0D1' },
      { name: 'Espuma de mar', hex: '#9FE2BF' },
      { name: 'Salvia',        hex: '#87AE77' },
      { name: 'Lima',          hex: '#C5E063' },
      { name: 'Verde musgo',   hex: '#6B7C3B' },
      { name: 'Oliva',         hex: '#808000' },
      { name: 'Verde bosque',  hex: '#228B22' },
      { name: 'Esmeralda',     hex: '#50C878' },
      { name: 'Verde azulado', hex: '#008080' },
      { name: 'Petróleo',      hex: '#1F6167' },
    ],
  },
  {
    group: 'Azules',
    swatches: [
      { name: 'Azul polvo', hex: '#B0D4E8' },
      { name: 'Azul bebé',  hex: '#89CFF0' },
      { name: 'Azul cielo', hex: '#87CEEB' },
      { name: 'Pervinca',   hex: '#CCCCFF' },
      { name: 'Aciano',     hex: '#6495ED' },
      { name: 'Cobalto',    hex: '#0047AB' },
      { name: 'Azul real',  hex: '#4169E1' },
      { name: 'Vaquero',    hex: '#1560BD' },
      { name: 'Marino',     hex: '#001F5B' },
      { name: 'Índigo',     hex: '#3F51B5' },
      { name: 'Turquesa',   hex: '#40E0D0' },
      { name: 'Agua',       hex: '#7FFFD4' },
    ],
  },
  {
    group: 'Morados y violetas',
    swatches: [
      { name: 'Lavanda claro', hex: '#E6E0F5' },
      { name: 'Lavanda',       hex: '#C8BBE8' },
      { name: 'Lila',          hex: '#B39BD3' },
      { name: 'Malva',         hex: '#C89BB0' },
      { name: 'Violeta',       hex: '#8F65C0' },
      { name: 'Púrpura',       hex: '#6A0DAD' },
      { name: 'Ciruela',       hex: '#7B2D8B' },
    ],
  },
  {
    group: 'Marrones y naturales',
    swatches: [
      { name: 'Arena',     hex: '#E8D5A3' },
      { name: 'Tostado',   hex: '#D2A679' },
      { name: 'Camello',   hex: '#C19A6B' },
      { name: 'Caramelo',  hex: '#D4935A' },
      { name: 'Greige',    hex: '#D4CFC7' },
      { name: 'Marrón',    hex: '#8B4513' },
      { name: 'Chocolate', hex: '#4A2C0A' },
      { name: 'Castaño',   hex: '#954535' },
    ],
  },
];

export function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}
