import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  TextInput,
  Keyboard,
} from 'react-native';
import LazyImage from '../components/LazyImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  Pencil,
  Calculator,
  Eye,
  BookOpen,
  ChevronRight,
  FileText,
  Plus,
  CalendarDays,
  Check,
  Trash2,
} from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { useAuth } from '../hooks/useAuth';
import {
  getProject,
  getDiariosByProyecto,
  createDiario,
  updateDiario,
  addArchivoProyecto,
  getArchivosProyecto,
  deleteArchivoProyecto,
  softDeleteProject,
} from '../services/firestore';
import { uploadArchivoProyecto, deleteFile } from '../services/storage';
import LoadingOverlay from '../components/LoadingOverlay';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COPPER = '#CE702B';

function formatDateShort(timestamp) {
  if (!timestamp) return null;
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateLong(timestamp) {
  if (!timestamp) return null;
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function SectionHeader({ label, styles }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function ToolRow({ icon: Icon, toolName, hasResult, resultValue, resultDate, noResultText, iconColor, iconBg, accentColor, onPress, styles, colors }) {
  return (
    <TouchableOpacity style={styles.toolRow} onPress={onPress} activeOpacity={0.8}>
      {/* Left accent bar */}
      <View style={[styles.toolAccentBar, { backgroundColor: accentColor }]} />
      <View style={[styles.toolIconWrap, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} strokeWidth={1.8} />
      </View>
      <View style={styles.toolText}>
        {hasResult ? (
          <>
            <Text style={styles.toolResultValue}>{resultValue}</Text>
            <Text style={styles.toolNameLabel}>{toolName}</Text>
            {resultDate ? <Text style={styles.toolSummary}>{resultDate}</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.toolNameLabel}>{toolName}</Text>
            <Text style={[styles.toolSummary, styles.toolSummaryEmpty]}>{noResultText}</Text>
          </>
        )}
      </View>
      <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={1.5} />
    </TouchableOpacity>
  );
}

export default function ProyectoDetalleScreen({ navigation, route }) {
  const { theme: colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { projectId } = route.params;

  const [project, setProject] = useState(null);
  const [linkedDiarios, setLinkedDiarios] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProjectDeleteModal, setShowProjectDeleteModal] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [editingDiarioId, setEditingDiarioId] = useState(null);
  const [editingDiarioName, setEditingDiarioName] = useState('');
  const [showPdfShareModal, setShowPdfShareModal] = useState(false);
  const [pdfShareUrl, setPdfShareUrl] = useState('');

  function showToast(message, type = 'success') {
    setToast({ visible: true, message, type });
  }

  useEffect(() => {
    if (!route.params?.resultSavedBanner) return;
    showToast(t('projects.resultSavedBanner'));
    navigation.setParams({ resultSavedBanner: undefined });
  }, [route.params?.resultSavedBanner]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [data, diarios, files] = await Promise.all([
        getProject(projectId),
        getDiariosByProyecto(projectId, user?.uid),
        getArchivosProyecto(projectId),
      ]);
      setProject(data);
      setLinkedDiarios(diarios);
      setArchivos(files);
    } catch (err) {
      console.error('[ProyectoDetalle] fetchAll error:', err?.message ?? err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  async function handleNuevoDiario() {
    if (!project || !user?.uid) return;
    const { id } = await createDiario(user.uid, project.nombre, projectId, project.nombre);
    navigation.navigate('DiarioDetalleScreen', { diarioId: id });
  }

  async function saveDiarioName(diarioId, newName) {
    const trimmed = newName.trim();
    setEditingDiarioId(null);
    if (!trimmed) return;
    try {
      await updateDiario(diarioId, { nombre: trimmed });
      setLinkedDiarios((prev) => prev.map((d) => d.id === diarioId ? { ...d, nombre: trimmed } : d));
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  function promptUpload() {
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
            const name = asset.fileName ?? `imagen_${Date.now()}.jpg`;
            uploadFile({ uri: asset.uri, name, isPdf: false });
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
            uploadFile({ uri: asset.uri, name: asset.name, isPdf: true });
          }
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  async function uploadFile(file) {
    const uid = user?.uid;
    if (!uid) return;
    setUploading(true);
    try {
      const { url, storagePath } = await uploadArchivoProyecto(uid, projectId, file);
      await addArchivoProyecto(projectId, { url, storagePath, name: file.name, isPdf: file.isPdf });
      const files = await getArchivosProyecto(projectId);
      setArchivos(files);
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function confirmDeleteArchivo() {
    if (!deleteTarget) return;
    try {
      await deleteArchivoProyecto(projectId, deleteTarget.id);
      if (deleteTarget.storagePath) {
        await deleteFile(deleteTarget.storagePath).catch(() => {});
      }
      setArchivos((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      setDeleteTarget(null);
      setShowDeleteModal(false);
    }
  }

  async function handleDeleteProject() {
    setShowProjectDeleteModal(false);
    try {
      await softDeleteProject(projectId);
      navigation.navigate('ProyectosScreen', {
        pendingToast: { message: t('projects.deleteSuccessToast'), type: 'success' },
      });
    } catch (e) {
      console.error('[ProyectoDetalle] softDeleteProject error:', e);
      showToast(t('common.error'), 'error');
    }
  }

  async function openPdf(url) {
    try {
      if (url.startsWith('http')) {
        await WebBrowser.openBrowserAsync(url);
        return;
      }
      setPdfShareUrl(url);
      setShowPdfShareModal(true);
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  async function handlePdfShare() {
    setShowPdfShareModal(false);
    try {
      await Sharing.shareAsync(pdfShareUrl, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  const calcHasResult = !!project?.resultadoCalculadora;
  const calcResultValue = calcHasResult ? `~${Math.round(project.resultadoCalculadora.resultadoFinal)} g` : '';
  const calcResultDate = calcHasResult
    ? t('projectDetail.guardadoEl', { date: formatDateLong(project.resultadoCalculadora.fechaGuardado) })
    : null;

  const prevHasResult = !!project?.resultadoPrevisualización;
  const prevResultValue = prevHasResult
    ? t(`vistaPrevia.tipos.${project.resultadoPrevisualización.tipoProyecto}`)
    : '';
  const prevResultDate = prevHasResult
    ? t('projectDetail.guardadoEl', { date: formatDateLong(project.resultadoPrevisualización.fechaGuardado) })
    : null;

  const tagColors = project?.etiqueta ? (colors.tags[project.etiqueta] ?? colors.tags.WIP) : colors.tags.WIP;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={22} color={colors.brand.copperRed} strokeWidth={1.8} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowProjectDeleteModal(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('projects.deleteTitle')}
        >
          <Trash2 size={20} color={colors.status.errorText} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Header card ─────────────────────────────────────────────────────── */}
        <View style={styles.headerCard}>
          {/* Copper left accent bar */}
          <View style={styles.headerCardAccent} />
          <View style={styles.headerCardContent}>
            <View style={styles.headerCardTop}>
              <Text style={styles.projectName} numberOfLines={3}>{project?.nombre ?? ''}</Text>
              <TouchableOpacity
                onPress={() => project && navigation.navigate('ProyectoFormScreen', { project })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.edit')}
              >
                <Pencil size={20} color={colors.text.tertiary} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>

            {project?.etiqueta && (
              <View style={[styles.badge, { backgroundColor: tagColors.bg, borderWidth: 1, borderColor: tagColors.border }]}>
                <Text style={[styles.badgeText, { color: tagColors.text }]} maxFontSizeMultiplier={1.3}>{project.etiqueta}</Text>
              </View>
            )}

            {project?.fechaCreacion ? (
              <View style={styles.dateRow}>
                <CalendarDays size={13} color={colors.text.tertiary} strokeWidth={1.5} />
                <Text style={styles.metaDate}>
                  {t('projectDetail.createdOn', { date: formatDateShort(project.fechaCreacion) })}
                </Text>
              </View>
            ) : null}

            <View style={styles.descDivider} />

            <Text style={[styles.description, !project?.descripcion && styles.descriptionEmpty]}>
              {project?.descripcion || t('projectDetail.sinDescripcion')}
            </Text>
          </View>
        </View>

        {/* ── Herramientas ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader label={t('projectDetail.herramientas')} styles={styles} />
          <View style={styles.cardGroup}>
            <ToolRow
              icon={Calculator}
              toolName={t('projectDetail.calculadora')}
              hasResult={calcHasResult}
              resultValue={calcResultValue}
              resultDate={calcResultDate}
              noResultText={t('projectDetail.noResult')}
              iconColor={colors.secondary.cinnamon}
              iconBg="#FDE8D8"
              accentColor={colors.primary.dark}
              onPress={() => navigation.navigate('CalculadoraScreen', { projectId })}
              styles={styles}
              colors={colors}
            />
            <View style={styles.divider} />
            <ToolRow
              icon={Eye}
              toolName={t('projectDetail.previsualizacion')}
              hasResult={prevHasResult}
              resultValue={prevResultValue}
              resultDate={prevResultDate}
              noResultText={t('projectDetail.noResult')}
              iconColor={colors.primary.dark}
              iconBg="#EDE5F8"
              accentColor={colors.secondary.amberDark}
              onPress={() => navigation.navigate('VistaPreviaScreen', { projectId })}
              styles={styles}
              colors={colors}
            />
          </View>
        </View>

        {/* ── Diarios vinculados ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader label={t('projectDetail.diariosVinculados')} styles={styles} />
          <View style={styles.cardGroup}>
            {linkedDiarios.length === 0 ? (
              <Text style={styles.emptyText}>{t('projectDetail.sinDiarios')}</Text>
            ) : (
              linkedDiarios.map((d, idx) => (
                <View key={d.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  {editingDiarioId === d.id ? (
                    <View style={[styles.diarioRow, styles.diarioRowEdit]}>
                      {/* Olive accent bar */}
                      <View style={[styles.toolAccentBar, { backgroundColor: colors.secondary.olive }]} />
                      <View style={[styles.toolIconWrap, { backgroundColor: '#D5EEF0' }]}>
                        <BookOpen size={18} color={colors.secondary.teal} strokeWidth={1.8} />
                      </View>
                      <TextInput
                        style={styles.diarioNameInput}
                        value={editingDiarioName}
                        onChangeText={setEditingDiarioName}
                        onBlur={() => saveDiarioName(d.id, editingDiarioName)}
                        onSubmitEditing={() => Keyboard.dismiss()}
                        autoFocus
                        returnKeyType="done"
                        maxLength={80}
                        placeholderTextColor={colors.text.tertiary}
                      />
                      <TouchableOpacity
                        onPress={() => Keyboard.dismiss()}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Check size={18} color={colors.secondary.teal} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.diarioRow}>
                      {/* Olive accent bar */}
                      <View style={[styles.toolAccentBar, { backgroundColor: colors.secondary.olive }]} />
                      <TouchableOpacity
                        style={styles.diarioRowNav}
                        onPress={() => navigation.navigate('DiarioDetalleScreen', { diarioId: d.id })}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.toolIconWrap, { backgroundColor: '#D5EEF0' }]}>
                          <BookOpen size={18} color={colors.secondary.teal} strokeWidth={1.8} />
                        </View>
                        <View style={styles.toolText}>
                          <Text style={styles.toolLabel}>{d.nombre}</Text>
                          {d.fechaActualizacion ? (
                            <Text style={styles.toolSummary}>{formatDateLong(d.fechaActualizacion)}</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.diarioPencilBtn}
                        onPress={() => { setEditingDiarioId(d.id); setEditingDiarioName(d.nombre); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.edit')}
                      >
                        <Pencil size={16} color={colors.text.tertiary} strokeWidth={1.8} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
          <TouchableOpacity style={styles.outlineBtn} onPress={handleNuevoDiario} activeOpacity={0.8}>
            <Plus size={16} color='#BA797D' strokeWidth={2} />
            <Text style={styles.outlineBtnText}>{t('projectDetail.nuevoDiario')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Archivos ─────────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader label={t('projectDetail.archivos')} styles={styles} />
          {archivos.length === 0 ? (
            <Text style={[styles.emptyText, { marginBottom: spacing.xs }]}>{t('projectDetail.sinArchivos')}</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.archivosRow}
            >
              {archivos.map((archivo) => (
                <TouchableOpacity
                  key={archivo.id}
                  style={styles.archivoThumb}
                  onPress={() => {
                    if (archivo.isPdf) openPdf(archivo.url);
                    else setFullscreenImage(archivo.url);
                  }}
                  onLongPress={() => { setDeleteTarget(archivo); setShowDeleteModal(true); }}
                  activeOpacity={0.85}
                >
                  {archivo.isPdf ? (
                    <View style={styles.pdfThumb}>
                      <FileText size={28} color={COPPER} strokeWidth={1.5} />
                      <Text style={styles.pdfName} numberOfLines={2}>{archivo.name}</Text>
                    </View>
                  ) : (
                    <LazyImage
                      source={{ uri: archivo.url }}
                      style={styles.imageThumb}
                      resizeMode="cover"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.uploadBtn} onPress={promptUpload} activeOpacity={0.8}>
            <Plus size={16} color={COPPER} strokeWidth={2} />
            <Text style={styles.uploadBtnText}>{t('projectDetail.subirArchivo')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <LoadingOverlay visible={loading || uploading} />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((s) => ({ ...s, visible: false }))}
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title={t('projectDetail.eliminarArchivo')}
        message={t('projectDetail.eliminarArchivoMsg')}
        confirmLabel={t('perfil.eliminarConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={confirmDeleteArchivo}
        onCancel={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
      />

      <Modal
        visible={!!fullscreenImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
        style={{ backgroundColor: colors.background }}
      >
        <TouchableOpacity
          style={styles.imageModal}
          activeOpacity={1}
          onPress={() => setFullscreenImage(null)}
        >
          {fullscreenImage && (
            <LazyImage
              source={{ uri: fullscreenImage }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      <ConfirmationModal
        visible={showProjectDeleteModal}
        title={t('projects.deleteTitle')}
        message={t('projects.deleteMessage')}
        confirmLabel={t('projects.deleteConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleDeleteProject}
        onCancel={() => setShowProjectDeleteModal(false)}
      />

      <ConfirmationModal
        visible={showPdfShareModal}
        title={t('projectDetail.pdfShare')}
        message={t('projectDetail.pdfExpoGoMessage')}
        confirmLabel={t('projectDetail.pdfShare')}
        cancelLabel={t('common.cancel')}
        onConfirm={handlePdfShare}
        onCancel={() => setShowPdfShareModal(false)}
      />

    </SafeAreaView>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.xl,
  },

  // Header card — copper left accent + spacious content
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  headerCardAccent: {
    width: 4,
    backgroundColor: COPPER,
  },
  headerCardContent: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  projectName: {
    flex: 1,
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xxl,
    color: '#5D2D24',
    lineHeight: fontSizes.xxl * 1.25,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: COPPER,
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaDate: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#BA797D',
  },
  descDivider: {
    height: 1,
    backgroundColor: colors.neutral.greige,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#5D2D24',
    lineHeight: fontSizes.sm * 1.5,
  },
  descriptionEmpty: {
    color: '#BA797D',
    fontStyle: 'italic',
  },

  // Sections
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: '#5D2D24',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardGroup: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.greige,
    marginHorizontal: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  // Tool rows — result is the hero, left accent bar via absolute position
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  toolAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  toolIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: {
    flex: 1,
    gap: 2,
  },
  toolResultValue: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: '#5D2D24',
  },
  toolNameLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
  },
  toolSummary: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#BA797D',
  },
  toolSummaryEmpty: {
    fontStyle: 'italic',
  },

  // Diario rows
  diarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  diarioRowEdit: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  diarioRowNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  diarioPencilBtn: {
    paddingLeft: spacing.xs,
  },
  toolLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.primary,
  },
  diarioNameInput: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.primary,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary.DEFAULT,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },

  // Outline button ("Nuevo diario")
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#BA797D',
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
  },
  outlineBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#BA797D',
  },

  // Archivos
  archivosRow: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  archivoThumb: {
    width: 88,
    height: 88,
    borderRadius: radii.card,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COPPER,
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  pdfThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    gap: 4,
  },
  pdfName: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: COPPER,
    borderStyle: 'dashed',
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
  },
  uploadBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#5D2D24',
  },

  // Fullscreen image modal
  imageModal: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); }
