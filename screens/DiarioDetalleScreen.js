import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, Plus } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { getDiario, getEntradas, createEntrada } from '../services/firestore';
import LoadingOverlay from '../components/LoadingOverlay';
import Toast from '../components/Toast';

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function EntradaCard({ item, onPress, styles }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.cardNombre} numberOfLines={1}>{item.nombre}</Text>
      <Text style={styles.cardFecha}>
        {t('entrada.lastEdit', { date: formatDate(item.fechaModificacion) })}
      </Text>
    </TouchableOpacity>
  );
}

export default function DiarioDetalleScreen({ navigation, route }) {
  const { theme: colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { diarioId, resultadoCalculadora, resultadoVistaPrevia, previewImageUri } = route.params;
  // Store diarioId in a ref so it is never lost if route.params is overwritten by a navigate call
  const diarioIdRef = useRef(diarioId);

  const [diario, setDiario] = useState(null);
  const [entradas, setEntradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    if (route?.params?.pendingToast) {
      const { message, type } = route.params.pendingToast;
      setToast({ visible: true, message, type });
      navigation.setParams?.({ pendingToast: undefined });
    }
  }, [route?.params?.pendingToast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, e] = await Promise.all([getDiario(diarioIdRef.current), getEntradas(diarioIdRef.current)]);
      setDiario(d);
      setEntradas(e);
    } finally {
      setLoading(false);
    }
  }, []); // diarioIdRef is stable — no dependency needed

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openEntrada(entradaId) {
    navigation.navigate('EntradaDiarioScreen', {
      diarioId: diarioIdRef.current,
      entradaId,
      resultadoCalculadora,
      resultadoVistaPrevia,
      previewImageUri,
    });
  }

  async function handleNuevaEntrada() {
    if (creating) return;
    setCreating(true);
    try {
      const nombre = `Entrada ${entradas.length + 1}`;
      const { id } = await createEntrada(diarioIdRef.current, nombre);
      openEntrada(id);
    } finally {
      setCreating(false);
    }
  }

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
          {diario?.nombre ?? ''}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <TouchableOpacity
        style={styles.newBtn}
        onPress={handleNuevaEntrada}
        activeOpacity={0.85}
        disabled={creating}
      >
        <Plus size={18} color={colors.card} strokeWidth={2.5} />
        <Text style={styles.newBtnLabel}>{t('entrada.nuevaEntrada')}</Text>
      </TouchableOpacity>

      <FlatList
        data={entradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={entradas.length === 0 ? styles.emptyContainer : styles.listContent}
        renderItem={({ item }) => (
          <EntradaCard item={item} onPress={() => openEntrada(item.id)} styles={styles} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <BookOpen size={48} color={colors.neutral.tertiary} strokeWidth={1.5} />
              <Text style={styles.emptyText}>{t('entrada.emptyState')}</Text>
            </View>
          ) : null
        }
      />

      <LoadingOverlay visible={loading || creating} />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((s) => ({ ...s, visible: false }))}
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
  cardFecha: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
}); }
