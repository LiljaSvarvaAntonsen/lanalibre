import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, Calculator, Eye, BookOpen, ChevronRight } from 'lucide-react-native';
import ResultSummaryCard from '../components/ResultSummaryCard';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { useAuth } from '../hooks/useAuth';
import {
  getProject,
  getDiarioByProyecto,
  getDiarios,
  createDiario,
  updateDiario,
} from '../services/firestore';

function getTagStyle(tag) {
  return colors.tags[tag] || { bg: colors.primary.light, text: colors.primary.dark, border: colors.primary.DEFAULT };
}
import LoadingOverlay from '../components/LoadingOverlay';

function formatDate(timestamp) {
  if (!timestamp) return null;
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function getResultSummary(project, tool, linkedDiario) {
  if (tool === 'calculadora') {
    const r = project.resultadoCalculadora;
    return r?.gramosTotales != null ? `~${Math.round(r.gramosTotales)} g` : null;
  }
  if (tool === 'previsualizacion') {
    const r = project.resultadoPrevisualización;
    return r?.tipoProyecto ?? null;
  }
  if (tool === 'diario') {
    if (!linkedDiario) return null;
    if (linkedDiario.textoLibre) return linkedDiario.textoLibre.slice(0, 60).trim();
    if (linkedDiario.contadorFilas > 0) return `${linkedDiario.contadorFilas} filas`;
    return linkedDiario.nombre ?? null;
  }
  return null;
}

function ToolCard({ icon: Icon, label, summary, noResultText, iconColor, iconBg, onPress }) {
  return (
    <TouchableOpacity style={styles.toolCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.toolLeft}>
        <View style={[styles.toolIconWrap, { backgroundColor: iconBg }]}>
          <Icon size={20} color={iconColor} strokeWidth={1.8} />
        </View>
        <View style={styles.toolText}>
          <Text style={styles.toolLabel}>{label}</Text>
          <Text style={styles.toolSummary} numberOfLines={1}>
            {summary ?? noResultText}
          </Text>
        </View>
      </View>
      <ChevronRight size={20} color={colors.text.tertiary} strokeWidth={1.5} />
    </TouchableOpacity>
  );
}

export default function ProyectoDetalleScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { projectId } = route.params;
  const [project, setProject] = useState(null);
  const [linkedDiario, setLinkedDiario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDiarioSheet, setShowDiarioSheet] = useState(false);
  const [standaloneDiarios, setStandaloneDiarios] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [linking, setLinking] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    const [data, diario] = await Promise.all([
      getProject(projectId),
      getDiarioByProyecto(projectId),
    ]);
    setProject(data);
    setLinkedDiario(diario);
    setLoading(false);
  }, [projectId]);

  useFocusEffect(useCallback(() => { fetchProject(); }, [fetchProject]));

  async function handleNuevoDiario() {
    if (!project || !user?.uid) return;
    setShowDiarioSheet(false);
    const { id } = await createDiario(user.uid, project.nombre, projectId, project.nombre);
    navigation.navigate('DiarioDetalleScreen', { diarioId: id });
  }

  async function openVincularPicker() {
    if (!user?.uid) return;
    const all = await getDiarios(user.uid);
    setStandaloneDiarios(all.filter((d) => !d.proyectoId));
    setShowPicker(true);
  }

  async function handleVincular(diarioId) {
    if (!project) return;
    setLinking(true);
    await updateDiario(diarioId, { proyectoId: projectId, proyectoNombre: project.nombre });
    const updated = await getDiarioByProyecto(projectId);
    setLinkedDiario(updated);
    setLinking(false);
    setShowPicker(false);
    setShowDiarioSheet(false);
  }

  const dateLabel = project
    ? project.fechaModificacion
      ? t('projectDetail.modifiedOn', { date: formatDate(project.fechaModificacion) })
      : t('projectDetail.createdOn', { date: formatDate(project.fechaCreacion) })
    : '';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={colors.primary.dark} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {project?.nombre ?? ''}
        </Text>
        <TouchableOpacity
          onPress={() => project && navigation.navigate('ProyectoFormScreen', { project })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <Pencil size={20} color={colors.text.tertiary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.meta}>
          {project?.etiqueta ? (() => {
            const ts = getTagStyle(project.etiqueta);
            return (
              <View style={[styles.badge, { backgroundColor: ts.bg, borderColor: ts.border }]}>
                <Text style={[styles.badgeText, { color: ts.text }]}>{project.etiqueta}</Text>
              </View>
            );
          })() : null}
          <Text style={styles.date}>{dateLabel}</Text>
        </View>

        <View style={styles.cards}>
          {project?.resultadoCalculadora ? (
            <ResultSummaryCard
              icon={Calculator}
              label={t('projectDetail.calculadora')}
              keyValue={`~${Math.round(project.resultadoCalculadora.resultadoFinal)} g`}
              savedDate={project.resultadoCalculadora.fechaGuardado}
              iconColor={colors.secondary.cinnamon}
              iconBg="#FDE8D8"
              onPress={() => navigation.navigate('CalculadoraScreen', { projectId })}
            />
          ) : (
            <ToolCard
              icon={Calculator}
              label={t('projectDetail.calculadora')}
              summary={null}
              noResultText={t('projectDetail.noResult')}
              iconColor={colors.secondary.cinnamon}
              iconBg="#FDE8D8"
              onPress={() => navigation.navigate('CalculadoraScreen', { projectId })}
            />
          )}
          {project?.resultadoPrevisualización ? (
            <ResultSummaryCard
              icon={Eye}
              label={t('projectDetail.previsualizacion')}
              keyValue={project.resultadoPrevisualización.tipoProyecto}
              savedDate={project.resultadoPrevisualización.fechaGuardado}
              iconColor={colors.primary.dark}
              iconBg="#EDE5F8"
              onPress={() => navigation.navigate('VistaPreviaScreen', { projectId })}
            />
          ) : (
            <ToolCard
              icon={Eye}
              label={t('projectDetail.previsualizacion')}
              summary={null}
              noResultText={t('projectDetail.noResult')}
              iconColor={colors.primary.dark}
              iconBg="#EDE5F8"
              onPress={() => navigation.navigate('VistaPreviaScreen', { projectId })}
            />
          )}
          <ToolCard
            icon={BookOpen}
            label={t('projectDetail.diario')}
            summary={project ? getResultSummary(project, 'diario', linkedDiario) : null}
            noResultText={t('diario.sinDiario')}
            iconColor={colors.secondary.teal}
            iconBg="#D5EEF0"
            onPress={() => {
              if (linkedDiario) {
                navigation.navigate('DiarioDetalleScreen', { diarioId: linkedDiario.id });
              } else {
                setShowDiarioSheet(true);
              }
            }}
          />
        </View>
      </ScrollView>

      <LoadingOverlay visible={loading || linking} />

      {/* Diario link / create sheet */}
      <Modal visible={showDiarioSheet} transparent animationType="slide" onRequestClose={() => setShowDiarioSheet(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowDiarioSheet(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('diario.vinculoTitle')}</Text>
            <TouchableOpacity style={styles.sheetBtn} onPress={handleNuevoDiario} activeOpacity={0.8}>
              <Text style={styles.sheetBtnLabel}>{t('diario.vinculoNuevo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnOutline]} onPress={openVincularPicker} activeOpacity={0.8}>
              <Text style={styles.sheetBtnLabelOutline}>{t('diario.vinculoExistente')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Diario picker (link existing) */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('diario.vinculoExistente')}</Text>
            {standaloneDiarios.length === 0 ? (
              <Text style={styles.pickerEmpty}>{t('diario.emptyState')}</Text>
            ) : (
              standaloneDiarios.map((d) => (
                <TouchableOpacity key={d.id} style={styles.pickerItem} onPress={() => handleVincular(d.id)} activeOpacity={0.8}>
                  <Text style={styles.pickerItemLabel}>{d.nombre}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radii.small,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  cards: {
    gap: spacing.sm,
  },
  toolCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  toolText: {
    flex: 1,
    gap: 2,
  },
  toolLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
  toolSummary: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  // Diario link sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sheetBtn: {
    backgroundColor: colors.secondary.cinnamon,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  sheetBtnLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.card,
  },
  sheetBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.neutral.greige,
  },
  sheetBtnLabelOutline: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.secondary,
  },
  pickerEmpty: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  pickerItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.greige,
  },
  pickerItemLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
});
