import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { calcularConsumo, MULTIPLICADORES } from '../services/calculadora';
import { saveResultadoCalculadora, getResultadoCalculadora } from '../services/firestore';
import { formatShortDate } from '../utils/dates';
import { useAuth } from '../hooks/useAuth';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingOverlay from '../components/LoadingOverlay';
import ProjectPickerModal from '../components/ProjectPickerModal';
import Toast from '../components/Toast';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';

const STITCH_TYPES = Object.keys(MULTIPLICADORES);

const EMPTY_FIELDS = {
  metrosEtiqueta: '',
  gramosEtiqueta: '',
  ancho: '',
  largo: '',
  tension: '',
  tipoPunto: '',
};

function prefillFromSaved(saved) {
  if (!saved) return EMPTY_FIELDS;
  return {
    metrosEtiqueta: saved.metrosEtiqueta != null ? String(saved.metrosEtiqueta) : '',
    gramosEtiqueta: saved.gramosEtiqueta != null ? String(saved.gramosEtiqueta) : '',
    ancho: saved.dimensiones?.ancho != null ? String(saved.dimensiones.ancho) : '',
    largo: saved.dimensiones?.largo != null ? String(saved.dimensiones.largo) : '',
    tension: saved.tension != null ? String(saved.tension) : '',
    tipoPunto: saved.tipoPunto ?? '',
  };
}

export default function CalculadoraScreen({ navigation, route }) {
  const { theme: colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { setTabGuard, clearTabGuard } = useNavigationGuard();
  const projectId = route?.params?.projectId ?? null;
  const isProjectMode = !!projectId;

  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [savedResult, setSavedResult] = useState(null);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [savedToastVisible, setSavedToastVisible] = useState(false);
  const [savedToastMessage, setSavedToastMessage] = useState('');
  const [showBackGuard, setShowBackGuard] = useState(false);
  const pickedProjectName = useRef('');
  const pendingBackActionRef = useRef(null);

  const showResultRef = useRef(showResult);
  useEffect(() => { showResultRef.current = showResult; }, [showResult]);

  const savedResultRef = useRef(savedResult);
  useEffect(() => { savedResultRef.current = savedResult; }, [savedResult]);

  const pendingNavigationRef = useRef(null);
  const doSaveRef = useRef(null);
  useEffect(() => { doSaveRef.current = doSave; });

  const shouldResetOnFocusRef = useRef(false);
  const navigateAfterSaveRef = useRef(false);

  const isDirtyForTabGuard = isProjectMode && showResult && savedResult === null;

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (shouldResetOnFocusRef.current) {
        setFields(EMPTY_FIELDS);
        setErrors({});
        setResult(null);
        setShowResult(false);
        setSavedResult(null);
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
    if (showResult && savedResult === null) {
      setTabGuard({
        guardingTabName: 'Calculadora',
        isActive: () => navigation.isFocused(),
        title: t('calculadora.exitGuard.title'),
        message: t('calculadora.exitGuard.message'),
        confirmLabel: t('calculadora.exitGuard.discard'),
        cancelLabel: t('calculadora.exitGuard.save'),
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
  }, [showResult, savedResult]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      const resultNotSaved = showResultRef.current && savedResultRef.current === null;
      if (!resultNotSaved) return;
      e.preventDefault();
      pendingBackActionRef.current = e.data.action;
      setShowBackGuard(true);
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (!isProjectMode) return;
    let cancelled = false;
    setLoading(true);
    getResultadoCalculadora(projectId).then((saved) => {
      if (!cancelled) {
        setSavedResult(saved);
        if (saved) setFields(prefillFromSaved(saved));
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, isProjectMode]);

  function setField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate() {
    const newErrors = {};
    const numFields = ['metrosEtiqueta', 'gramosEtiqueta', 'ancho', 'largo', 'tension'];
    for (const key of numFields) {
      const val = parseFloat(fields[key]);
      if (!fields[key].trim()) {
        newErrors[key] = t('calculadora.errors.required');
      } else if (isNaN(val) || val <= 0) {
        newErrors[key] = t('calculadora.errors.positiveNumber');
      }
    }
    if (!fields.tipoPunto) {
      newErrors.tipoPunto = t('calculadora.errors.required');
    }
    return newErrors;
  }

  function handleCalcular() {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    try {
      const res = calcularConsumo({
        metrosEtiqueta: parseFloat(fields.metrosEtiqueta),
        gramosEtiqueta: parseFloat(fields.gramosEtiqueta),
        tension: parseFloat(fields.tension),
        tipoPunto: fields.tipoPunto,
        dimensiones: { ancho: parseFloat(fields.ancho), largo: parseFloat(fields.largo) },
      });
      Keyboard.dismiss();
      setResult(res);
      setShowResult(true);
    } catch {
      setErrors({ general: t('calculadora.errors.required') });
    }
  }

  function handleGuardar() {
    if (!isProjectMode) {
      setShowProjectPicker(true);
    } else if (savedResult) {
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
    const data = {
      metrosEtiqueta: parseFloat(fields.metrosEtiqueta),
      gramosEtiqueta: parseFloat(fields.gramosEtiqueta),
      tension: parseFloat(fields.tension),
      tipoPunto: fields.tipoPunto,
      dimensiones: { ancho: parseFloat(fields.ancho), largo: parseFloat(fields.largo) },
      metrosTotales: result.metrosTotales,
      gramosTotales: result.gramosTotales,
      resultadoFinal: result.resultadoFinal,
      ovillosTotales: result.ovillosTotales,
    };
    try {
      await saveResultadoCalculadora(targetProjectId, data);
      savedResultRef.current = data;
      setSavedResult(data);
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

  function handleAddToJournal() {
    navigation.navigate('Diario', {
      screen: 'DiarioRoot',
      params: { resultadoCalculadora: result, projectId },
    });
  }

  function handleCalcularOtro() {
    setFields(EMPTY_FIELDS);
    setErrors({});
    setResult(null);
    setShowResult(false);
  }

  function handleVerProyecto() {
    setShowSavedModal(false);
    navigation.goBack();
  }

  function handleSeguirCalculando() {
    setShowSavedModal(false);
    handleCalcularOtro();
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
    setResult(null);
    setShowResult(false);
    if (pendingBackActionRef.current) {
      navigation.dispatch(pendingBackActionRef.current);
      pendingBackActionRef.current = null;
    } else {
      navigation.goBack();
    }
  }

  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          {(canGoBack || showResult) ? (
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
          <Text style={[styles.headerTitle, { color: isDark ? '#BA797D' : '#5D2D24' }]}>{t('calculadora.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {!showResult ? (
          <ScrollView
            contentContainerStyle={styles.formBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FormField
              label={t('calculadora.metrosEtiqueta')}
              value={fields.metrosEtiqueta}
              onChangeText={(v) => setField('metrosEtiqueta', v)}
              error={errors.metrosEtiqueta}
              styles={styles}
              colors={colors}
            />
            <FormField
              label={t('calculadora.gramosEtiqueta')}
              value={fields.gramosEtiqueta}
              onChangeText={(v) => setField('gramosEtiqueta', v)}
              error={errors.gramosEtiqueta}
              styles={styles}
              colors={colors}
            />
            <FormField
              label={t('calculadora.ancho')}
              value={fields.ancho}
              onChangeText={(v) => setField('ancho', v)}
              error={errors.ancho}
              styles={styles}
              colors={colors}
            />
            <FormField
              label={t('calculadora.largo')}
              value={fields.largo}
              onChangeText={(v) => setField('largo', v)}
              error={errors.largo}
              styles={styles}
              colors={colors}
            />
            <FormField
              label={t('calculadora.tension')}
              value={fields.tension}
              onChangeText={(v) => setField('tension', v)}
              error={errors.tension}
              styles={styles}
              colors={colors}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('calculadora.tipoPunto')}</Text>
              <View style={styles.pillRow}>
                {STITCH_TYPES.map((key) => {
                  const selected = fields.tipoPunto === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.pill, selected && styles.pillSelected]}
                      onPress={() => setField('tipoPunto', key)}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                        {t(`calculadora.tipoPunto_${key}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!!errors.tipoPunto && (
                <Text style={styles.errorText}>{errors.tipoPunto}</Text>
              )}
            </View>

            {!!errors.general && (
              <Text style={styles.errorText}>{errors.general}</Text>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCalcular}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{t('calculadora.calcular')}</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.resultBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ResultCard
              label={t('calculadora.result.metrosTotales')}
              value={`${Math.round(result.metrosTotales)} m`}
              valueColor={colors.brand.burntCopper}
              styles={styles}
            />
            <ResultCard
              label={t('calculadora.result.gramosTotales')}
              value={`${Math.round(result.gramosTotales)} g`}
              valueColor={colors.brand.dustyRose}
              styles={styles}
            />
            <ResultCard
              label={t('calculadora.resultado.ovillos')}
              value={`${result.ovillosTotales} 🧶`}
              valueColor={colors.brand.burntCopper}
              highlight
              subtext={t('calculadora.resultado.basadoEn', { gramos: Math.round(parseFloat(fields.gramosEtiqueta)) })}
              styles={styles}
            />

            <Text style={styles.disclaimer}>{t('calculadora.result.disclaimer')}</Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleGuardar}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>{t('calculadora.guardarProyecto')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.journalBtn}
                onPress={handleAddToJournal}
                activeOpacity={0.85}
              >
                <Text style={styles.journalBtnText}>{t('calculadora.addToJournal')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={handleCalcularOtro}
                activeOpacity={0.8}
              >
                <Text style={styles.outlineBtnText}>{t('calculadora.calcularOtro')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <ConfirmationModal
        visible={showOverwriteModal}
        title={t('calculadora.overwrite.title')}
        message={
          savedResult?.fechaGuardado
            ? t('calculadora.overwrite.messageConFecha', { date: formatShortDate(savedResult.fechaGuardado) })
            : t('calculadora.overwrite.message')
        }
        confirmLabel={t('projects.save')}
        cancelLabel={t('projects.cancel')}
        onConfirm={doSave}
        onCancel={() => setShowOverwriteModal(false)}
        destructive={false}
      />

      <ConfirmationModal
        visible={showSavedModal}
        title={t('calculadora.saved.title')}
        confirmLabel={t('calculadora.saved.verProyecto')}
        cancelLabel={t('calculadora.saved.seguirCalculando')}
        onConfirm={handleVerProyecto}
        onCancel={handleSeguirCalculando}
      />

      <ProjectPickerModal
        visible={showProjectPicker}
        uid={user?.uid}
        onClose={() => { navigateAfterSaveRef.current = false; setShowProjectPicker(false); }}
        onSelect={handlePickProject}
        onCreateProject={() => {
          const calcData = {
            metrosEtiqueta: parseFloat(fields.metrosEtiqueta),
            gramosEtiqueta: parseFloat(fields.gramosEtiqueta),
            tension: parseFloat(fields.tension),
            tipoPunto: fields.tipoPunto,
            dimensiones: { ancho: parseFloat(fields.ancho), largo: parseFloat(fields.largo) },
            metrosTotales: result.metrosTotales,
            gramosTotales: result.gramosTotales,
            resultadoFinal: result.resultadoFinal,
            ovillosTotales: result.ovillosTotales,
          };
          setShowProjectPicker(false);
          savedResultRef.current = calcData;
          setSavedResult(calcData);
          showResultRef.current = false;
          setShowResult(false);
          navigation.navigate('Inicio', {
            screen: 'ProyectoFormScreen',
            params: {
              pendingResult: calcData,
              pendingResultType: 'calculadora',
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
        title={t('calculadora.backGuard.title')}
        message={t('calculadora.backGuard.message')}
        confirmLabel={t('calculadora.backGuard.keep')}
        cancelLabel={t('calculadora.backGuard.discard')}
        onConfirm={handleBackGuardKeep}
        onCancel={handleBackGuardDiscard}
      />

      <LoadingOverlay visible={loading} />
    </SafeAreaView>
  );
}

function FormField({ label, value, onChangeText, error, styles, colors }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, !!error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholderTextColor={colors.text.tertiary}
        accessibilityLabel={label}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function ResultCard({ label, value, valueColor, highlight, subtext, styles }) {
  return (
    <View style={[styles.resultCard, highlight && styles.resultCardHighlight]}>
      <Text style={[styles.resultLabel, highlight && styles.resultLabelHighlight]}>{label}</Text>
      <Text style={[styles.resultValue, { color: valueColor }, highlight && styles.resultValueHighlight]}>{value}</Text>
      {!!subtext && <Text style={styles.resultSubtext}>{subtext}</Text>}
    </View>
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
    marginBottom: spacing.xs,
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
    color: '#BA797D',
  },
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
  inputError: {
    borderColor: colors.status.errorText,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.status.errorText,
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
  pillTextSelected: {
    color: colors.card,
  },

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

  resultBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  resultCardHighlight: {
    backgroundColor: '#FFF0E8',
    borderWidth: 1,
    borderColor: colors.brand.burntCopper,
  },
  resultLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
  },
  resultLabelHighlight: {
    color: colors.brand.burntCopper,
  },
  resultValue: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xxl,
  },
  resultValueHighlight: {
    fontSize: fontSizes.xxxl,
  },
  resultSubtext: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  disclaimer: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },

  actionButtons: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  secondaryBtn: {
    backgroundColor: colors.button.secondary,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.card,
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
