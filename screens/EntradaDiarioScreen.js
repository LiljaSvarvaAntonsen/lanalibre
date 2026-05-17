import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  PanResponder,
  Pressable,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Line } from 'react-native-svg';
import {
  ArrowLeft,
  Trash2,
  Save,
  AlignJustify,
  Palette,
  Type,
  Upload,
  Hash,
  LayoutGrid,
  RotateCcw,
  Bold,
  Italic,
  Underline,
  GripVertical,
  Check,
} from 'lucide-react-native';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { getEntrada, updateEntrada } from '../services/firestore';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingOverlay from '../components/LoadingOverlay';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeTextBox(x, y, text = '') {
  return { id: makeId(), type: 'textBox', x, y, text, bold: false, italic: false, underline: false, fontSize: 'M' };
}

const CELL = 22;

// ── GridLayer ─────────────────────────────────────────────────────────────────

function GridLayer({ width, height }) {
  if (!width || !height) return null;
  const hLines = [];
  const vLines = [];
  for (let y = 0; y <= height; y += CELL) {
    hLines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#E0DDD8" strokeWidth={0.5} />);
  }
  for (let x = 0; x <= width; x += CELL) {
    vLines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#E0DDD8" strokeWidth={0.5} />);
  }
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      {hLines}
      {vLines}
    </Svg>
  );
}

// ── DraggableElement ──────────────────────────────────────────────────────────

function DraggableElement({ element, selected, isEditing, eraserMode, onErase, onMove, editShift, children }) {
  const pan = useRef(new Animated.ValueXY({ x: element.x, y: element.y })).current;

  // Refs so PanResponder callbacks (created once) see live values
  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;
  const eraserModeRef = useRef(eraserMode);
  eraserModeRef.current = eraserMode;

  const panResponder = useRef(
    PanResponder.create({
      // Capture phase: claim the responder before any child (TouchableOpacity, TextInput) can.
      // This makes eraser mode truly global — works on row counters AND text boxes.
      onStartShouldSetPanResponderCapture: () => eraserModeRef.current,
      onStartShouldSetPanResponder: () => eraserModeRef.current,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !isEditingRef.current &&
        !eraserModeRef.current &&
        (Math.abs(dx) > 6 || Math.abs(dy) > 6),
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gs) => {
        if (!eraserModeRef.current) {
          Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(evt, gs);
        }
      },
      onPanResponderRelease: (_, { dx, dy }) => {
        if (eraserModeRef.current) {
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) onErase(element.id);
        } else {
          pan.flattenOffset();
          onMove(element.id, { x: pan.x._value, y: pan.y._value });
        }
      },
    }),
  ).current;

  const inner = (
    <Animated.View
      style={[
        styles.draggableEl,
        { transform: pan.getTranslateTransform() },
        selected && styles.draggableSelected,
        eraserMode && styles.draggableEraser,
      ]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );

  // When editing, wrap with a native-driver Animated.View that shifts only this element up.
  // Separate views are required — pan uses JS driver, canvasShift uses native driver.
  if (isEditing && editShift) {
    return (
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, transform: [{ translateY: editShift }] }}>
        {inner}
      </Animated.View>
    );
  }
  return inner;
}

// ── RowCounterWidget ──────────────────────────────────────────────────────────

function RowCounterWidget({ count, onIncrement, onReset }) {
  return (
    <View style={styles.rowCard}>
      <Text style={styles.rowCount}>{count}</Text>
      <View style={styles.rowBtns}>
        <TouchableOpacity onPress={onIncrement} style={styles.rowBtn} activeOpacity={0.7}>
          <Text style={styles.rowBtnLabel}>+1</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onReset} style={[styles.rowBtn, styles.rowResetBtn]} activeOpacity={0.7}>
          <RotateCcw size={14} color={colors.text.secondary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── TextBoxWidget ─────────────────────────────────────────────────────────────

const sizeMap = { S: fontSizes.sm, M: fontSizes.md, L: fontSizes.lg };

function textBoxFont(bold, italic) {
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.regularItalic;
  return fonts.regular;
}

// Two-step interaction:
//   onPress when NOT selected → selects, no keyboard
//   onPress when selected but not editing → activates edit mode (TextInput + autoFocus)
//   isEditing → renders TextInput with autoFocus; keyboard opens
function TextBoxWidget({ element, isEditing, onChange, onPress }) {
  const textStyle = {
    fontSize: sizeMap[element.fontSize] ?? fontSizes.md,
    fontFamily: textBoxFont(element.bold, element.italic),
    textDecorationLine: element.underline ? 'underline' : 'none',
  };

  if (isEditing) {
    return (
      <TextInput
        style={[styles.textBox, textStyle]}
        value={element.text}
        onChangeText={onChange}
        autoFocus
        multiline
        scrollEnabled={false}
        placeholder="Escribe aquí..."
        placeholderTextColor={colors.neutral.tertiary}
      />
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.textBox, textStyle, !element.text && styles.textBoxPlaceholder]}>
        {element.text || 'Escribe aquí...'}
      </Text>
    </TouchableOpacity>
  );
}

// ── TextFormatBar ─────────────────────────────────────────────────────────────

function FmtBtn({ children, active, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.fmtBtn, active && styles.fmtBtnActive]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}

function TextFormatBar({ element, onChange, onDelete, onDone, style }) {
  return (
    <View style={[styles.formatBar, style]}>
      <FmtBtn active={element.bold} onPress={() => onChange({ bold: !element.bold })}>
        <Bold size={16} color={element.bold ? colors.primary.dark : colors.text.secondary} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn active={element.italic} onPress={() => onChange({ italic: !element.italic })}>
        <Italic size={16} color={element.italic ? colors.primary.dark : colors.text.secondary} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn active={element.underline} onPress={() => onChange({ underline: !element.underline })}>
        <Underline size={16} color={element.underline ? colors.primary.dark : colors.text.secondary} strokeWidth={2} />
      </FmtBtn>
      <View style={styles.fmtDivider} />
      {['S', 'M', 'L'].map((sz) => (
        <FmtBtn key={sz} active={element.fontSize === sz} onPress={() => onChange({ fontSize: sz })}>
          <Text style={[styles.fmtSizeLabel, element.fontSize === sz && styles.fmtSizeLabelActive]}>{sz}</Text>
        </FmtBtn>
      ))}
      <View style={styles.fmtDivider} />
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.fmtBtn}>
        <Trash2 size={16} color={colors.status.errorText} strokeWidth={1.8} />
      </TouchableOpacity>
      <View style={styles.fmtDivider} />
      <TouchableOpacity onPress={onDone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.fmtBtn}>
        <Check size={16} color={colors.secondary.olive} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

// ── FloatingToolbar ───────────────────────────────────────────────────────────

function TbBtn({ icon: Icon, onPress, active, disabled, label }) {
  return (
    <TouchableOpacity
      style={[styles.tbBtn, active && styles.tbBtnActive]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityLabel={label}
    >
      <Icon
        size={20}
        color={disabled ? colors.neutral.tertiary : active ? colors.primary.dark : colors.text.secondary}
        strokeWidth={1.8}
        style={disabled && { opacity: 0.4 }}
      />
    </TouchableOpacity>
  );
}

function FloatingToolbar({
  canvasSize,
  collapsed,
  onToggle,
  textInsertMode,
  gridMode,
  onRowCounter,
  onText,
  onGrid,
  t,
}) {
  const initX = canvasSize.width > 0 ? Math.max(0, canvasSize.width / 2 - 140) : 80;
  const initY = canvasSize.height > 0 ? canvasSize.height - 110 : 300;

  const pan = useRef(new Animated.ValueXY({ x: initX, y: initY })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 5 || Math.abs(dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => { pan.flattenOffset(); },
    }),
  ).current;

  return (
    <Animated.View style={[styles.toolbar, pan.getLayout()]} {...panResponder.panHandlers}>
      <TouchableOpacity style={styles.toolbarHandle} onPress={onToggle} activeOpacity={0.7}>
        <GripVertical size={16} color={colors.text.tertiary} strokeWidth={1.8} />
      </TouchableOpacity>
      {!collapsed && (
        <View style={styles.toolbarBtns}>
          <TbBtn icon={AlignJustify} onPress={onRowCounter} label={t('entrada.rowCounter')} />
          <TbBtn icon={Palette} disabled label="Paleta" />
          <TbBtn icon={Type} onPress={onText} active={textInsertMode} label={t('entrada.textoLibre')} />
          <TbBtn icon={Upload} disabled label="Subir" />
          <TbBtn icon={Hash} disabled label="Puntos" />
          <TbBtn icon={LayoutGrid} onPress={onGrid} active={gridMode} label={t('entrada.cuadricula')} />
        </View>
      )}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function EntradaDiarioScreen({ navigation, route }) {
  const { diarioId, entradaId, resultadoCalculadora, resultadoVistaPrevia } = route.params;
  const { t } = useTranslation();

  const [entradaNombre, setEntradaNombre] = useState('');
  const [elementos, setElementos] = useState([]);
  const savedRef = useRef([]);
  const titleInputRef = useRef(null);
  const canvasShift = useRef(new Animated.Value(0)).current;

  const [gridMode, setGridMode] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  // selectedId: element has dashed border + format bar visible, no keyboard
  const [selectedId, setSelectedId] = useState(null);
  // editingId: TextInput shown for this element, keyboard open
  const [editingId, setEditingId] = useState(null);
  const [textInsertMode, setTextInsertMode] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [eraseTargetId, setEraseTargetId] = useState(null);

  // ── Keyboard height tracking ─────────────────────────────────────────────────
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Ensure title input never steals focus from a canvas text box ─────────────
  useEffect(() => {
    if (editingId) {
      const timer = setTimeout(() => {
        titleInputRef.current?.blur();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [editingId]);

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await getEntrada(diarioId, entradaId);
      if (cancelled) return;

      let initial = Array.isArray(data?.elementos) ? data.elementos : [];

      if (resultadoCalculadora) {
        const gramos = Math.round(resultadoCalculadora.gramosTotales ?? 0);
        initial = [makeTextBox(40, 40, t('diario.resultadoCalculadora', { gramos })), ...initial];
      }
      if (resultadoVistaPrevia) {
        const tipo = resultadoVistaPrevia.tipoProyecto ?? '';
        const offsetY = resultadoCalculadora ? 120 : 40;
        initial = [makeTextBox(40, offsetY, t('diario.resultadoVistaPrevia', { tipo })), ...initial];
      }

      setEntradaNombre(data?.nombre ?? '');
      setElementos(initial);
      savedRef.current = Array.isArray(data?.elementos) ? data.elementos : [];
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  function isUnsaved() {
    return JSON.stringify(elementos) !== JSON.stringify(savedRef.current);
  }

  function updateElement(id, changes) {
    setElementos((prev) => prev.map((el) => (el.id === id ? { ...el, ...changes } : el)));
  }

  function removeElement(id) {
    setElementos((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateEntrada(diarioId, entradaId, { elementos });
      savedRef.current = [...elementos];
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndExit() {
    await handleSave();
    navigation.goBack();
  }

  function handleBack() {
    if (isUnsaved()) {
      setShowExitModal(true);
    } else {
      navigation.goBack();
    }
  }

  function handleNombreBlur() {
    if (entradaNombre.trim()) {
      updateEntrada(diarioId, entradaId, { nombre: entradaNombre.trim() });
    }
  }

  // How far to shift canvas content up so the active text box clears the keyboard.
  // The Pressable tap catcher stays in the unshifted canvas frame, so locationY from
  // taps must be corrected by this offset when placing new elements.
  const canvasOffset = useMemo(() => {
    if (!keyboardHeight || !editingId) return 0;
    const el = elementos.find((e) => e.id === editingId);
    if (!el) return 0;
    const elementBottom = el.y + 80;
    const visibleCanvasBottom = canvasSize.height - keyboardHeight;
    if (elementBottom > visibleCanvasBottom) {
      return elementBottom - visibleCanvasBottom + 24;
    }
    return 0;
  }, [keyboardHeight, editingId, elementos, canvasSize]);

  // Drive the canvas shift on the native thread so the transform never triggers a React re-render
  useEffect(() => {
    Animated.timing(canvasShift, {
      toValue: -canvasOffset,
      duration: 0,
      useNativeDriver: true,
    }).start();
  }, [canvasOffset]);

  function handleCanvasTap(evt) {
    if (textInsertMode) {
      const { locationX, locationY } = evt.nativeEvent;
      // locationY is in unshifted canvas coordinates; add canvasOffset to get content coordinates
      const tb = makeTextBox(Math.max(0, locationX - 60), Math.max(0, locationY + canvasOffset - 30));
      setElementos((prev) => [...prev, tb]);
      setSelectedId(tb.id);
      setEditingId(null);
      setTextInsertMode(false);
    } else {
      // Deselect everything
      Keyboard.dismiss();
      setSelectedId(null);
      setEditingId(null);
    }
  }

  function handleDoneEditing() {
    Keyboard.dismiss();
    setEditingId(null);
    setSelectedId(null);
  }

  function handleAddRowCounter() {
    if (elementos.some((el) => el.type === 'rowCounter')) return;
    setElementos((prev) => [
      ...prev,
      { id: makeId(), type: 'rowCounter', x: 80, y: 80, count: 0 },
    ]);
  }

  function handleToggleText() {
    setTextInsertMode((prev) => !prev);
    setEraserMode(false);
  }

  function handleToggleEraser() {
    Keyboard.dismiss();
    setEraserMode((prev) => !prev);
    setTextInsertMode(false);
    setSelectedId(null);
    setEditingId(null);
    setEraseTargetId(null);
  }

  const selectedEl = selectedId ? elementos.find((el) => el.id === selectedId) : null;

  // ── Format bar position ─────────────────────────────────────────────────────
  const FORMAT_BAR_H = 44;
  const FORMAT_BAR_W = 316;
  const formatBarPosition = selectedEl && canvasSize.width > 0
    ? (() => {
        const isNearBottom = selectedEl.y > canvasSize.height * 0.55;
        const top = isNearBottom
          ? Math.max(0, selectedEl.y - FORMAT_BAR_H - 8)
          : selectedEl.y + 64;
        const left = Math.max(0, Math.min(selectedEl.x, canvasSize.width - FORMAT_BAR_W));
        return { top, left };
      })()
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={colors.primary.dark} strokeWidth={1.8} />
        </TouchableOpacity>

        <View style={styles.titleInputWrapper} pointerEvents={editingId ? 'none' : 'auto'}>
          <TextInput
            ref={titleInputRef}
            style={styles.titleInput}
            value={entradaNombre}
            onChangeText={setEntradaNombre}
            onBlur={handleNombreBlur}
            returnKeyType="done"
            blurOnSubmit
            autoFocus={false}
            editable={!editingId}
          />
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={handleToggleEraser}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
          >
            <Trash2
              size={20}
              color={eraserMode ? colors.status.errorText : colors.text.tertiary}
              strokeWidth={1.8}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={saving}
            accessibilityRole="button"
          >
            <Save size={20} color={colors.secondary.olive} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas */}
      <View
        style={styles.canvas}
        onLayout={(e) =>
          setCanvasSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
      >
        {/* Tap catcher stays in unshifted canvas frame so locationX/Y are in canvas coords */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCanvasTap} />

        {/* Canvas elements — only the active editing element shifts, via its own Animated.View */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {gridMode && (
            <GridLayer width={canvasSize.width} height={canvasSize.height} />
          )}

          {elementos.map((el) => (
            <DraggableElement
              key={el.id}
              element={el}
              selected={el.id === selectedId}
              isEditing={el.id === editingId}
              eraserMode={eraserMode}
              onErase={setEraseTargetId}
              onMove={(id, pos) => updateElement(id, pos)}
              editShift={el.id === editingId ? canvasShift : undefined}
            >
              {el.type === 'rowCounter' ? (
                <RowCounterWidget
                  count={el.count}
                  onIncrement={() => updateElement(el.id, { count: el.count + 1 })}
                  onReset={() => updateElement(el.id, { count: 0 })}
                />
              ) : (
                <TextBoxWidget
                  element={el}
                  isEditing={el.id === editingId}
                  onChange={(text) => updateElement(el.id, { text })}
                  onPress={
                    el.id === selectedId
                      ? () => setEditingId(el.id)
                      : () => { setSelectedId(el.id); setEditingId(null); }
                  }
                />
              )}
            </DraggableElement>
          ))}

          {/* Floating toolbar */}
          <FloatingToolbar
            canvasSize={canvasSize}
            collapsed={toolbarCollapsed}
            onToggle={() => setToolbarCollapsed((p) => !p)}
            textInsertMode={textInsertMode}
            gridMode={gridMode}
            onRowCounter={handleAddRowCounter}
            onText={handleToggleText}
            onGrid={() => setGridMode((p) => !p)}
            t={t}
          />

          {/* Text format bar — smart-positioned near the selected element */}
          {selectedEl?.type === 'textBox' && formatBarPosition && (
            <TextFormatBar
              element={selectedEl}
              style={formatBarPosition}
              onChange={(changes) => updateElement(selectedId, changes)}
              onDelete={() => removeElement(selectedId)}
              onDone={handleDoneEditing}
            />
          )}
        </View>
      </View>

      <LoadingOverlay visible={loading || saving} />

      <ConfirmationModal
        visible={showExitModal}
        title={t('entrada.exitTitle')}
        message={t('entrada.exitMessage')}
        confirmLabel={t('entrada.guardarYSalir')}
        cancelLabel={t('entrada.salirSinGuardar')}
        onConfirm={handleSaveAndExit}
        onCancel={() => {
          setShowExitModal(false);
          navigation.goBack();
        }}
      />

      <ConfirmationModal
        visible={eraseTargetId != null}
        title={t('entrada.eliminarElementoTitle')}
        confirmLabel={t('entrada.eliminarElementoConfirm')}
        cancelLabel={t('projects.cancel')}
        destructive
        onConfirm={() => {
          removeElement(eraseTargetId);
          setEraseTargetId(null);
        }}
        onCancel={() => setEraseTargetId(null)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.greige,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  titleInputWrapper: { flex: 1 },
  titleInput: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
    textAlign: 'center',
    paddingVertical: 4,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  canvas: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  draggableEl: {
    position: 'absolute',
    minWidth: 80,
    minHeight: 40,
  },
  draggableSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary.DEFAULT,
    borderStyle: 'dashed',
    borderRadius: radii.small,
  },
  draggableEraser: {
    opacity: 0.7,
  },

  // Row counter
  rowCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rowCount: {
    fontFamily: fonts.extraBold,
    fontSize: 36,
    color: colors.text.primary,
    lineHeight: 40,
  },
  rowBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rowBtn: {
    backgroundColor: colors.secondary.cinnamon,
    borderRadius: radii.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  rowResetBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
  },
  rowBtnLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.card,
  },

  // Text box
  textBox: {
    minWidth: 120,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.text.primary,
  },
  textBoxPlaceholder: {
    color: colors.neutral.tertiary,
  },

  // Text format bar
  formatBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 6,
  },
  fmtBtn: {
    padding: 6,
    borderRadius: 6,
  },
  fmtBtnActive: {
    backgroundColor: colors.primary.light + '55',
  },
  fmtDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.neutral.greige,
    marginHorizontal: 2,
  },
  fmtSizeLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text.secondary,
  },
  fmtSizeLabelActive: {
    color: colors.primary.dark,
  },

  // Floating toolbar
  toolbar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.amber,
    borderRadius: radii.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  toolbarHandle: {
    padding: spacing.xs,
  },
  toolbarBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tbBtn: {
    padding: 8,
    borderRadius: 8,
  },
  tbBtnActive: {
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
});
