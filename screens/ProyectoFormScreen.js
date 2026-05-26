import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  Calculator,
  Eye,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { calcularConsumo, MULTIPLICADORES } from '../services/calculadora';
import {
  TIPOS_PROYECTO,
  PATRONES_PUNTO,
  buildCanvasParams,
} from '../services/previsualización';
import { PALETTE, isLight } from '../constants/palette';
import {
  createProject as fsCreateProject,
  updateProject as fsUpdateProject,
  addArchivoProyecto,
  createDiario,
  saveResultadoCalculadora,
  saveResultadoPrevisualización,
} from '../services/firestore';
import { uploadArchivoProyecto } from '../services/storage';
import { useAuth } from '../hooks/useAuth';
import PreviewCanvas from '../components/PreviewCanvas';
import LoadingOverlay from '../components/LoadingOverlay';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';

// ── Constants ────────────────────────────────────────────────────────────────

const TAGS = ['WIP', 'PHD', 'FO', 'UFO', 'USO', 'YAP', 'TOAD'];
const STITCH_TYPES = Object.keys(MULTIPLICADORES);
const COPPER = '#CB6D51';
const PATTERN_OPTIONS = [
  { key: 'rayasV',        value: PATRONES_PUNTO.rayasV },
  { key: 'rayasH',        value: PATRONES_PUNTO.rayasH },
  { key: 'grannySquares', value: PATRONES_PUNTO.grannySquares },
];
const EMPTY_CALC = {
  metrosEtiqueta: '', gramosEtiqueta: '', ancho: '', largo: '', tension: '', tipoPunto: '',
};
const EMPTY_PREV = {
  dim1: '', dim2: '', colores: [], patronPunto: null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTagStyle(tag, colors) {
  return colors.tags[tag] || { bg: colors.primary.light, text: colors.primary.dark, border: colors.primary.DEFAULT };
}

function prefillCalcFromSaved(saved) {
  if (!saved) return EMPTY_CALC;
  return {
    metrosEtiqueta: saved.metrosEtiqueta != null ? String(saved.metrosEtiqueta) : '',
    gramosEtiqueta: saved.gramosEtiqueta != null ? String(saved.gramosEtiqueta) : '',
    ancho: saved.dimensiones?.ancho != null ? String(saved.dimensiones.ancho) : '',
    largo: saved.dimensiones?.largo != null ? String(saved.dimensiones.largo) : '',
    tension: saved.tension != null ? String(saved.tension) : '',
    tipoPunto: saved.tipoPunto ?? '',
  };
}

function prefillPrevFromSaved(saved) {
  if (!saved) return EMPTY_PREV;
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

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children, styles }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function FieldError({ message, styles }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

function NumericInput({ label, value, onChange, error, styles, colors }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, !!error && styles.inputError]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholderTextColor={colors.text.tertiary}
        accessibilityLabel={label}
      />
      <FieldError message={error} styles={styles} />
    </View>
  );
}

function ResultCard({ label, value, valueColor, highlight, styles }) {
  return (
    <View style={[styles.resultCard, highlight && styles.resultCardHighlight]}>
      <Text style={[styles.resultLabel, highlight && styles.resultLabelHighlight]}>{label}</Text>
      <Text style={[styles.resultValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function ToolSectionHeader({ icon: Icon, iconColor, iconBg, label, open, onToggle, actionLabel, onAction, done, doneLabel, doneColor, styles, colors }) {
  return (
    <TouchableOpacity style={styles.toolHeader} onPress={onToggle} activeOpacity={0.8}>
      <View style={[styles.toolIconWrap, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} strokeWidth={1.8} />
      </View>
      <Text style={styles.toolHeaderLabel}>{label}</Text>
      {done ? (
        <Text style={[styles.toolDoneLabel, { color: doneColor }]}>{doneLabel}</Text>
      ) : open ? (
        <ChevronUp size={18} color={colors.text.tertiary} strokeWidth={1.8} />
      ) : (
        <TouchableOpacity
          style={styles.toolActionBtn}
          onPress={(e) => { e.stopPropagation?.(); onAction(); }}
          activeOpacity={0.85}
        >
          <Text style={styles.toolActionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProyectoFormScreen({ route, navigation }) {
  const { theme: colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  const existingProject = route?.params?.project ?? null;
  const projectId = route?.params?.projectId ?? existingProject?.id ?? null;
  const isEdit = !!projectId;
  const pendingResult = route?.params?.pendingResult ?? null;
  const pendingResultType = route?.params?.pendingResultType ?? null;

  // ── Basic fields ────────────────────────────────────────────────────────────
  const [nombre, setNombre] = useState(existingProject?.nombre ?? '');
  const [etiqueta, setEtiqueta] = useState(existingProject?.etiqueta ?? 'WIP');
  const [descripcion, setDescripcion] = useState(existingProject?.descripcion ?? '');
  const [nombreError, setNombreError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);

  // ── Calculator state ────────────────────────────────────────────────────────
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcFields, setCalcFields] = useState(
    () => prefillCalcFromSaved(existingProject?.resultadoCalculadora ?? null),
  );
  const [calcErrors, setCalcErrors] = useState({});
  const [calcResult, setCalcResult] = useState(null);

  // ── Preview state ───────────────────────────────────────────────────────────
  const [prevOpen, setPrevOpen] = useState(false);
  const [prevFields, setPrevFields] = useState(
    () => prefillPrevFromSaved(existingProject?.resultadoPrevisualización ?? null),
  );
  const [prevErrors, setPrevErrors] = useState({});
  const [prevParams, setPrevParams] = useState(null);
  const [prevColorOrder, setPrevColorOrder] = useState([]);
  const [prevSquareSeed, setPrevSquareSeed] = useState(0);
  const [prevOriginalColors, setPrevOriginalColors] = useState([]);
  const [prevPaletteOpen, setPrevPaletteOpen] = useState(false);

  // ── Diario state ────────────────────────────────────────────────────────────
  const [diarioPending, setDiarioPending] = useState(false);

  // ── Global ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // ── Unsaved-changes guard (new project mode only) ────────────────────────────
  const [showExitGuard, setShowExitGuard] = useState(false);
  const [pendingRemoveAction, setPendingRemoveAction] = useState(null);
  const pendingTabRouteRef = useRef(null);
  const isSavingRef = useRef(false);

  const isDirty = useMemo(() => !isEdit && (
    nombre.trim() !== '' ||
    etiqueta !== 'WIP' ||
    descripcion.trim() !== '' ||
    pendingFile !== null ||
    calcResult !== null ||
    prevParams !== null ||
    diarioPending
  ), [isEdit, nombre, etiqueta, descripcion, pendingFile, calcResult, prevParams, diarioPending]);

  // Block back / stack-pop navigation
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty || isSavingRef.current) return;
      e.preventDefault();
      setPendingRemoveAction(e.data.action);
      setShowExitGuard(true);
    });
    return unsub;
  }, [navigation, isDirty]);

  // Block bottom-tab switches while dirty
  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;
    const unsub = parent.addListener('tabPress', (e) => {
      if (!isDirty) return;
      e.preventDefault();
      const state = parent.getState();
      const pressed = state.routes.find((r) => r.key === e.target);
      if (pressed) pendingTabRouteRef.current = pressed.name;
      setShowExitGuard(true);
    });
    return unsub;
  }, [navigation, isDirty]);

  function handleExitWithoutSaving() {
    setShowExitGuard(false);
    if (pendingRemoveAction) {
      const action = pendingRemoveAction;
      setPendingRemoveAction(null);
      navigation.dispatch(action);
    } else if (pendingTabRouteRef.current) {
      const route = pendingTabRouteRef.current;
      pendingTabRouteRef.current = null;
      navigation.navigate(route);
    }
  }

  function handleSaveFromGuard() {
    setShowExitGuard(false);
    setPendingRemoveAction(null);
    pendingTabRouteRef.current = null;
    handleSave();
  }

  function showToast(message, type = 'success') {
    setToast({ visible: true, message, type });
  }

  // ── File upload ─────────────────────────────────────────────────────────────
  function pickFile() {
    Alert.alert(t('projects.subirArchivo'), '', [
      {
        text: t('projects.tipoImagen'),
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
            allowsEditing: false,
          });
          if (!result.canceled && result.assets?.length > 0) {
            const asset = result.assets[0];
            setPendingFile({ uri: asset.uri, name: asset.fileName ?? `imagen_${Date.now()}.jpg`, isPdf: false });
          }
        },
      },
      {
        text: t('projects.tipoPDF'),
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true,
          });
          if (!result.canceled && result.assets?.length > 0) {
            const asset = result.assets[0];
            setPendingFile({ uri: asset.uri, name: asset.name, isPdf: true });
          }
        },
      },
      { text: t('projects.cancel'), style: 'cancel' },
    ]);
  }

  // ── Calculator ──────────────────────────────────────────────────────────────
  function setCalcField(key, value) {
    setCalcFields((prev) => ({ ...prev, [key]: value }));
    setCalcErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleCalcular() {
    const newErrors = {};
    for (const key of ['metrosEtiqueta', 'gramosEtiqueta', 'ancho', 'largo', 'tension']) {
      const val = parseFloat(calcFields[key]);
      if (!calcFields[key].trim()) newErrors[key] = t('calculadora.errors.required');
      else if (isNaN(val) || val <= 0) newErrors[key] = t('calculadora.errors.positiveNumber');
    }
    if (!calcFields.tipoPunto) newErrors.tipoPunto = t('calculadora.errors.required');
    if (Object.keys(newErrors).length > 0) { setCalcErrors(newErrors); return; }
    try {
      const res = calcularConsumo({
        metrosEtiqueta: parseFloat(calcFields.metrosEtiqueta),
        gramosEtiqueta: parseFloat(calcFields.gramosEtiqueta),
        tension: parseFloat(calcFields.tension),
        tipoPunto: calcFields.tipoPunto,
        dimensiones: { ancho: parseFloat(calcFields.ancho), largo: parseFloat(calcFields.largo) },
      });
      Keyboard.dismiss();
      setCalcResult(res);
      setCalcErrors({});
    } catch {
      setCalcErrors({ general: t('calculadora.errors.required') });
    }
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
  function setPrevField(key, value) {
    setPrevFields((prev) => ({ ...prev, [key]: value }));
    setPrevErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleColor(hex) {
    setPrevFields((prev) => {
      if (prev.colores.includes(hex)) return { ...prev, colores: prev.colores.filter((c) => c !== hex) };
      if (prev.colores.length >= 10) return prev;
      return { ...prev, colores: [...prev.colores, hex] };
    });
    setPrevErrors((prev) => ({ ...prev, colores: undefined }));
  }

  function handleGenerar() {
    try {
      const seed = Math.floor(Math.random() * 100000);
      const order = [...prevFields.colores];
      const p = buildCanvasParams({
        dim1: prevFields.dim1,
        dim2: prevFields.dim2,
        colores: order,
        patronPunto: prevFields.patronPunto,
        squareSeed: seed,
      });
      Keyboard.dismiss();
      setPrevColorOrder(order);
      setPrevOriginalColors(order);
      setPrevSquareSeed(seed);
      setPrevParams(p);
      setPrevErrors({});
      setPrevPaletteOpen(false);
    } catch (err) {
      if (err.message === 'validation') setPrevErrors(err.fields ?? {});
    }
  }

  function handlePrevAleatorizar() {
    const shuffled = [...prevColorOrder].sort(() => Math.random() - 0.5);
    const seed = Math.floor(Math.random() * 100000);
    setPrevColorOrder(shuffled);
    setPrevSquareSeed(seed);
    setPrevParams((p) => ({ ...p, colores: shuffled, squareSeed: seed }));
  }

  function handlePrevRestablecer() {
    setPrevColorOrder(prevOriginalColors);
    setPrevSquareSeed(0);
    setPrevParams((p) => ({ ...p, colores: prevOriginalColors, squareSeed: 0 }));
  }

  const canvasWidth = screenWidth - spacing.lg * 2 - spacing.md * 2;

  // ── Save ────────────────────────────────────────────────────────────────────
  function buildCalcData() {
    return {
      metrosEtiqueta: parseFloat(calcFields.metrosEtiqueta),
      gramosEtiqueta: parseFloat(calcFields.gramosEtiqueta),
      tension: parseFloat(calcFields.tension),
      tipoPunto: calcFields.tipoPunto,
      dimensiones: { ancho: parseFloat(calcFields.ancho), largo: parseFloat(calcFields.largo) },
      metrosTotales: calcResult.metrosTotales,
      gramosTotales: calcResult.gramosTotales,
      resultadoFinal: calcResult.resultadoFinal,
    };
  }

  async function handleSave() {
    if (!nombre.trim()) {
      setNombreError(t('projects.nombre') + ' ' + t('errors.required', { defaultValue: 'es obligatorio.' }));
      return;
    }
    setNombreError('');
    setLoading(true);
    isSavingRef.current = true;
    const uid = user?.uid;
    try {
      let targetId = projectId;
      if (isEdit) {
        await fsUpdateProject(projectId, { nombre: nombre.trim(), etiqueta, descripcion: descripcion.trim() });
      } else {
        const project = await fsCreateProject(uid, { nombre: nombre.trim(), etiqueta, descripcion: descripcion.trim() });
        targetId = project.id;
      }

      await Promise.all([
        pendingFile && uid
          ? uploadArchivoProyecto(uid, targetId, pendingFile).then(({ url, storagePath }) =>
              addArchivoProyecto(targetId, { url, storagePath, name: pendingFile.name, isPdf: pendingFile.isPdf }),
            )
          : null,
        calcResult ? saveResultadoCalculadora(targetId, buildCalcData()) : null,
        prevParams ? saveResultadoPrevisualización(targetId, prevParams) : null,
        pendingResultType === 'vista_previa' && pendingResult && !prevParams
          ? saveResultadoPrevisualización(targetId, pendingResult)
          : null,
        pendingResultType === 'calculadora' && pendingResult && !calcResult
          ? saveResultadoCalculadora(targetId, pendingResult)
          : null,
      ].filter(Boolean));

      if (diarioPending && uid) {
        await createDiario(uid, nombre.trim(), targetId, nombre.trim());
      }

      if (isEdit) {
        navigation.goBack();
      } else {
        navigation.replace('ProyectoDetalleScreen', {
          projectId: targetId,
          resultSavedBanner: !!pendingResult,
        });
      }
    } catch {
      isSavingRef.current = false;
      showToast(t('errors.googleToken', { defaultValue: 'Algo salió mal. Intenta de nuevo.' }), 'error');
      setLoading(false);
    }
  }

  const selectedTagStyle = getTagStyle(etiqueta, colors);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <ArrowLeft size={22} color={colors.brand.copperRed} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? '#BA797D' : '#5D2D24' }]}>
            {isEdit ? t('projects.editProject') : t('projects.newProject')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Nombre ── */}
          <View style={styles.section}>
            <SectionLabel styles={styles}>{t('projects.nombre')}</SectionLabel>
            <TextInput
              style={[styles.input, !!nombreError && styles.inputError]}
              value={nombre}
              onChangeText={(v) => { setNombre(v); setNombreError(''); }}
              placeholder={t('projects.nombrePlaceholder')}
              placeholderTextColor='#BA797D'
              maxLength={60}
              returnKeyType="next"
            />
            <FieldError message={nombreError} styles={styles} />
          </View>

          {/* ── Etiqueta ── */}
          <View style={styles.section}>
            <SectionLabel styles={styles}>{t('projects.etiqueta')}</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
              {TAGS.map((tag) => {
                const ts = getTagStyle(tag, colors);
                const selected = etiqueta === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, { borderColor: selected ? ts.border : colors.neutral.greige, backgroundColor: selected ? ts.bg : colors.card }]}
                    onPress={() => setEtiqueta(tag)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.tagChipText, { color: selected ? ts.text : colors.text.tertiary }]} maxFontSizeMultiplier={1.3}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={[styles.tagFullName, { color: selectedTagStyle.text }]}>
              {t(`projects.tags.${etiqueta}`)}
            </Text>
          </View>

          {/* ── Descripción ── */}
          <View style={styles.section}>
            <SectionLabel styles={styles}>{t('projects.descripcion')}</SectionLabel>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder={t('projects.descripcionPlaceholder')}
              placeholderTextColor='#BA797D'
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={400}
            />
          </View>

          {/* ── Archivo ── */}
          <View style={styles.section}>
            <SectionLabel styles={styles}>{t('projects.subirArchivo')}</SectionLabel>
            {pendingFile ? (
              <View style={styles.filePreview}>
                {!pendingFile.isPdf ? (
                  <Image source={{ uri: pendingFile.uri }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.pdfIcon}>
                    <FileText size={28} color={colors.primary.dark} strokeWidth={1.5} />
                  </View>
                )}
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={2}>{pendingFile.name}</Text>
                  <Text style={styles.fileType}>{pendingFile.isPdf ? t('projects.tipoPDF') : t('projects.tipoImagen')}</Text>
                </View>
                <TouchableOpacity onPress={() => setPendingFile(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color={colors.text.tertiary} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadZone} onPress={pickFile} activeOpacity={0.75}>
                <Upload size={24} color={colors.text.tertiary} strokeWidth={1.5} />
                <Text style={styles.uploadLabel}>{t('projects.subirArchivoLabel')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Herramientas de planificación ── */}
          <View style={styles.planifHeader}>
            <Text style={styles.planifTitle}>{t('projects.herramientasPlanif')}</Text>
            <Text style={styles.planifSubtitle}>{t('projects.herramientasPlanifSubtitle')}</Text>
          </View>

          {/* ── Calculadora ── */}
          <View style={styles.toolCard}>
            <ToolSectionHeader
              icon={Calculator}
              iconColor="#D47E30"
              iconBg="#FDE8D8"
              label={t('projectDetail.calculadora')}
              open={calcOpen}
              onToggle={() => setCalcOpen((v) => !v)}
              actionLabel={t('projects.calcularBtn')}
              onAction={() => setCalcOpen(true)}
              done={false}
              styles={styles}
              colors={colors}
            />
            {calcOpen && (
              <View style={styles.toolBody}>
                <NumericInput label={t('calculadora.metrosEtiqueta')} value={calcFields.metrosEtiqueta} onChange={(v) => setCalcField('metrosEtiqueta', v)} error={calcErrors.metrosEtiqueta} styles={styles} colors={colors} />
                <NumericInput label={t('calculadora.gramosEtiqueta')} value={calcFields.gramosEtiqueta} onChange={(v) => setCalcField('gramosEtiqueta', v)} error={calcErrors.gramosEtiqueta} styles={styles} colors={colors} />
                <NumericInput label={t('calculadora.ancho')} value={calcFields.ancho} onChange={(v) => setCalcField('ancho', v)} error={calcErrors.ancho} styles={styles} colors={colors} />
                <NumericInput label={t('calculadora.largo')} value={calcFields.largo} onChange={(v) => setCalcField('largo', v)} error={calcErrors.largo} styles={styles} colors={colors} />
                <NumericInput label={t('calculadora.tension')} value={calcFields.tension} onChange={(v) => setCalcField('tension', v)} error={calcErrors.tension} styles={styles} colors={colors} />

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('calculadora.tipoPunto')}</Text>
                  <View style={styles.pillRow}>
                    {STITCH_TYPES.map((key) => {
                      const selected = calcFields.tipoPunto === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[styles.pill, selected && styles.pillSelected]}
                          onPress={() => setCalcField('tipoPunto', key)}
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
                  <FieldError message={calcErrors.tipoPunto} styles={styles} />
                </View>

                {calcErrors.general && <Text style={styles.fieldError}>{calcErrors.general}</Text>}

                <TouchableOpacity style={styles.toolPrimaryBtn} onPress={handleCalcular} activeOpacity={0.85}>
                  <Text style={styles.toolPrimaryBtnText}>{t('calculadora.calcular')}</Text>
                </TouchableOpacity>

                {calcResult && (
                  <View style={styles.resultGroup}>
                    <ResultCard label={t('calculadora.result.metrosTotales')} value={`${Math.round(calcResult.metrosTotales)} m`} valueColor={colors.primary.dark} styles={styles} />
                    <ResultCard label={t('calculadora.result.gramosTotales')} value={`${Math.round(calcResult.gramosTotales)} g`} valueColor={colors.primary.DEFAULT} styles={styles} />
                    <ResultCard label={t('calculadora.result.resultadoFinal')} value={`${Math.round(calcResult.resultadoFinal)} g`} valueColor={colors.secondary.cinnamon} highlight styles={styles} />
                    <Text style={styles.disclaimer}>{t('calculadora.result.disclaimer')}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Previsualización ── */}
          <View style={styles.toolCard}>
            <ToolSectionHeader
              icon={Eye}
              iconColor="#7C6AAF"
              iconBg="#EDE5F8"
              label={t('projectDetail.previsualizacion')}
              open={prevOpen}
              onToggle={() => setPrevOpen((v) => !v)}
              actionLabel={t('projects.previsualizarBtn')}
              onAction={() => setPrevOpen(true)}
              done={false}
              styles={styles}
              colors={colors}
            />
            {prevOpen && (
              <View style={styles.toolBody}>

                {/* Selected colours preview row */}
                {prevFields.colores.length > 0 && (
                  <View style={styles.prevSelectedRow}>
                    {prevFields.colores.map((hex) => (
                      <TouchableOpacity
                        key={hex}
                        style={[styles.prevSelectedCircle, { backgroundColor: hex }, isLight(hex) && styles.prevSelectedCircleLight]}
                        onPress={() => toggleColor(hex)}
                        activeOpacity={0.8}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: true }}
                      >
                        <Check size={12} color={COPPER} strokeWidth={2.5} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Collapsible palette */}
                <View style={styles.fieldGroup}>
                  <View style={styles.prevPaletteHeaderRow}>
                    <Text style={styles.fieldLabel}>{t('vistaPrevia.coloresSection')}</Text>
                    <TouchableOpacity
                      style={styles.prevPaletteToggleBtn}
                      onPress={() => setPrevPaletteOpen((v) => !v)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.prevPaletteToggleText}>
                        {prevPaletteOpen ? t('vistaPrevia.cerrarPaleta') : t('vistaPrevia.elegirColores')}
                      </Text>
                      {prevPaletteOpen
                        ? <ChevronUp size={14} color={COPPER} strokeWidth={1.8} />
                        : <ChevronDown size={14} color={COPPER} strokeWidth={1.8} />}
                    </TouchableOpacity>
                  </View>
                  {!!prevErrors.colores && <Text style={styles.fieldError}>{t('vistaPrevia.errors.minColors')}</Text>}

                  {prevPaletteOpen && (
                    <View style={styles.prevPaletteGrid}>
                      {PALETTE.map(({ group, swatches }) => (
                        <View key={group} style={styles.prevPaletteGroup}>
                          <Text style={styles.prevGroupHeader}>{group}</Text>
                          <View style={styles.prevSwatchRow}>
                            {swatches.map(({ name, hex }) => {
                              const selected = prevFields.colores.includes(hex);
                              return (
                                <TouchableOpacity
                                  key={hex}
                                  style={[styles.prevSwatch, { backgroundColor: hex }, isLight(hex) && styles.prevSwatchLight]}
                                  onPress={() => toggleColor(hex)}
                                  activeOpacity={0.8}
                                  accessibilityLabel={name}
                                  accessibilityRole="checkbox"
                                  accessibilityState={{ checked: selected }}
                                >
                                  {selected && (
                                    <View style={styles.prevSwatchCheck}>
                                      <Check size={12} color={COPPER} strokeWidth={2.5} />
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Pattern cards */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('vistaPrevia.disenoSection')}</Text>
                  <View style={styles.prevPatternCards}>
                    {PATTERN_OPTIONS.map(({ key, value }) => {
                      const selected = prevFields.patronPunto === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          style={[styles.prevPatternCard, selected && styles.prevPatternCardSelected]}
                          onPress={() => setPrevField('patronPunto', value)}
                          activeOpacity={0.8}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                        >
                          <Text style={[styles.prevPatternLabel, selected && styles.prevPatternLabelSelected]}>
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
                      style={[styles.input, !!prevErrors.dim1 && styles.inputError]}
                      value={prevFields.dim1}
                      onChangeText={(v) => setPrevField('dim1', v)}
                      keyboardType="numeric"
                      placeholderTextColor={colors.text.tertiary}
                    />
                    {!!prevErrors.dim1 && <Text style={styles.fieldError}>{t('vistaPrevia.errors.dimensions')}</Text>}
                  </View>
                  <View style={[styles.fieldGroup, styles.dimField]}>
                    <Text style={styles.fieldLabel}>{t('vistaPrevia.largo')}</Text>
                    <TextInput
                      style={[styles.input, !!prevErrors.dim2 && styles.inputError]}
                      value={prevFields.dim2}
                      onChangeText={(v) => setPrevField('dim2', v)}
                      keyboardType="numeric"
                      placeholderTextColor={colors.text.tertiary}
                    />
                    {!!prevErrors.dim2 && <Text style={styles.fieldError}>{t('vistaPrevia.errors.dimensions')}</Text>}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.toolPrimaryBtn, (prevFields.colores.length < 2 || !prevFields.patronPunto) && styles.toolPrimaryBtnDisabled]}
                  onPress={handleGenerar}
                  activeOpacity={0.85}
                  disabled={prevFields.colores.length < 2 || !prevFields.patronPunto}
                >
                  <Text style={styles.toolPrimaryBtnText}>{t('vistaPrevia.generar')}</Text>
                </TouchableOpacity>

                {prevParams && (
                  <View style={styles.resultGroup}>
                    {/* Aleatorizar controls */}
                    <View style={styles.prevShuffleRow}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                        <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                          {prevColorOrder.map((hex, idx) => (
                            <View key={`${hex}-${idx}`} style={[styles.colourCircle, { backgroundColor: hex }, isLight(hex) && styles.colourCircleLight]} />
                          ))}
                        </View>
                      </ScrollView>
                      <TouchableOpacity style={styles.prevAleatorizarBtn} onPress={handlePrevAleatorizar} activeOpacity={0.8}>
                        <Text style={styles.prevAleatorizarText}>{t('vistaPrevia.aleatorizar')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handlePrevRestablecer} activeOpacity={0.8}>
                        <Text style={styles.prevRestablecerText}>{t('vistaPrevia.restablecer')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.canvasCard}>
                      <PreviewCanvas
                        medidas={prevParams.medidas}
                        colores={prevColorOrder}
                        patronPunto={prevParams.patronPunto}
                        squareSeed={prevSquareSeed}
                        cols={prevParams.cols}
                        rows={prevParams.rows}
                        width={canvasWidth}
                      />
                    </View>
                    <Text style={styles.prevDimensions}>{prevParams.medidas.ancho} × {prevParams.medidas.largo} cm</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Diario ── */}
          <View style={styles.toolCard}>
            <ToolSectionHeader
              icon={BookOpen}
              iconColor="#7DCEC4"
              iconBg="#D5EEF0"
              label={t('projectDetail.diario')}
              open={false}
              onToggle={() => {}}
              actionLabel={t('projects.crearDiarioBtn')}
              onAction={() => setDiarioPending(true)}
              done={diarioPending}
              doneLabel={t('projects.diarioCreado')}
              doneColor={colors.status.successText ?? colors.secondary.teal}
              styles={styles}
              colors={colors}
            />
          </View>
        </ScrollView>

        {/* Fixed footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>
              {isEdit ? t('projects.saveChanges') : t('projects.saveProject')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <LoadingOverlay visible={loading} />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((s) => ({ ...s, visible: false }))}
      />

      <ConfirmationModal
        visible={showExitGuard}
        title={t('projects.exitGuardTitle')}
        message={t('projects.exitGuardMessage')}
        confirmLabel={t('projects.exitGuardSave')}
        cancelLabel={t('projects.exitGuardDiscard')}
        onConfirm={handleSaveFromGuard}
        onCancel={handleExitWithoutSaving}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
  },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },

  // Basic field section
  section: { gap: spacing.xs },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#5D2D24',
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
  textarea: {
    minHeight: 80,
    paddingTop: spacing.sm,
  },
  inputError: { borderColor: colors.status.errorText },
  fieldError: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.status.errorText,
  },

  // Tag chips
  tagScroll: { gap: spacing.xs, paddingRight: spacing.xs },
  tagChip: {
    borderWidth: 1.5,
    borderRadius: radii.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tagChipText: { fontFamily: fonts.semiBold, fontSize: fontSizes.xs },
  tagFullName: { fontFamily: fonts.regular, fontSize: fontSizes.xs, marginTop: 2 },

  // File upload
  uploadZone: {
    borderWidth: 1.5,
    borderColor: colors.neutral.greige,
    borderStyle: 'dashed',
    borderRadius: radii.card,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
  },
  uploadLabel: { fontFamily: fonts.regular, fontSize: fontSizes.sm, color: colors.text.tertiary },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  thumb: { width: 56, height: 56, borderRadius: radii.small },
  pdfIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.small,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: { flex: 1, gap: 2 },
  fileName: { fontFamily: fonts.semiBold, fontSize: fontSizes.sm, color: colors.text.primary },
  fileType: { fontFamily: fonts.regular, fontSize: fontSizes.xs, color: colors.text.tertiary },

  // Herramientas de planificación header
  planifHeader: { gap: spacing.xs },
  planifTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: '#5D2D24',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  planifSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#5D2D24',
  },

  // Tool card
  toolCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    overflow: 'hidden',
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  toolIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolHeaderLabel: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#5D2D24',
  },
  toolActionBtn: {
    backgroundColor: colors.button.primary,
    borderRadius: radii.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  toolActionBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.card,
  },
  toolDoneLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
  },
  toolBody: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral.greige,
    padding: spacing.md,
    gap: spacing.md,
  },

  // Shared form elements inside tool body
  fieldGroup: { gap: spacing.xs },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#5D2D24',
  },
  pillRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.small,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    backgroundColor: colors.card,
  },
  pillSelected: { backgroundColor: colors.button.primary, borderColor: colors.button.primary },
  pillText: { fontFamily: fonts.semiBold, fontSize: fontSizes.sm, color: colors.text.secondary },
  pillTextSelected: { color: colors.card },

  toolPrimaryBtn: {
    backgroundColor: colors.button.primary,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toolPrimaryBtnDisabled: { opacity: 0.45 },
  toolPrimaryBtnText: { fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.card },

  // Calculator result cards
  resultGroup: { gap: spacing.sm },
  resultCard: {
    backgroundColor: colors.background,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  resultCardHighlight: { backgroundColor: '#FDF3E0', borderColor: colors.secondary.amber },
  resultLabel: { fontFamily: fonts.semiBold, fontSize: fontSizes.xs, color: colors.text.tertiary },
  resultLabelHighlight: { color: colors.secondary.cinnamon },
  resultValue: { fontFamily: fonts.extraBold, fontSize: fontSizes.xl },
  disclaimer: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Preview fields
  dimRow: { flexDirection: 'row', gap: spacing.sm },
  dimField: { flex: 1 },

  prevSelectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  prevSelectedCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#CB6D51',
  },
  prevSelectedCircleLight: { borderColor: '#9E9E9E' },

  prevPaletteHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prevPaletteToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prevPaletteToggleText: { fontFamily: fonts.semiBold, fontSize: fontSizes.xs, color: '#CB6D51' },

  prevPaletteGrid: { gap: spacing.xs, marginTop: spacing.xs },
  prevPaletteGroup: { gap: 4 },
  prevGroupHeader: {
    fontFamily: fonts.semiBold, fontSize: fontSizes.xs,
    color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.6,
  },
  prevSwatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  prevSwatch: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  prevSwatchLight: { borderWidth: 1, borderColor: colors.neutral.greige },
  prevSwatchCheck: { position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  prevPatternCards: { flexDirection: 'row', gap: spacing.xs },
  prevPatternCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: 4,
    borderRadius: radii.small, borderWidth: 1.5, borderColor: colors.neutral.greige,
    backgroundColor: colors.card,
  },
  prevPatternCardSelected: { borderColor: '#CB6D51', backgroundColor: colors.background },
  prevPatternLabel: { fontFamily: fonts.semiBold, fontSize: fontSizes.xs, color: colors.text.secondary, textAlign: 'center' },
  prevPatternLabelSelected: { color: '#CB6D51' },

  // Preview result
  canvasCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  prevDimensions: { fontFamily: fonts.semiBold, fontSize: fontSizes.sm, color: colors.primary.DEFAULT, textAlign: 'center' },
  colourCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral.greige },
  colourCircleLight: { borderColor: '#9E9E9E' },
  prevShuffleRow: { gap: spacing.xs },
  prevAleatorizarBtn: {
    borderRadius: radii.small, borderWidth: 1, borderColor: '#CB6D51',
    paddingHorizontal: spacing.sm, paddingVertical: 4, alignSelf: 'flex-start',
  },
  prevAleatorizarText: { fontFamily: fonts.semiBold, fontSize: fontSizes.xs, color: '#CB6D51' },
  prevRestablecerText: { fontFamily: fonts.regular, fontSize: fontSizes.xs, color: colors.text.tertiary, textDecorationLine: 'underline' },

  // Footer save button
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.greige,
  },
  saveBtn: {
    backgroundColor: colors.button.primary,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.card },
}); }
