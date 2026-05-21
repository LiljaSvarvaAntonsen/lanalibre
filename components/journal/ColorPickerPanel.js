import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { radii } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/spacing';
import { fonts, fontSizes } from '../../constants/typography';

// ── Colour palette ────────────────────────────────────────────────────────────

const PALETTE = [
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
      { name: 'Mantequilla',    hex: '#FFF6C2' },
      { name: 'Limón',          hex: '#FFF044' },
      { name: 'Girasol',        hex: '#FFD700' },
      { name: 'Amarillo dorado',hex: '#FFC200' },
      { name: 'Mostaza',        hex: '#FFDB58' },
      { name: 'Ámbar',          hex: '#FFBF00' },
      { name: 'Ocre',           hex: '#CC7722' },
      { name: 'Mandarina',      hex: '#FF8C42' },
      { name: 'Naranja quemado',hex: '#CC5500' },
      { name: 'Cobre',          hex: '#B87333' },
      { name: 'Canela',         hex: '#D2691E' },
      { name: 'Terracota',      hex: '#C07050' },
      { name: 'Óxido',          hex: '#B7410E' },
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

const DEFAULT_COLOR = '#C8BBE8';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

// ── ColorPickerPanel ──────────────────────────────────────────────────────────

export default function ColorPickerPanel({ visible, recentColors, onActivate, onDismiss }) {
  const { theme: colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState(1);
  const [selectedHex, setSelectedHex] = useState(DEFAULT_COLOR);
  const [brushWidth, setBrushWidth] = useState(8);

  if (!visible) return null;

  function handleActivate() {
    onActivate({ color: selectedHex, width: brushWidth });
    setStep(1);
  }

  if (step === 2) {
    return (
      <View style={s.panel}>
        <View style={[s.colorPreview, { backgroundColor: selectedHex }]} />

        <Text style={s.grosorLabel}>Grosor del pincel</Text>
        <Slider
          style={s.slider}
          minimumValue={1}
          maximumValue={20}
          step={1}
          value={brushWidth}
          onValueChange={setBrushWidth}
          minimumTrackTintColor={colors.primary.DEFAULT}
          maximumTrackTintColor={colors.neutral.greige}
          thumbTintColor={colors.primary.DEFAULT}
        />
        <Text style={s.sliderLabel}>{brushWidth}px</Text>

        <TouchableOpacity style={s.activateBtn} onPress={handleActivate} activeOpacity={0.85}>
          <Text style={s.activateBtnText}>Activar pincel</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setStep(1)} style={s.backLink}>
          <Text style={s.backLinkText}>Atrás</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.panel}>
      <Text style={s.title}>Personaliza tu color</Text>

      {recentColors.length > 0 && (
        <View style={s.section}>
          <Text style={s.groupHeader}>Recientes</Text>
          <View style={s.swatchRow}>
            {recentColors.map((hex) => (
              <TouchableOpacity
                key={`recent-${hex}`}
                accessibilityLabel={hex}
                style={[
                  s.swatch,
                  { backgroundColor: hex },
                  isLight(hex) && s.swatchLight,
                  selectedHex === hex && s.swatchSelected,
                ]}
                onPress={() => setSelectedHex(hex)}
                activeOpacity={0.8}
              />
            ))}
          </View>
        </View>
      )}

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {PALETTE.map(({ group, swatches }) => (
          <View key={group} style={s.section}>
            <Text style={s.groupHeader}>{group}</Text>
            <View style={s.swatchRow}>
              {swatches.map(({ name, hex }) => (
                <TouchableOpacity
                  key={hex}
                  accessibilityLabel={name}
                  style={[
                    s.swatch,
                    { backgroundColor: hex },
                    isLight(hex) && s.swatchLight,
                    selectedHex === hex && s.swatchSelected,
                  ]}
                  onPress={() => setSelectedHex(hex)}
                  activeOpacity={0.8}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(2)} activeOpacity={0.85}>
        <Text style={s.primaryBtnText}>Siguiente</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors) { return StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    maxHeight: 440,
    backgroundColor: colors.card,
    borderRadius: radii.modal,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 50,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  scroll: {
    maxHeight: 270,
  },
  section: {
    marginBottom: spacing.sm,
  },
  groupHeader: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  swatchLight: {
    borderWidth: 1,
    borderColor: colors.neutral.greige,
  },
  swatchSelected: {
    borderWidth: 2.5,
    borderColor: colors.primary.DEFAULT,
  },
  primaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary.dark,
    borderRadius: radii.small,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.card,
  },

  // Step 2
  colorPreview: {
    height: 60,
    borderRadius: radii.small,
    marginBottom: spacing.md,
  },
  grosorLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabel: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  activateBtn: {
    backgroundColor: colors.secondary.cinnamon,
    borderRadius: radii.small,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activateBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.card,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  backLinkText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
}); }
