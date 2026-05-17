import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus, X, ChevronRight } from 'lucide-react-native';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { useAuth } from '../hooks/useAuth';
import { createDiario, getDiarios, getActiveProjects } from '../services/firestore';
import LoadingOverlay from '../components/LoadingOverlay';

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function DiarioCard({ item, onPress }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.cardNombre} numberOfLines={1}>{item.nombre}</Text>
      {item.proyectoNombre ? (
        <Text style={styles.cardProyecto}>
          {t('diario.proyectoLink', { nombre: item.proyectoNombre })}
        </Text>
      ) : null}
      <Text style={styles.cardFecha}>{formatDate(item.fechaCreacion)}</Text>
    </TouchableOpacity>
  );
}

export default function DiarioScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [diarios, setDiarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // New diary modal state
  const [showModal, setShowModal] = useState(false);
  const [modalNombre, setModalNombre] = useState('');
  const [modalProyecto, setModalProyecto] = useState(null); // { id, nombre } | null
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Project picker state (sub-modal)
  const [showProyectoPicker, setShowProyectoPicker] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [loadingProyectos, setLoadingProyectos] = useState(false);

  // Params forwarded from calculator / preview "Añadir al diario"
  const resultadoCalculadora = route?.params?.resultadoCalculadora ?? null;
  const resultadoVistaPrevia = route?.params?.resultadoPrevisualización ?? null;

  const load = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoadError(null);
    setLoading(true);
    try {
      const data = await getDiarios(user.uid);
      setDiarios(data);
    } catch (err) {
      console.log('[DiarioScreen] getDiarios error:', err);
      setLoadError(err?.message ?? 'Error al cargar los diarios');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openDetalle(diarioId) {
    navigation.navigate('DiarioDetalleScreen', {
      diarioId,
      resultadoCalculadora,
      resultadoVistaPrevia,
    });
  }

  function openModal() {
    setModalNombre(`Diario ${diarios.length + 1}`);
    setModalProyecto(null);
    setCreateError(null);
    setShowModal(true);
  }

  async function handleCrear() {
    const nombre = modalNombre.trim();
    if (!nombre) return;
    if (!user?.uid) {
      setCreateError('Error de autenticación. Vuelve a la pantalla de inicio.');
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const { id } = await createDiario(
        user.uid,
        nombre,
        modalProyecto?.id ?? null,
        modalProyecto?.nombre ?? null,
      );
      setShowModal(false);
      openDetalle(id);
    } catch (err) {
      console.log('[DiarioScreen] createDiario error:', err);
      setCreateError(err?.message ?? 'Error al crear el diario');
    } finally {
      setCreating(false);
    }
  }

  async function openProyectoPicker() {
    if (!user?.uid) return;
    setShowProyectoPicker(true);
    setLoadingProyectos(true);
    try {
      const { projects } = await getActiveProjects(user.uid);
      setProyectos(projects);
    } finally {
      setLoadingProyectos(false);
    }
  }

  function selectProyecto(proyecto) {
    setModalProyecto({ id: proyecto.id, nombre: proyecto.nombre });
    setShowProyectoPicker(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('diario.title')}</Text>
      </View>

      <TouchableOpacity style={styles.newBtn} onPress={openModal} activeOpacity={0.85}>
        <Plus size={18} color={colors.card} strokeWidth={2.5} />
        <Text style={styles.newBtnLabel}>{t('diario.nuevoDiario')}</Text>
      </TouchableOpacity>

      <FlatList
        data={diarios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={diarios.length === 0 ? styles.emptyContainer : styles.listContent}
        renderItem={({ item }) => (
          <DiarioCard item={item} onPress={() => openDetalle(item.id)} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <BookOpen size={48} color={colors.neutral.tertiary} strokeWidth={1.5} />
              <Text style={styles.emptyText}>
                {loadError ?? t('diario.emptyState')}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Nuevo diario modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('diario.nuevoDiario')}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder={t('diario.nombrePlaceholder')}
              placeholderTextColor={colors.neutral.tertiary}
              value={modalNombre}
              onChangeText={setModalNombre}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCrear}
              selectTextOnFocus
            />

            {/* Optional project link */}
            {modalProyecto ? (
              <View style={styles.proyectoBadge}>
                <Text style={styles.proyectoBadgeText} numberOfLines={1}>
                  {t('diario.proyectoLink', { nombre: modalProyecto.nombre })}
                </Text>
                <TouchableOpacity
                  onPress={() => setModalProyecto(null)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <X size={14} color={colors.secondary.cinnamon} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.proyectoLink} onPress={openProyectoPicker} activeOpacity={0.7}>
                <Text style={styles.proyectoLinkLabel}>Vincular a proyecto (opcional)</Text>
                <ChevronRight size={16} color={colors.text.tertiary} strokeWidth={1.8} />
              </TouchableOpacity>
            )}

            {createError ? (
              <Text style={styles.createErrorText}>{createError}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelLabel}>{t('projects.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  (!modalNombre.trim() || creating) && styles.modalConfirmDisabled,
                ]}
                onPress={handleCrear}
                activeOpacity={0.85}
                disabled={!modalNombre.trim() || creating}
              >
                <Text style={styles.modalConfirmLabel}>{t('diario.crear')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Project picker modal */}
      <Modal
        visible={showProyectoPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProyectoPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowProyectoPicker(false)}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Seleccionar proyecto</Text>
            {loadingProyectos ? (
              <Text style={styles.pickerEmpty}>Cargando...</Text>
            ) : proyectos.length === 0 ? (
              <Text style={styles.pickerEmpty}>{t('projects.emptyActive')}</Text>
            ) : (
              <FlatList
                data={proyectos}
                keyExtractor={(p) => p.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => selectProyecto(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerItemLabel}>{item.nombre}</Text>
                  </TouchableOpacity>
                )}
                style={styles.pickerList}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <LoadingOverlay visible={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.text.primary,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary.cinnamon,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  newBtnLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.card,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  emptyContainer: { flex: 1, paddingHorizontal: spacing.lg },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl * 2,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  cardNombre: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
  cardProyecto: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.secondary.cinnamon,
  },
  cardFecha: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  // New diary modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.card,
    borderRadius: radii.modal,
    padding: spacing.lg,
    width: '100%',
    gap: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    borderRadius: radii.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
  proyectoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  proyectoLinkLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
  },
  proyectoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8D8',
    borderRadius: radii.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: spacing.xs,
  },
  proyectoBadgeText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.secondary.cinnamon,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalCancelLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.secondary,
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: colors.secondary.cinnamon,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalConfirmDisabled: { opacity: 0.5 },
  modalConfirmLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.card,
  },
  createErrorText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#C0392B',
    textAlign: 'center',
  },
  // Project picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    padding: spacing.lg,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  pickerList: { flexGrow: 0 },
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
