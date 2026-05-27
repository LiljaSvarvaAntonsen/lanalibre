import { useRef, useMemo } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Line } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

const SW = 1.8;
const SIZE = 40;

// ── Stitch SVG icons (40×40) ──────────────────────────────────────────────────

function CadenaIcon({ stroke = '#1A1917' }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <Ellipse cx={20} cy={20} rx={15} ry={10} stroke={stroke} strokeWidth={SW} fill="none" />
    </Svg>
  );
}

function PuntoRasoIcon({ stroke = '#1A1917' }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={8} fill={stroke} />
    </Svg>
  );
}

function PuntoBajoIcon({ stroke = '#1A1917' }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <Line x1={20} y1={4} x2={20} y2={36} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1={4} y1={20} x2={36} y2={20} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function MedioPuntoAltoIcon({ stroke = '#1A1917' }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <Line x1={20} y1={8} x2={20} y2={36} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1={8} y1={16} x2={32} y2={16} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function PuntoAltoIcon({ stroke = '#1A1917' }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <Line x1={20} y1={4} x2={20} y2={36} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1={8} y1={14} x2={32} y2={14} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function PuntoAltoDobleIcon({ stroke = '#1A1917' }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <Line x1={20} y1={4} x2={20} y2={36} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1={8} y1={12} x2={32} y2={12} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1={8} y1={20} x2={32} y2={20} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function AnilloMagicoIcon({ stroke = '#1A1917' }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <Circle cx={20} cy={22} r={11} stroke={stroke} strokeWidth={SW} fill="none" />
      <Line x1={20} y1={4} x2={20} y2={11} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1={13} y1={22} x2={27} y2={22} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

const ICON_MAP = {
  cadena:         CadenaIcon,
  puntoRaso:      PuntoRasoIcon,
  puntoBajo:      PuntoBajoIcon,
  medioPuntoAlto: MedioPuntoAltoIcon,
  puntoAlto:      PuntoAltoIcon,
  puntoAltoDoble: PuntoAltoDobleIcon,
  anilloMagico:   AnilloMagicoIcon,
};

// ── StitchWidget ──────────────────────────────────────────────────────────────

export default function StitchWidget({ element, onRotate }) {
  const { theme: colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const Icon = ICON_MAP[element.stitchType] ?? PuntoBajoIcon;
  const initialRotation = useRef(element.rotation ?? 0);

  const rotateResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        initialRotation.current = element.rotation ?? 0;
      },
      onPanResponderMove: (_, gs) => {
        const newAngle = (initialRotation.current + gs.dx * 1.5) % 360;
        onRotate(element.id, newAngle);
      },
    }),
  ).current;

  return (
    <View style={[s.wrapper, { transform: [{ rotate: `${element.rotation ?? 0}deg` }] }]}>
      <Icon stroke="#2C2C2A" />
      {/* Rotation handle — sits 20px above the element centre */}
      <View style={s.rotHandle} {...rotateResponder.panHandlers} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors) { return StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotHandle: {
    position: 'absolute',
    top: -20,
    left: SIZE / 2 - 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
}); }
