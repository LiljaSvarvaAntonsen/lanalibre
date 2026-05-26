import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Plus, Info, Search, X, ArrowLeft } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { useAuth } from '../hooks/useAuth';
import { useProjects } from '../hooks/useProjects';
import ProjectCard from '../components/ProjectCard';
import ConfirmationModal from '../components/ConfirmationModal';
import TagLegendModal from '../components/TagLegendModal';
import LoadingOverlay from '../components/LoadingOverlay';
import Toast from '../components/Toast';

export default function ProyectosScreen({ navigation, route }) {
  const { theme: colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProjects, recentProjects, deletedProjects, loading, hasMore, loadMore, refresh, softDelete, restore } =
    useProjects(user?.uid);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    if (route?.params?.pendingToast) {
      const { message, type } = route.params.pendingToast;
      setToast({ visible: true, message, type });
      navigation.setParams?.({ pendingToast: undefined });
    }
  }, [route?.params?.pendingToast]);

  const recentMode = route?.params?.filter === 'recent';
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [legendVisible, setLegendVisible] = useState(false);
  const [confirm, setConfirm] = useState({ visible: false, type: null, projectId: null });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [actionLoading, setActionLoading] = useState(false);

  const source = activeTab === 'active'
    ? (recentMode ? recentProjects : activeProjects)
    : deletedProjects;

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return source;
    const q = searchQuery.trim().toLowerCase();
    return source.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [source, searchQuery]);

  function showToast(message, type = 'success') {
    setToast({ visible: true, message, type });
  }

  function openDeleteConfirm(projectId) {
    setConfirm({ visible: true, type: 'delete', projectId });
  }

  function openRestoreConfirm(projectId) {
    setConfirm({ visible: true, type: 'restore', projectId });
  }

  function closeConfirm() {
    setConfirm({ visible: false, type: null, projectId: null });
  }

  async function handleConfirm() {
    const { type, projectId } = confirm;
    closeConfirm();
    setActionLoading(true);
    try {
      if (type === 'delete') {
        await softDelete(projectId);
        showToast(t('projects.deleteSuccessToast'));
      } else {
        await restore(projectId);
        showToast(t('projects.restoreSuccessToast'));
      }
    } catch (e) {
      console.error('[ProyectosScreen] handleConfirm error:', e);
      showToast(t('errors.googleToken', { defaultValue: 'Algo salió mal.' }), 'error');
    } finally {
      setActionLoading(false);
    }
  }

  const handleEndReached = useCallback(() => {
    if (!searchQuery && hasMore) loadMore();
  }, [searchQuery, hasMore, loadMore]);

  function switchToDeleted() {
    setActiveTab('deleted');
    setSearchQuery('');
  }

  function renderEmpty() {
    const hasQuery = searchQuery.trim().length > 0;
    if (hasQuery && activeTab === 'active') {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('projects.searchEmptyActive')}</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={switchToDeleted} activeOpacity={0.8}>
            <Text style={styles.emptyBtnText}>{t('projects.searchEmptyActiveButton')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (hasQuery && activeTab === 'deleted') {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('projects.searchEmptyDeleted')}</Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          {activeTab === 'active' ? t('projects.emptyActive') : t('projects.emptyDeleted')}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={colors.brand.copperRed} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: isDark ? '#BA797D' : '#5D2D24' }]}>
          {activeTab === 'active'
            ? (recentMode ? t('projects.tabRecent') : t('projects.tabActive'))
            : t('projects.tabDeleted')}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setLegendVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('projects.tagLegendTitle')}
          >
            <Info size={22} color='#CB6D51' strokeWidth={1.5} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProyectoFormScreen')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('projects.newProject')}
          >
            <Plus size={24} color='#CB6D51' strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['active', 'deleted'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { setActiveTab(tab); setSearchQuery(''); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]} maxFontSizeMultiplier={1.3}>
              {tab === 'active'
                ? (recentMode ? t('projects.tabRecent') : t('projects.tabActive'))
                : t('projects.tabDeleted')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Search size={16} color={colors.text.tertiary} strokeWidth={1.8} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('projects.searchPlaceholder')}
          placeholderTextColor={colors.text.tertiary}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {!!searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={colors.text.tertiary} strokeWidth={1.8} />
          </TouchableOpacity>
        )}
      </View>

      {/* 30-day banner */}
      {activeTab === 'deleted' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{t('projects.deletedBanner')}</Text>
        </View>
      )}

      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            isDeleted={activeTab === 'deleted'}
            onDelete={() => openDeleteConfirm(item.id)}
            onRestore={() => openRestoreConfirm(item.id)}
            onPress={() => navigation.navigate('ProyectoDetalleScreen', { projectId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />

      <LoadingOverlay visible={loading || actionLoading} />

      <ConfirmationModal
        visible={confirm.visible}
        title={t(confirm.type === 'delete' ? 'projects.deleteTitle' : 'projects.restoreTitle')}
        message={t(confirm.type === 'delete' ? 'projects.deleteMessage' : 'projects.restoreMessage')}
        confirmLabel={confirm.type === 'delete' ? t('projects.deleteConfirm') : t('projects.restoreConfirm')}
        cancelLabel={t('projects.cancel')}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        destructive={confirm.type === 'delete'}
      />

      <TagLegendModal visible={legendVisible} onClose={() => setLegendVisible(false)} />

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
  },
  screenTitle: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  tab: {
    paddingBottom: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#CB6D51',
  },
  tabLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
  },
  tabLabelActive: {
    color: '#CB6D51',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.small,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.primary,
    paddingVertical: 2,
  },
  banner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.status.warning,
    borderRadius: radii.small,
    padding: spacing.sm,
  },
  bannerText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.primary,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: colors.button.primary,
    borderRadius: radii.small,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.card,
  },
}); }
