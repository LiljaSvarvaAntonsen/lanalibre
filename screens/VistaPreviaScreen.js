import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check } from 'lucide-react-native';
import { Svg, Rect } from 'react-native-svg';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { PALETTE, isLight } from '../constants/palette';
import {
  PATRONES_PUNTO,
  buildCanvasParams,
} from '../services/previsualización';
import {
  saveResultadoPrevisualización,
  getResultadoPrevisualización,
} from '../services/firestore';
import { formatShortDate } from '../utils/dates';
import { useAuth } from '../hooks/useAuth';
import ConfirmationModal from '../components/ConfirmationModal';
import PreviewCanvas from '../components/PreviewCanvas';
import LoadingOverlay from '../components/LoadingOverlay';
import ProjectPickerModal from '../components/ProjectPickerModal';
import Toast from '../components/Toast';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';

const COPPER = '#CB6D51';

const PATTERN_OPTIONS = [
  { key: 'rayasV',        value: PATRONES_PUNTO.rayasV },
  { key: 'rayasH',        value: PATRONES_PUNTO.rayasH },
  { key: 'grannySquares', value: PATRONES_PUNTO.grannySquares },
];

const EMPTY_FIELDS = {
  dim1: '',
  dim2: '',
  colores: [],
  patronPunto: null,
};

function prefillFromSaved(saved) {
  if (!saved) return EMPTY_FIELDS;
  const medidas = saved.medidas ?? {};
  const validPatron = saved.patronPunto && Object.values(PATRONES_PUNTO).includes(saved.patronPunto)
    ? saved.patronPunto
    : null;
  return {
    dim1: medidas.ancho != null ? String(medidas.ancho) : '',
    dim2: medidas.largo != null ? String(medidas.largo) : '',
    colores: saved.colores ?? [],
    patronPunto: validPatron,
  };
}

// Mini SVG thumbnail for pattern cards
function PatternThumb({ type, size = 48 }) {
  if (type === PATRONES_PUNTO.rayasV) {
    const count = 4;
    const w = size / count;
    const colors = ['#C8BBE8', '#87AE77', '#FA8072', '#89CFF0'];
    return (
      <Svg width={size} height={size}>
        {Array.from({ length: count }, (_, i) => (
          <Rect key={i} x={i * w} y={0} width={w} height={size} fill={colors[i % colors.length]} />
        ))}
      </Svg>
    );
  }
  if (type === PATRONES_PUNTO.rayasH) {
    const count = 4;
    const h = size / count;
    const colors = ['#C8BBE8', '#87AE77', '#FA8072', '#89CFF0'];
    return (
      <Svg width={size} height={size}>
        {Array.from({ length: count }, (_, i) => (
          <Rect key={i} x={0} y={i * h} width={size} height={h} fill={colors[i % colors.length]} />
        ))}
      </Svg>
    );
  }
  // grannySquares
  const grid = 3;
  const sq = size / grid;
  const palettes = [
    ['#C8BBE8', '#FA8072', '#89CFF0'],
    ['#87AE77', '#FFD700', '#C8BBE8'],
    ['#FA8072', '#89CFF0', '#87AE77'],
  ];
  const elements = [];
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const cols = palettes[(r + c) % palettes.length];
      const N = cols.length;
      const t = sq / (2 * N);
      for (let i = 0; i < N; i++) {
        const inset = i * t;
        const side = sq - 2 * inset;
        elements.push(
          <Rect key={`${r}-${c}-${i}`} x={c * sq + inset} y={r * sq + inset} width={side} height={side} fill={cols[i]} />,
        );
      }
    }
  }
  return <Svg width={size} height={size}>{elements}</Svg>;
}

export default function VistaPreviaScreen({ navigation, route }) {
  const { theme: colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { setTabGuard, clearTabGuard } = useNavigationGuard();
  const { width: screenWidth } = useWindowDimensions();
  const projectId = route?.params?.projectId ?? null;
  const isProjectMode = !!projectId;

  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [errors, setErrors] = useState({});
  const [params, setParams] = useState(null);
  const [savedParams, setSavedParams] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [savedToastVisible, setSavedToastVisible] = useState(false);
  const [savedToastMessage, setSavedToastMessage] = useState('');
  const [showBackGuard, setShowBackGuard] = useState(false);

  // Result-phase colour order state
  const [colorOrder, setColorOrder] = useState([]);
  const [squareSeed, setSquareSeed] = useState(0);
  const [originalColors, setOriginalColors] = useState([]);

  const pickedProjectName = useRef('');
  const pendingBackActionRef = useRef(null);
  const canvasRef = useRef(null);
  const showResultRef = useRef(showResult);
  const savedParamsRef = useRef(savedParams);
  const pendingNavigationRef = useRef(null);
  const doSaveRef = useRef(null);
  const navigateAfterSaveRef = useRef(false);
  const shouldResetOnFocusRef = useRef(false);

  useEffect(() => { showResultRef.current = showResult; }, [showResult]);
  useEffect(() => { savedParamsRef.current = savedParams; }, [savedParams]);
  useEffect(() => { doSaveRef.current = doSave; });

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (shouldResetOnFocusRef.current) {
        setFields(EMPTY_FIELDS);
        setErrors({});
        setParams(null);
        setShowResult(false);
        setSavedParams(null);
        shouldResetOnFocusRef.current = false;
      }
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    const unsub = navigation.addListener('blur', () => {
      shouldResetOnFocusRef.current = true;
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (showResult && savedParams === null) {
      setTabGuard({
        guardingTabName: 'VistaPrevia',
        isActive: () => navigation.isFocused(),
        title: t('vistaPrevia.exitGuard.title'),
        message: t('vistaPrevia.exitGuard.message'),
        confirmLabel: t('vistaPrevia.exitGuard.discard'),
        cancelLabel: t('vistaPrevia.exitGuard.save'),
        destructive: true,
        onSave: (destinationTab) => {
          pendingNavigationRef.current = destinationTab;
          navigateAfterSaveRef.current = true;
          if (isProjectMode) {
            doSaveRef.current?.();
          } else {
            setShowProjectPicker(true);
          }
        },
      });
    } else {
      clearTabGuard();
    }
  }, [showResult, savedParams]);

  useEffect(() => {
    if (!isProjectMode) return;
    let cancelled = false;
    setLoading(true);
    getResultadoPrevisualización(projectId)
      .then((saved) => {
        if (!cancelled) {
          setSavedParams(saved);
          if (saved) setFields(prefillFromSaved(saved));
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, isProjectMode]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      const resultNotSaved = showResultRef.current && savedParamsRef.current === null;
      if (!resultNotSaved) return;
      e.preventDefault();
      pendingBackActionRef.current = e.data.action;
      setShowBackGuard(true);
    });
    return unsub;
  }, [navigation]);

  function toggleColor(hex) {
    setFields((prev) => {
      if (prev.colores.includes(hex)) {
        return { ...prev, colores: prev.colores.filter((c) => c !== hex) };
      }
      if (prev.colores.length >= 10) return prev;
      return { ...prev, colores: [...prev.colores, hex] };
    });
    setErrors((prev) => ({ ...prev, colores: undefined }));
  }

  function handleGenerar() {
    try {
      const seed = Math.floor(Math.random() * 100000);
      const order = [...fields.colores];
      const p = buildCanvasParams({
        dim1: fields.dim1,
        dim2: fields.dim2,
        colores: order,
        patronPunto: fields.patronPunto,
        squareSeed: seed,
      });
      Keyboard.dismiss();
      setColorOrder(order);
      setOriginalColors(order);
      setSquareSeed(seed);
      setParams(p);
      setErrors({});
      setShowResult(true);
    } catch (err) {
      if (err.message === 'validation') {
        setErrors(err.fields ?? {});
      }
    }
  }

  function handleAleatorizar() {
    const shuffled = [...colorOrder].sort(() => Math.random() - 0.5);
    const seed = Math.floor(Math.random() * 100000);
    setColorOrder(shuffled);
    setSquareSeed(seed);
    setParams((p) => ({ ...p, colores: shuffled, squareSeed: seed }));
  }

  function handleRestablecer() {
    setColorOrder(originalColors);
    setSquareSeed(0);
    setParams((p) => ({ ...p, colores: originalColors, squareSeed: 0 }));
  }

  function handleGuardar() {
    if (!isProjectMode) {
      setShowProjectPicker(true);
    } else if (savedParams) {
      setShowOverwriteModal(true);
    } else {
      doSave();
    }
  }

  function handlePickProject(project) {
    pickedProjectName.current = project.nombre;
    setShowProjectPicker(false);
    doSave(project.id);
  }

  async function doSave(targetProjectId = projectId) {
    setShowOverwriteModal(false);
    setLoading(true);
    try {
      await saveResultadoPrevisualización(targetProjectId, params);
      savedParamsRef.current = params;
      setSavedParams(params);
      if (navigateAfterSaveRef.current) {
        navigateAfterSaveRef.current = false;
        showResultRef.current = false;
        setShowResult(false);
        if (pendingNavigationRef.current) {
          navigation.navigate(pendingNavigationRef.current);
          pendingNavigationRef.current = null;
        }
      } else if (isProjectMode) {
        setShowSavedModal(true);
      } else {
        setSavedToastMessage(t('projectPicker.savedToast', { nombre: pickedProjectName.current }));
        setSavedToastVisible(true);
      }
    } catch {
      // error handled silently
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (showResult) {
      const isDirty = showResult && savedParams === null;
      if (isDirty) {
        setShowBackGuard(true);
      } else {
        setShowResult(false);
      }
    } else {
      navigation.goBack();
    }
  }

  function handleBackGuardKeep() {
    pendingBackActionRef.current = null;
    setShowBackGuard(false);
  }

  function handleBackGuardDiscard() {
    setShowBackGuard(false);
    setFields(EMPTY_FIELDS);
    setErrors({});
    setParams(null);
    setShowResult(false);
    if (pendingBackActionRef.current) {
      navigation.dispatch(pendingBackActionRef.current);
      pendingBackActionRef.current = null;
    } else {
      navigation.goBack();
    }
  }

  function handleVerProyecto() {
    setShowSavedModal(false);
    navigation.goBack();
  }

  function handleCrearOtra() {
    setShowSavedModal(false);
    setFields(EMPTY_FIELDS);
    setErrors({});
    setParams(null);
    setShowResult(false);
  }

  async function handleAddToJournal() {
    setLoading(true);
    try {
      const previewImageUri = await new Promise((resolve, reject) => {
        if (!canvasRef.current?.toDataURL) { reject(new Error('no toDataURL')); return; }
        canvasRef.current.toDataURL((data) => {
          if (data) resolve('data:image/png;base64,' + data);
          else reject(new Error('empty'));
        });
      });
      navigation.navigate('Diario', {
        screen: 'DiarioRoot',
        params: { previewImageUri, projectId },
      });
    } catch (err) {
      console.error('[preview] capture failed:', err?.message);
      navigation.navigate('Diario', {
        screen: 'DiarioRoot',
        params: { projectId },
      });
    } finally {
      setLoading(false);
    }
  }

  const showBackArrow = navigation.canGoBack() || showResult;
  const canvasWidth = screenWidth - spacing.lg * 2 - spacing.md * 2;
  const generateDisabled = fields.colores.length < 2 || !fields.patronPunto;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          {showBackArrow ? (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
            >
              <ArrowLeft size={22} color={colors.brand.copperRed} strokeWidth={1.8} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerPlaceholder} />
          )}
          <Text style={[styles.headerTitle, { color: isDark ? '#BA797D' : '#5D2D24' }]}>
            {t('vistaPrevia.title')}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {!showResult ? (
          /* ── Form view ─────────────────────────────────────────────────────── */
          <ScrollView
            contentContainerStyle={styles.formBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>{t('vistaPrevia.subtitle')}</Text>

            {/* Selected colours preview row */}
            {fields.colores.length > 0 && (
              <View style={styles.selectedRow}>
                {fields.colores.map((hex) => (
                  <TouchableOpacity
                    key={hex}
                    style={[
                      styles.selectedCircle,
                      { backgroundColor: hex },
                      isLight(hex) && styles.selectedCircleLight,
                    ]}
                    onPress={() => toggleColor(hex)}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: true }}
                  >
                    <Check size={14} color={COPPER} strokeWidth={2.5} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Colour section */}
            <View style={styles.fieldGroup}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.fieldLabel}>{t('vistaPrevia.coloresSection')}</Text>
                <Text style={styles.fieldHint}>{t('vistaPrevia.coloresHint')}</Text>
              </View>
              {!!errors.colores && (
                <Text style={styles.errorText}>{t('vistaPrevia.errors.minColors')}</Text>
              )}

              {PALETTE.map(({ group, swatches }) => (
                <View key={group} style={styles.paletteGroup}>
                  <Text style={styles.groupHeader}>{group}</Text>
                  <View style={styles.swatchRow}>
                    {swatches.map(({ name, hex }) => {
                      const selected = fields.colores.includes(hex);
                      return (
                        <TouchableOpacity
                          key={hex}
                          style={[
                            styles.swatch,
                            { backgroundColor: hex },
                            isLight(hex) && styles.swatchLight,
                          ]}
                          onPress={() => toggleColor(hex)}
                          activeOpacity={0.8}
                          accessibilityLabel={name}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                        >
                          {selected && (
                            <View style={styles.swatchCheckmark}>
                              <Check size={14} color={COPPER} strokeWidth={2.5} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            {/* Pattern type */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('vistaPrevia.disenoSection')}</Text>
              <View style={styles.patternCards}>
                {PATTERN_OPTIONS.map(({ key, value }) => {
                  const selected = fields.patronPunto === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.patternCard, selected && styles.patternCardSelected]}
                      onPress={() => setFields((prev) => ({ ...prev, patronPunto: value }))}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <PatternThumb type={value} size={52} />
                      <Text style={[styles.patternLabel, selected && styles.patternLabelSelected]}>
                        {t(`vistaPrevia.patrones.${key}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Dimensions */}
            <View style={styles.dimRow}>
              <View style={[styles.fieldGroup, styles.dimField]}>
                <Text style={styles.fieldLabel}>{t('vistaPrevia.ancho')}</Text>
                <TextInput
                  style={[styles.input, !!errors.dim1 && styles.inputError]}
                  value={fields.dim1}
                  onChangeText={(v) => {
                    setFields((prev) => ({ ...prev, dim1: v }));
                    setErrors((prev) => ({ ...prev, dim1: undefined }));
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={colors.text.tertiary}
                  accessibilityLabel={t('vistaPrevia.ancho')}
                />
                {!!errors.dim1 && (
                  <Text style={styles.errorText}>{t('vistaPrevia.errors.dimensions')}</Text>
                )}
              </View>
              <View style={[styles.fieldGroup, styles.dimField]}>
                <Text style={styles.fieldLabel}>{t('vistaPrevia.largo')}</Text>
                <TextInput
                  style={[styles.input, !!errors.dim2 && styles.inputError]}
                  value={fields.dim2}
                  onChangeText={(v) => {
                    setFields((prev) => ({ ...prev, dim2: v }));
                    setErrors((prev) => ({ ...prev, dim2: undefined }));
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={colors.text.tertiary}
                  accessibilityLabel={t('vistaPrevia.largo')}
                />
                {!!errors.dim2 && (
                  <Text style={styles.errorText}>{t('vistaPrevia.errors.dimensions')}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, generateDisabled && styles.primaryBtnDisabled]}
              onPress={handleGenerar}
              activeOpacity={0.85}
              disabled={generateDisabled}
            >
              <Text style={styles.primaryBtnText}>{t('vistaPrevia.generar')}</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* ── Result view ───────────────────────────────────────────────────── */
          <ScrollView
            contentContainerStyle={styles.resultBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Colour order controls */}
            <View style={styles.coloursCard}>
              <Text style={styles.coloursLabel}>{t('vistaPrevia.paletaEnUso')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorChipsScroll}>
                <View style={styles.colorChips}>
                  {colorOrder.map((hex, idx) => (
                    <View key={`${hex}-${idx}`} style={[styles.colourCircle, { backgroundColor: hex }, isLight(hex) && styles.colourCircleLight]} />
                  ))}
                </View>
              </ScrollView>
              <View style={styles.shuffleRow}>
                <TouchableOpacity style={styles.aleatorizarBtn} onPress={handleAleatorizar} activeOpacity={0.8}>
                  <Text style={styles.aleatorizarText}>{t('vistaPrevia.aleatorizar')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.restablecerBtn} onPress={handleRestablecer} activeOpacity={0.8}>
                  <Text style={styles.restablecerText}>{t('vistaPrevia.restablecer')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Canvas */}
            <View style={styles.canvasCard}>
              <PreviewCanvas
                ref={canvasRef}
                medidas={params.medidas}
                colores={colorOrder}
                patronPunto={params.patronPunto}
                squareSeed={squareSeed}
                width={canvasWidth}
              />
            </View>

            <View style={styles.resultMeta}>
              <Text style={styles.resultDimensions}>
                {params.medidas.ancho} × {params.medidas.largo} cm
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleGuardar}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{t('vistaPrevia.guardarProyecto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.journalBtn}
                onPress={handleAddToJournal}
                activeOpacity={0.85}
              >
                <Text style={styles.journalBtnText}>{t('vistaPrevia.añadirDiario')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => setShowResult(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.outlineBtnText}>{t('vistaPrevia.modificar')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <ConfirmationModal
        visible={showOverwriteModal}
        title={t('vistaPrevia.overwrite.title')}
        message={
          savedParams?.fechaGuardado
            ? t('vistaPrevia.overwrite.messageConFecha', { date: formatShortDate(savedParams.fechaGuardado) })
            : t('vistaPrevia.overwrite.message')
        }
        confirmLabel={t('vistaPrevia.overwrite.confirm')}
        cancelLabel={t('vistaPrevia.overwrite.cancel')}
        onConfirm={doSave}
        onCancel={() => setShowOverwriteModal(false)}
        destructive={false}
      />

      <ConfirmationModal
        visible={showSavedModal}
        title={t('vistaPrevia.saved.title')}
        confirmLabel={t('vistaPrevia.saved.verProyecto')}
        cancelLabel={t('vistaPrevia.saved.crearOtra')}
        onConfirm={handleVerProyecto}
        onCancel={handleCrearOtra}
      />

      <ProjectPickerModal
        visible={showProjectPicker}
        uid={user?.uid}
        onClose={() => { navigateAfterSaveRef.current = false; setShowProjectPicker(false); }}
        onSelect={handlePickProject}
        onCreateProject={() => {
          setShowProjectPicker(false);
          savedParamsRef.current = params;
          setSavedParams(params);
          showResultRef.current = false;
          setShowResult(false);
          navigation.navigate('Inicio', {
            screen: 'ProyectoFormScreen',
            params: {
              pendingResult: params,
              pendingResultType: 'vista_previa',
            },
          });
        }}
      />

      <Toast
        visible={savedToastVisible}
        message={savedToastMessage}
        type="success"
        onHide={() => setSavedToastVisible(false)}
      />

      <ConfirmationModal
        visible={showBackGuard}
        title={t('vistaPrevia.backGuard.title')}
        message={t('vistaPrevia.backGuard.message')}
        confirmLabel={t('vistaPrevia.backGuard.keep')}
        cancelLabel={t('vistaPrevia.backGuard.discard')}
        onConfirm={handleBackGuardKeep}
        onCancel={handleBackGuardDiscard}
      />

      <LoadingOverlay visible={loading} />
    </SafeAreaView>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.text.primary,
  },
  headerPlaceholder: { width: 22 },

  freeModeLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#5D2D24',
    textAlign: 'center',
  },

  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },

  formBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  selectedCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COPPER,
  },
  selectedCircleLight: {
    borderColor: '#9E9E9E',
  },

  fieldGroup: { gap: spacing.xs },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#BA797D',
  },
  fieldHint: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },

  paletteGroup: { gap: 6 },
  groupHeader: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.xs,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLight: {
    borderWidth: 1,
    borderColor: colors.neutral.greige,
  },
  swatchCheckmark: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },

  patternCards: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  patternCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.neutral.greige,
    backgroundColor: colors.card,
  },
  patternCardSelected: {
    borderColor: COPPER,
    backgroundColor: colors.background,
  },
  patternLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  patternLabelSelected: {
    color: COPPER,
  },

  dimRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dimField: { flex: 1 },

  input: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
  inputError: { borderColor: colors.status.errorText },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.status.errorText,
  },

  primaryBtn: {
    backgroundColor: COPPER,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.card,
  },

  // Result view
  resultBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  coloursCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    padding: spacing.md,
    gap: spacing.sm,
  },
  coloursLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  colorChipsScroll: { flexGrow: 0 },
  colorChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: 2,
  },
  colourCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
  },
  colourCircleLight: {
    borderColor: '#9E9E9E',
  },
  shuffleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  aleatorizarBtn: {
    borderRadius: radii.small,
    borderWidth: 1,
    borderColor: COPPER,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  aleatorizarText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: COPPER,
  },
  restablecerBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  restablecerText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },

  canvasCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  resultMeta: {
    alignItems: 'center',
  },
  resultDimensions: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary.DEFAULT,
  },

  actionButtons: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  journalBtn: {
    backgroundColor: colors.button.diary,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  journalBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.card,
  },
  outlineBtn: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.secondary,
  },
}); }
