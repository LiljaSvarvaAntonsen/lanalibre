import { useState, useMemo } from 'react';
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
  DIMENSIONES_POR_TIPO,
  buildCanvasParams,
} from '../services/previsualización';
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
import Toast from '../components/Toast';

// ── Constants ────────────────────────────────────────────────────────────────

const TAGS = ['WIP', 'PHD', 'FO', 'UFO', 'USO', 'YAP', 'TOAD'];
const STITCH_TYPES = Object.keys(MULTIPLICADORES);
const PRESET_PALETTE = [
  '#C17B4E', '#D4868A', '#7A9E7E', '#E8C9A0',
  '#8BB8A8', '#F5EEE0', '#8B6B5A', '#9AB89A',
];
const EMPTY_CALC = {
  metrosEtiqueta: '', gramosEtiqueta: '', ancho: '', largo: '', tension: '', tipoPunto: '',
};
const EMPTY_PREV = {
  tipoProyecto: '', dim1: '', dim2: '', colores: [], patronPunto: PATRONES_PUNTO.liso,
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
  const { theme: colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  const existingProject = route?.params?.project ?? null;
  const projectId = route?.params?.projectId ?? existingProject?.id ?? null;
  const isEdit = !!projectId;

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
  const [showTypePicker, setShowTypePicker] = useState(false);

  // ── Diario state ────────────────────────────────────────────────────────────
  const [diarioPending, setDiarioPending] = useState(false);

  // ── Global ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

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
      if (prev.colores.length >= 4) return prev;
      return { ...prev, colores: [...prev.colores, hex] };
    });
    setPrevErrors((prev) => ({ ...prev, colores: undefined }));
  }

  function handleGenerar() {
    try {
      const p = buildCanvasParams({
        tipoProyecto: prevFields.tipoProyecto,
        dim1: prevFields.dim1,
        dim2: prevFields.dim2,
        colores: prevFields.colores,
        patronPunto: prevFields.patronPunto,
      });
      Keyboard.dismiss();
      setPrevParams(p);
      setPrevErrors({});
    } catch (err) {
      if (err.message === 'validation') setPrevErrors(err.fields ?? {});
    }
  }

  const prevDimLabels = prevFields.tipoProyecto
    ? DIMENSIONES_POR_TIPO[prevFields.tipoProyecto]
    : { dim1: 'ancho', dim2: 'largo' };

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
    const uid = user?.uid;
    try {
      let targetId = projectId;
      if (isEdit) {
        await fsUpdateProject(projectId, { nombre: nombre.trim(), etiqueta, descripcion: descripcion.trim() });
      } else {
        const project = await fsCreateProject(uid, { nombre: nombre.trim(), etiqueta, descripcion: descripcion.trim() });
        targetId = project.id;
      }

      console.log('[form] pendingFile:', pendingFile);
      console.log('[form] uid:', uid, 'targetId:', targetId);

      await Promise.all([
        pendingFile && uid
          ? uid === 'dev-user'
            // dev-user: skip Storage, save local URI so file appears in dashboard
            ? (console.log('[form] dev-user — saving local URI directly'),
               addArchivoProyecto(targetId, { url: pendingFile.uri, storagePath: null, name: pendingFile.name, isPdf: pendingFile.isPdf }))
            : (console.log('[form] uploadArchivoProyecto called with uid:', uid, 'projectId:', targetId),
               uploadArchivoProyecto(uid, targetId, pendingFile).then(({ url, storagePath }) => {
                 console.log('[form] addArchivoProyecto called with:', { url, storagePath, name: pendingFile.name, isPdf: pendingFile.isPdf });
                 return addArchivoProyecto(targetId, { url, storagePath, name: pendingFile.name, isPdf: pendingFile.isPdf });
               }))
          : null,
        calcResult ? saveResultadoCalculadora(targetId, buildCalcData()) : null,
        prevParams ? saveResultadoPrevisualización(targetId, prevParams) : null,
      ].filter(Boolean));

      if (diarioPending && uid) {
        await createDiario(uid, nombre.trim(), targetId, nombre.trim());
      }

      if (isEdit) {
        navigation.goBack();
      } else {
        navigation.replace('ProyectoDetalleScreen', { projectId: targetId });
      }
    } catch {
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
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.primary.dark} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
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
              placeholderTextColor={colors.text.tertiary}
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
                    <Text style={[styles.tagChipText, { color: selected ? ts.text : colors.text.tertiary }]}>{tag}</Text>
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
              placeholderTextColor={colors.text.tertiary}
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
                {/* Tipo de proyecto */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('vistaPrevia.tipoProyecto')}</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.pickerRow, !!prevErrors.tipoProyecto && styles.inputError]}
                    onPress={() => setShowTypePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={prevFields.tipoProyecto ? styles.pickerValue : styles.pickerPlaceholder}>
                      {prevFields.tipoProyecto ? t(`vistaPrevia.tipos.${prevFields.tipoProyecto}`) : t('vistaPrevia.seleccionaTipo')}
                    </Text>
                    <ChevronDown size={18} color={colors.text.tertiary} strokeWidth={1.8} />
                  </TouchableOpacity>
                  {!!prevErrors.tipoProyecto && <Text style={styles.fieldError}>{t('vistaPrevia.errors.required')}</Text>}
                </View>

                {/* Dimensiones */}
                <View style={styles.dimRow}>
                  <View style={[styles.fieldGroup, styles.dimField]}>
                    <Text style={styles.fieldLabel}>{t(`vistaPrevia.${prevDimLabels.dim1}`)}</Text>
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
                    <Text style={styles.fieldLabel}>{t(`vistaPrevia.${prevDimLabels.dim2}`)}</Text>
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

                {/* Paleta de colores */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('vistaPrevia.paleta')}</Text>
                  <View style={styles.paletteGrid}>
                    {PRESET_PALETTE.map((hex) => {
                      const selected = prevFields.colores.includes(hex);
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
                  {!!prevErrors.colores && <Text style={styles.fieldError}>{t('vistaPrevia.errors.required')}</Text>}
                </View>

                {/* Patrón de puntos */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('vistaPrevia.patronPunto')}</Text>
                  <View style={styles.pillRow}>
                    {Object.entries(PATRONES_PUNTO).map(([key, value]) => {
                      const selected = prevFields.patronPunto === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          style={[styles.pill, selected && styles.pillSelected]}
                          onPress={() => setPrevField('patronPunto', value)}
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
                  style={[styles.toolPrimaryBtn, (!prevFields.tipoProyecto || prevFields.colores.length === 0) && styles.toolPrimaryBtnDisabled]}
                  onPress={handleGenerar}
                  activeOpacity={0.85}
                  disabled={!prevFields.tipoProyecto || prevFields.colores.length === 0}
                >
                  <Text style={styles.toolPrimaryBtnText}>{t('vistaPrevia.generar')}</Text>
                </TouchableOpacity>

                {prevParams && (
                  <View style={styles.resultGroup}>
                    <View style={styles.canvasCard}>
                      <PreviewCanvas
                        tipoProyecto={prevParams.tipoProyecto}
                        medidas={prevParams.medidas}
                        colores={prevParams.colores}
                        patronPunto={prevParams.patronPunto}
                        width={canvasWidth}
                      />
                    </View>
                    <Text style={styles.prevTypeName}>{t(`vistaPrevia.tipos.${prevParams.tipoProyecto}`)}</Text>
                    <Text style={styles.prevDimensions}>{Object.values(prevParams.medidas).join(' × ')} cm</Text>
                    <View style={styles.colourCircles}>
                      {prevParams.colores.map((hex) => (
                        <View key={hex} style={[styles.colourCircle, { backgroundColor: hex }]} />
                      ))}
                    </View>
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

      {/* Type picker modal */}
      <Modal visible={showTypePicker} transparent animationType="fade" statusBarTranslucent>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={styles.pickerSheet}>
            {TIPOS_PROYECTO.map((tipo, idx) => (
              <TouchableOpacity
                key={tipo}
                style={[styles.pickerItem, idx === TIPOS_PROYECTO.length - 1 && styles.pickerItemLast]}
                onPress={() => {
                  setPrevFields((prev) => ({ ...prev, tipoProyecto: tipo, dim1: '', dim2: '' }));
                  setPrevErrors((prev) => ({ ...prev, tipoProyecto: undefined, dim1: undefined, dim2: undefined }));
                  setShowTypePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerItemText, prevFields.tipoProyecto === tipo && styles.pickerItemTextSelected]}>
                  {t(`vistaPrevia.tipos.${tipo}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <LoadingOverlay visible={loading} />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((s) => ({ ...s, visible: false }))}
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
    color: colors.text.secondary,
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
    color: colors.neutral.greige,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  planifSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
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
    color: colors.primary.dark,
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
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerValue: { fontFamily: fonts.regular, fontSize: fontSizes.md, color: colors.text.primary },
  pickerPlaceholder: { fontFamily: fonts.regular, fontSize: fontSizes.md, color: colors.text.tertiary },
  dimRow: { flexDirection: 'row', gap: spacing.sm },
  dimField: { flex: 1 },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: 48, height: 48, borderRadius: radii.card, borderWidth: 2.5, borderColor: 'transparent' },
  swatchSelected: { borderColor: colors.secondary.amber },

  // Preview result
  canvasCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  prevTypeName: { fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.text.primary, textAlign: 'center' },
  prevDimensions: { fontFamily: fonts.semiBold, fontSize: fontSizes.sm, color: colors.primary.DEFAULT, textAlign: 'center' },
  colourCircles: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  colourCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral.greige },

  // Type picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  pickerSheet: { backgroundColor: colors.card, borderRadius: radii.modal, width: '100%', overflow: 'hidden' },
  pickerItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.greige,
  },
  pickerItemLast: { borderBottomWidth: 0 },
  pickerItemText: { fontFamily: fonts.regular, fontSize: fontSizes.md, color: colors.text.primary },
  pickerItemTextSelected: { fontFamily: fonts.bold, color: colors.primary.dark },

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
    backgroundColor: colors.button.save,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.card },
}); }
