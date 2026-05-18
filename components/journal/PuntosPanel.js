import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts, fontSizes } from '../../constants/typography';

// ── Stitch SVG symbols ────────────────────────────────────────────────────────

const STROKE = colors.text.primary;
const SW = 1.8;
const SIZE = 36;

function CadenaIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 36 36">
      <Ellipse cx={18} cy={18} rx={13} ry={9} stroke={STROKE} strokeWidth={SW} fill="none" />
    </Svg>
  );
}

function PuntoRasoIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 36 36">
      <Circle cx={18} cy={18} r={7} fill={STROKE} />
    </Svg>
  );
}

function PuntoBajoIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 36 36">
      <Line x1={18} y1={4} x2={18} y2={32} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <Line x1={4} y1={18} x2={32} y2={18} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function MedioPuntoAltoIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 36 36">
      {/* stem */}
      <Line x1={18} y1={8} x2={18} y2={32} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      {/* crossbar */}
      <Line x1={8} y1={14} x2={28} y2={14} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function PuntoAltoIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 36 36">
      {/* stem */}
      <Line x1={18} y1={4} x2={18} y2={32} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      {/* crossbar */}
      <Line x1={8} y1={12} x2={28} y2={12} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function PuntoAltoDobleIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 36 36">
      {/* stem */}
      <Line x1={18} y1={4} x2={18} y2={32} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      {/* upper crossbar */}
      <Line x1={9} y1={10} x2={27} y2={10} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      {/* lower crossbar */}
      <Line x1={9} y1={17} x2={27} y2={17} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function AnilloMagicoIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 36 36">
      {/* outer ring */}
      <Circle cx={18} cy={20} r={10} stroke={STROKE} strokeWidth={SW} fill="none" />
      {/* vertical hook above */}
      <Line x1={18} y1={4} x2={18} y2={10} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      {/* horizontal cross */}
      <Line x1={12} y1={20} x2={24} y2={20} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

const STITCHES = [
  { type: 'cadena',          Icon: CadenaIcon },
  { type: 'puntoRaso',       Icon: PuntoRasoIcon },
  { type: 'puntoBajo',       Icon: PuntoBajoIcon },
  { type: 'medioPuntoAlto',  Icon: MedioPuntoAltoIcon },
  { type: 'puntoAlto',       Icon: PuntoAltoIcon },
  { type: 'puntoAltoDoble',  Icon: PuntoAltoDobleIcon },
  { type: 'anilloMagico',    Icon: AnilloMagicoIcon },
];

// ── PuntosPanel ───────────────────────────────────────────────────────────────

export default function PuntosPanel({ visible, onSelect, t }) {
  if (!visible) return null;

  return (
    <View style={s.panel}>
      <Text style={s.title}>{t('entrada.puntos.titulo')}</Text>
      <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
        {STITCHES.map(({ type, Icon }) => (
          <TouchableOpacity
            key={type}
            style={s.tile}
            onPress={() => onSelect(type)}
            activeOpacity={0.75}
          >
            <Icon />
            <Text style={s.tileLabel}>{t(`entrada.puntos.${type}`)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg ?? spacing.xl ?? 32,
    maxHeight: '55%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 50,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tile: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
  },
  tileLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
