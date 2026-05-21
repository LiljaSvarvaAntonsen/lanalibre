import { useRef, useMemo } from 'react';
import { View, Image, Text, TouchableOpacity, PanResponder, StyleSheet } from 'react-native';
import { FileText } from 'lucide-react-native';
import { radii } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/spacing';
import { fonts, fontSizes } from '../../constants/typography';

const MIN_SIZE = 50;
const HANDLE = 14;

// ── CornerHandle ──────────────────────────────────────────────────────────────

function CornerHandle({ corner, element, onResize, styles }) {
  const start = useRef({});
  // Refs so the PanResponder (created once) always sees the latest props
  const elementRef = useRef(element);
  elementRef.current = element;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        const el = elementRef.current;
        start.current = {
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
        };
      },
      onPanResponderMove: (_, gs) => {
        const { dx, dy } = gs;
        const { x: sx, y: sy, width: sw, height: sh } = start.current;
        let x = sx, y = sy, width = sw, height = sh;

        if (corner === 'tl') {
          x = sx + dx; y = sy + dy;
          width = Math.max(MIN_SIZE, sw - dx);
          height = Math.max(MIN_SIZE, sh - dy);
        } else if (corner === 'tr') {
          y = sy + dy;
          width = Math.max(MIN_SIZE, sw + dx);
          height = Math.max(MIN_SIZE, sh - dy);
        } else if (corner === 'bl') {
          x = sx + dx;
          width = Math.max(MIN_SIZE, sw - dx);
          height = Math.max(MIN_SIZE, sh + dy);
        } else {
          // br
          width = Math.max(MIN_SIZE, sw + dx);
          height = Math.max(MIN_SIZE, sh + dy);
        }

        onResizeRef.current(elementRef.current.id, { x, y, width, height });
      },
    }),
  ).current;

  const pos = {
    tl: { top: -HANDLE / 2,    left: -HANDLE / 2 },
    tr: { top: -HANDLE / 2,    right: -HANDLE / 2 },
    bl: { bottom: -HANDLE / 2, left: -HANDLE / 2 },
    br: { bottom: -HANDLE / 2, right: -HANDLE / 2 },
  }[corner];

  return (
    <View
      style={[styles.handle, pos]}
      {...panResponder.panHandlers}
    />
  );
}

// ── ImageWidget ───────────────────────────────────────────────────────────────

export default function ImageWidget({ element, onResize, selected, onPress }) {
  const { theme: colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      activeOpacity={selected ? 1 : 0.9}
      onPress={onPress}
      style={{ width: element.width, height: element.height }}
    >
      {selected && <View style={s.dragPill} />}

      {element.isPdf ? (
        <View style={s.pdfContainer}>
          <FileText size={40} color={colors.primary.dark} strokeWidth={1.5} />
          <Text style={s.pdfName} numberOfLines={2}>{element.fileName}</Text>
        </View>
      ) : (
        <Image
          source={{ uri: element.url }}
          style={{ width: element.width, height: element.height, borderRadius: radii.small }}
          resizeMode="contain"
        />
      )}

      {selected && (
        <>
          <CornerHandle corner="tl" element={element} onResize={onResize} styles={s} />
          <CornerHandle corner="tr" element={element} onResize={onResize} styles={s} />
          <CornerHandle corner="bl" element={element} onResize={onResize} styles={s} />
          <CornerHandle corner="br" element={element} onResize={onResize} styles={s} />
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors) { return StyleSheet.create({
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    borderRadius: 3,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    zIndex: 10,
  },
  dragPill: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral.greige,
    zIndex: 10,
  },
  pdfContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radii.small,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    padding: spacing.sm,
  },
  pdfName: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
}); }
