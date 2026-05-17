import { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check } from 'lucide-react-native';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { calcularConsumo, MULTIPLICADORES } from '../services/calculadora';
import { saveResultadoCalculadora, getResultadoCalculadora } from '../services/firestore';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingOverlay from '../components/LoadingOverlay';

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
  const { t } = useTranslation();
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
      setResult(res);
      setShowResult(true);
    } catch {
      setErrors({ general: t('calculadora.errors.required') });
    }
  }

  function handleGuardar() {
    if (savedResult) {
      setShowOverwriteModal(true);
    } else {
      doSave();
    }
  }

  async function doSave() {
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
    };
    try {
      await saveResultadoCalculadora(projectId, data);
      setSavedResult(data);
      setShowSavedModal(true);
    } catch {
      // leave in result view; user can retry
    } finally {
      setLoading(false);
    }
  }

  function handleAddToJournal() {
    navigation.navigate('DiarioScreen', { projectId, resultadoCalculadora: result });
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

  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity
              onPress={showResult ? () => setShowResult(false) : () => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
            >
              <ArrowLeft size={22} color={colors.primary.dark} strokeWidth={1.8} />
            </TouchableOpacity>
          ) : showResult ? (
            <TouchableOpacity
              onPress={() => setShowResult(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
            >
              <ArrowLeft size={22} color={colors.primary.dark} strokeWidth={1.8} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerPlaceholder} />
          )}
          <Text style={styles.headerTitle}>{t('calculadora.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {!showResult ? (
          <ScrollView
            contentContainerStyle={styles.formBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!isProjectMode && (
              <Text style={styles.freeModeLabel}>{t('calculadora.freeMode')}</Text>
            )}

            <FormField
              label={t('calculadora.metrosEtiqueta')}
              value={fields.metrosEtiqueta}
              onChangeText={(v) => setField('metrosEtiqueta', v)}
              error={errors.metrosEtiqueta}
            />
            <FormField
              label={t('calculadora.gramosEtiqueta')}
              value={fields.gramosEtiqueta}
              onChangeText={(v) => setField('gramosEtiqueta', v)}
              error={errors.gramosEtiqueta}
            />
            <FormField
              label={t('calculadora.ancho')}
              value={fields.ancho}
              onChangeText={(v) => setField('ancho', v)}
              error={errors.ancho}
            />
            <FormField
              label={t('calculadora.largo')}
              value={fields.largo}
              onChangeText={(v) => setField('largo', v)}
              error={errors.largo}
            />
            <FormField
              label={t('calculadora.tension')}
              value={fields.tension}
              onChangeText={(v) => setField('tension', v)}
              error={errors.tension}
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
            showsVerticalScrollIndicator={false}
          >
            <ResultCard
              label={t('calculadora.result.metrosTotales')}
              value={`${Math.round(result.metrosTotales)} m`}
              valueColor={colors.primary.dark}
            />
            <ResultCard
              label={t('calculadora.result.gramosTotales')}
              value={`${Math.round(result.gramosTotales)} g`}
              valueColor={colors.primary.DEFAULT}
            />
            <ResultCard
              label={t('calculadora.result.resultadoFinal')}
              value={`${Math.round(result.resultadoFinal)} g`}
              valueColor={colors.secondary.cinnamon}
              highlight
            />

            <Text style={styles.disclaimer}>{t('calculadora.result.disclaimer')}</Text>

            <View style={styles.actionButtons}>
              {isProjectMode && (
                <>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleGuardar}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryBtnText}>{t('calculadora.guardarProyecto')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.journalBtn}
                    onPress={handleAddToJournal}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.journalBtnText}>{t('calculadora.addToJournal')}</Text>
                  </TouchableOpacity>
                </>
              )}

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
        message={t('calculadora.overwrite.message')}
        confirmLabel={t('projects.save')}
        cancelLabel={t('projects.cancel')}
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
            <Text style={styles.savedTitle}>{t('calculadora.saved.title')}</Text>
            <View style={styles.savedButtons}>
              <TouchableOpacity
                style={[styles.savedBtn, styles.savedBtnPrimary]}
                onPress={handleVerProyecto}
                activeOpacity={0.85}
              >
                <Text style={styles.savedBtnPrimaryText}>{t('calculadora.saved.verProyecto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savedBtn, styles.savedBtnOutline]}
                onPress={handleSeguirCalculando}
                activeOpacity={0.8}
              >
                <Text style={styles.savedBtnOutlineText}>{t('calculadora.saved.seguirCalculando')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LoadingOverlay visible={loading} />
    </SafeAreaView>
  );
}

function FormField({ label, value, onChangeText, error }) {
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

function ResultCard({ label, value, valueColor, highlight }) {
  return (
    <View style={[styles.resultCard, highlight && styles.resultCardHighlight]}>
      <Text style={[styles.resultLabel, highlight && styles.resultLabelHighlight]}>{label}</Text>
      <Text style={[styles.resultValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.primary.dark,
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
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  resultCardHighlight: {
    backgroundColor: '#FDF3E0',
    borderColor: colors.secondary.amber,
  },
  resultLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
  },
  resultLabelHighlight: {
    color: colors.secondary.cinnamon,
  },
  resultValue: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xxl,
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
  savedBtnPrimary: {
    backgroundColor: colors.button.primary,
  },
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
});
