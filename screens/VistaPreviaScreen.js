import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, ChevronDown } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import {
  TIPOS_PROYECTO,
  PATRONES_PUNTO,
  DIMENSIONES_POR_TIPO,
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

const PRESET_PALETTE = [
  '#C17B4E', '#D4868A', '#7A9E7E', '#E8C9A0',
  '#8BB8A8', '#F5EEE0', '#8B6B5A', '#9AB89A',
];

const EMPTY_FIELDS = {
  tipoProyecto: '',
  dim1: '',
  dim2: '',
  colores: [],
  patronPunto: PATRONES_PUNTO.liso,
};

function prefillFromSaved(saved) {
  if (!saved) return EMPTY_FIELDS;
  const dimLabels = saved.tipoProyecto
    ? DIMENSIONES_POR_TIPO[saved.tipoProyecto]
    : { dim1: 'ancho', dim2: 'largo' };
  const medidas = saved.medidas ?? {};
  return {
    tipoProyecto: saved.tipoProyecto ?? '',
    dim1: medidas[dimLabels?.dim1] != null ? String(medidas[dimLabels.dim1]) : '',
    dim2: medidas[dimLabels?.dim2] != null ? String(medidas[dimLabels.dim2]) : '',
    colores: saved.colores ?? [],
    patronPunto: saved.patronPunto ?? PATRONES_PUNTO.liso,
  };
}

export default function VistaPreviaScreen({ navigation, route }) {
  const { theme: colors } = useTheme();
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
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [savedToastVisible, setSavedToastVisible] = useState(false);
  const [savedToastMessage, setSavedToastMessage] = useState('');
  const [showBackGuard, setShowBackGuard] = useState(false);
  const pickedProjectName = useRef('');
  const pendingBackActionRef = useRef(null);
  const canvasRef = useRef(null);

  const showResultRef = useRef(showResult);
  useEffect(() => { showResultRef.current = showResult; }, [showResult]);

  const savedParamsRef = useRef(savedParams);
  useEffect(() => { savedParamsRef.current = savedParams; }, [savedParams]);

  const pendingNavigationRef = useRef(null);
  const doSaveRef = useRef(null);
  useEffect(() => { doSaveRef.current = doSave; });

  const shouldResetOnFocusRef = useRef(false);
  const navigateAfterSaveRef = useRef(false);

  const isDirtyForTabGuard = isProjectMode && showResult && savedParams === null;

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

  function setField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleColor(hex) {
    setFields((prev) => {
      if (prev.colores.includes(hex)) {
        return { ...prev, colores: prev.colores.filter((c) => c !== hex) };
      }
      if (prev.colores.length >= 4) return prev;
      return { ...prev, colores: [...prev.colores, hex] };
    });
    setErrors((prev) => ({ ...prev, colores: undefined }));
  }

  function handleGenerar() {
    try {
      const p = buildCanvasParams({
        tipoProyecto: fields.tipoProyecto,
        dim1: fields.dim1,
        dim2: fields.dim2,
        colores: fields.colores,
        patronPunto: fields.patronPunto,
      });
      Keyboard.dismiss();
      setParams(p);
      setErrors({});
      setShowResult(true);
    } catch (err) {
      if (err.message === 'validation') {
        setErrors(err.fields ?? {});
      }
    }
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
      setSavedParams(params);
      if (navigateAfterSaveRef.current) {
        navigateAfterSaveRef.current = false;
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
      if (isDirtyForTabGuard) {
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
  const dimLabels = fields.tipoProyecto
    ? DIMENSIONES_POR_TIPO[fields.tipoProyecto]
    : { dim1: 'ancho', dim2: 'largo' };

  // Canvas fills the card width (screen minus outer padding minus card inner padding)
  const canvasWidth = screenWidth - spacing.lg * 2 - spacing.md * 2;

  const generateDisabled = !fields.tipoProyecto || fields.colores.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          {showBackArrow ? (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
            >
              <ArrowLeft size={22} color={colors.primary.dark} strokeWidth={1.8} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerPlaceholder} />
          )}
          <Text style={styles.headerTitle}>{t('vistaPrevia.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {!showResult ? (
          <ScrollView
            contentContainerStyle={styles.formBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!isProjectMode && (
              <Text style={styles.freeModeLabel}>{t('vistaPrevia.freeMode')}</Text>
            )}

            {/* Tipo de proyecto */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('vistaPrevia.tipoProyecto')}</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerRow, !!errors.tipoProyecto && styles.inputError]}
                onPress={() => setShowTypePicker(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={fields.tipoProyecto ? styles.pickerValue : styles.pickerPlaceholder}>
                  {fields.tipoProyecto
                    ? t(`vistaPrevia.tipos.${fields.tipoProyecto}`)
                    : t('vistaPrevia.seleccionaTipo')}
                </Text>
                <ChevronDown size={18} color={colors.text.tertiary} strokeWidth={1.8} />
              </TouchableOpacity>
              {!!errors.tipoProyecto && (
                <Text style={styles.errorText}>{t('vistaPrevia.errors.required')}</Text>
              )}
            </View>

            {/* Dimension inputs — side by side */}
            <View style={styles.dimRow}>
              <View style={[styles.fieldGroup, styles.dimField]}>
                <Text style={styles.fieldLabel}>{t(`vistaPrevia.${dimLabels.dim1}`)}</Text>
                <TextInput
                  style={[styles.input, !!errors.dim1 && styles.inputError]}
                  value={fields.dim1}
                  onChangeText={(v) => setField('dim1', v)}
                  keyboardType="numeric"
                  placeholderTextColor={colors.text.tertiary}
                  accessibilityLabel={t(`vistaPrevia.${dimLabels.dim1}`)}
                />
                {!!errors.dim1 && (
                  <Text style={styles.errorText}>{t('vistaPrevia.errors.dimensions')}</Text>
                )}
              </View>
              <View style={[styles.fieldGroup, styles.dimField]}>
                <Text style={styles.fieldLabel}>{t(`vistaPrevia.${dimLabels.dim2}`)}</Text>
                <TextInput
                  style={[styles.input, !!errors.dim2 && styles.inputError]}
                  value={fields.dim2}
                  onChangeText={(v) => setField('dim2', v)}
                  keyboardType="numeric"
                  placeholderTextColor={colors.text.tertiary}
                  accessibilityLabel={t(`vistaPrevia.${dimLabels.dim2}`)}
                />
                {!!errors.dim2 && (
                  <Text style={styles.errorText}>{t('vistaPrevia.errors.dimensions')}</Text>
                )}
              </View>
            </View>

            {/* Colour palette */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('vistaPrevia.paleta')}</Text>
              <View style={styles.paletteGrid}>
                {PRESET_PALETTE.map((hex) => {
                  const selected = fields.colores.includes(hex);
                  return (
                    <TouchableOpacity
                      key={hex}
                      style={[styles.swatch, { backgroundColor: hex }, selected && styles.swatchSelected]}
                      onPress={() => toggleColor(hex)}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    />
                  );
                })}
              </View>
              {!!errors.colores && (
                <Text style={styles.errorText}>{t('vistaPrevia.errors.required')}</Text>
              )}
            </View>

            {/* Stitch pattern */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('vistaPrevia.patronPunto')}</Text>
              <View style={styles.pillRow}>
                {Object.entries(PATRONES_PUNTO).map(([key, value]) => {
                  const selected = fields.patronPunto === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.pill, selected && styles.pillSelected]}
                      onPress={() => setField('patronPunto', value)}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                        {t(`vistaPrevia.patrones.${key}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
          <ScrollView contentContainerStyle={styles.resultBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Canvas card */}
            <View style={styles.canvasCard}>
              <PreviewCanvas
                ref={canvasRef}
                tipoProyecto={params.tipoProyecto}
                medidas={params.medidas}
                colores={params.colores}
                patronPunto={params.patronPunto}
                width={canvasWidth}
              />
            </View>

            <View style={styles.resultMeta}>
              <Text style={styles.resultTypeName}>
                {t(`vistaPrevia.tipos.${params.tipoProyecto}`)}
              </Text>
              <Text style={styles.resultDimensions}>
                {Object.values(params.medidas).join(' × ')} cm
              </Text>
            </View>

            {/* Selected colours */}
            <View style={styles.coloursCard}>
              <Text style={styles.coloursLabel}>{t('vistaPrevia.coloresSeleccionados')}</Text>
              <View style={styles.colourCircles}>
                {params.colores.map((hex) => (
                  <View key={hex} style={[styles.colourCircle, { backgroundColor: hex }]} />
                ))}
              </View>
            </View>

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

      {/* Type picker modal */}
      <Modal visible={showTypePicker} transparent animationType="fade" statusBarTranslucent>
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowTypePicker(false)}
        >
          <View style={styles.pickerSheet}>
            {TIPOS_PROYECTO.map((tipo, idx) => (
              <TouchableOpacity
                key={tipo}
                style={[
                  styles.pickerItem,
                  idx === TIPOS_PROYECTO.length - 1 && styles.pickerItemLast,
                ]}
                onPress={() => {
                  setFields((prev) => ({ ...prev, tipoProyecto: tipo, dim1: '', dim2: '' }));
                  setErrors((prev) => ({ ...prev, tipoProyecto: undefined, dim1: undefined, dim2: undefined }));
                  setShowTypePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.pickerItemText,
                  fields.tipoProyecto === tipo && styles.pickerItemTextSelected,
                ]}>
                  {t(`vistaPrevia.tipos.${tipo}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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

      <Modal visible={showSavedModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.savedOverlay}>
          <View style={styles.savedSheet}>
            <View style={styles.checkCircle}>
              <Check size={28} color={colors.primary.dark} strokeWidth={2.5} />
            </View>
            <Text style={styles.savedTitle}>{t('vistaPrevia.saved.title')}</Text>
            <View style={styles.savedButtons}>
              <TouchableOpacity
                style={[styles.savedBtn, styles.savedBtnPrimary]}
                onPress={handleVerProyecto}
                activeOpacity={0.85}
              >
                <Text style={styles.savedBtnPrimaryText}>{t('vistaPrevia.saved.verProyecto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savedBtn, styles.savedBtnOutline]}
                onPress={handleCrearOtra}
                activeOpacity={0.8}
              >
                <Text style={styles.savedBtnOutlineText}>{t('vistaPrevia.saved.crearOtra')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ProjectPickerModal
        visible={showProjectPicker}
        uid={user?.uid}
        onClose={() => { navigateAfterSaveRef.current = false; setShowProjectPicker(false); }}
        onSelect={handlePickProject}
        onCreateProject={() => {
          setShowProjectPicker(false);
          navigation.navigate('Inicio', { screen: 'ProyectoFormScreen' });
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
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  formBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary.dark,
  },

  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
  pickerPlaceholder: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.tertiary,
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

  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 60,
    height: 60,
    borderRadius: radii.card,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.secondary.amber,
  },

  pillRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.small,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    backgroundColor: colors.card,
  },
  pillSelected: {
    backgroundColor: colors.button.primary,
    borderColor: colors.button.primary,
  },
  pillText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  pillTextSelected: { color: colors.card },

  primaryBtn: {
    backgroundColor: colors.button.primary,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
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
    gap: spacing.xs,
  },
  resultTypeName: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
  },
  resultDimensions: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary.DEFAULT,
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
  colourCircles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colourCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
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
    color: colors.text.primary,
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

  // Type picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  pickerSheet: {
    backgroundColor: colors.card,
    borderRadius: radii.modal,
    width: '100%',
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.greige,
  },
  pickerItemLast: { borderBottomWidth: 0 },
  pickerItemText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
  pickerItemTextSelected: {
    fontFamily: fonts.bold,
    color: colors.primary.dark,
  },

  // Saved success modal
  savedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  savedSheet: {
    backgroundColor: colors.card,
    borderRadius: radii.modal,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.status.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
  },
  savedButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  savedBtn: {
    flex: 1,
    borderRadius: radii.small,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  savedBtnPrimary: { backgroundColor: colors.button.primary },
  savedBtnPrimaryText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.card,
  },
  savedBtnOutline: {
    borderWidth: 1,
    borderColor: colors.neutral.greige,
  },
  savedBtnOutlineText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
}); }
