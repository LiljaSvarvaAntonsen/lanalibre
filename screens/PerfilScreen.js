import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import LazyImage from '../components/LazyImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Pencil, Moon, Sun, Bell, Download, Trash2, ChevronRight, Check } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { useAuth } from '../hooks/useAuth';
import { getUserDocument, saveUserSettings, updateUserDocument } from '../services/firestore';
import { deleteAccount } from '../services/auth';
import { uploadProfilePhoto } from '../services/storage';
import { exportUserData, EXPORT_UNAVAILABLE_IN_EXPO_GO } from '../services/exportData';
import { formatShortDate } from '../utils/dates';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingOverlay from '../components/LoadingOverlay';
import Toast from '../components/Toast';
import DocViewerModal from '../components/DocViewerModal';
import { getLegalContent } from '../constants/legalContent';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'nb', label: 'Norsk (Bokmål)' },
];

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// ── PerfilScreen ──────────────────────────────────────────────────────────────

export default function PerfilScreen({ navigation }) {
  const { theme: colors, isDark, toggleTheme, notifEnabled, setNotifEnabled } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const uid = user?.uid;

  const [nombre, setNombre] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [fechaRegistro, setFechaRegistro] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') =>
    setToast({ visible: true, message, type });

  useEffect(() => {
    if (!uid) return;
    getUserDocument(uid)
      .then((doc) => {
        if (!doc) return;
        if (doc.nombre) setNombre(doc.nombre);
        if (doc.fotoPerfil) setFotoPerfil(doc.fotoPerfil);
        if (doc.fechaRegistro) setFechaRegistro(doc.fechaRegistro);
      })
      .catch(() => {});
  }, [uid]);

  async function handleAvatarEdit() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(uid, uri);
      await updateUserDocument(uid, { fotoPerfil: url });
      setFotoPerfil(url);
    } catch (e) {
      console.error('[PerfilScreen] handleAvatarEdit error:', e);
      showToast(t('common.error'), 'error');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function startEditName() {
    setTempName(nombre);
    setEditingName(true);
  }

  async function saveName() {
    const trimmed = tempName.trim();
    if (!trimmed || trimmed === nombre) {
      setEditingName(false);
      return;
    }
    try {
      await updateUserDocument(uid, { nombre: trimmed });
      setNombre(trimmed);
    } catch (e) {
      console.error('[PerfilScreen] saveName error:', e);
      showToast(t('common.error'), 'error');
    }
    setEditingName(false);
  }

  async function handleLangChange(code) {
    await i18n.changeLanguage(code);
    if (uid) saveUserSettings(uid, { idioma: code }).catch(() => {});
  }

  async function handleToggleNotif(value) {
    setNotifEnabled(value);
    if (uid) saveUserSettings(uid, { notifWIP: value }).catch(() => {});
    if (value) {
      showToast(t('perfil.notifDevToast'));
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      await exportUserData(uid);
    } catch (e) {
      console.error('[export] handleExport error:', e);
      if (e.code === EXPORT_UNAVAILABLE_IN_EXPO_GO) {
        showToast(t('perfil.exportUnavailableInExpoGo'));
      } else {
        showToast(t('perfil.exportError'), 'error');
      }
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteModalVisible(false);
    try {
      await deleteAccount();
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  async function handleSignOut() {
    setSignOutModalVisible(false);
    try {
      await signOut();
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  const initial = nombre?.trim()?.[0]?.toUpperCase() ?? '?';
  const currentLang = i18n.language;
  const dateStr = formatShortDate(fechaRegistro);

  const termsContent = getLegalContent('terms', currentLang);
  const privacyContent = getLegalContent('privacy', currentLang);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Text style={styles.screenTitle}>{t('perfil.title')}</Text>

        {/* ── Avatar + Name ── */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            onPress={handleAvatarEdit}
            style={styles.avatarWrap}
            activeOpacity={0.8}
            disabled={uploadingPhoto}
          >
            {fotoPerfil ? (
              <LazyImage source={{ uri: fotoPerfil }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color={colors.secondary.copper} />
                ) : (
                  <Text style={styles.avatarInitial}>{initial}</Text>
                )}
              </View>
            )}
            <View style={styles.editBadge}>
              <Pencil size={11} color={colors.card} strokeWidth={2} />
            </View>
          </TouchableOpacity>

          <View style={styles.nameRow}>
            {editingName ? (
              <>
                <TextInput
                  style={styles.nameInput}
                  value={tempName}
                  onChangeText={setTempName}
                  onBlur={saveName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                />
                <TouchableOpacity onPress={saveName} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Check size={18} color={colors.primary.dark} strokeWidth={2} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.nombre}>{nombre || t('perfil.title')}</Text>
                <TouchableOpacity onPress={startEditName} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.edit')}>
                  <Pencil size={16} color={colors.text.tertiary} strokeWidth={1.8} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {!!user?.email && (
            <Text style={styles.email}>{user.email}</Text>
          )}
          {!!dateStr && (
            <Text style={styles.memberSince}>{t('perfil.memberSince', { date: dateStr })}</Text>
          )}
        </View>

        {/* ── Apariencia ── */}
        <Text style={styles.sectionLabel}>{t('perfil.apariencia')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            {isDark
              ? <Moon size={18} color={colors.text.secondary} strokeWidth={1.8} />
              : <Sun size={18} color={colors.text.secondary} strokeWidth={1.8} />
            }
            <Text style={styles.rowLabel}>{t('perfil.modoOscuro')}</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.neutral.greige, true: colors.secondary.olive }}
              thumbColor={colors.card}
            />
          </View>
        </View>

        {/* ── Idioma ── */}
        <Text style={styles.sectionLabel}>{t('perfil.idioma')}</Text>
        <View style={styles.card}>
          {LANGUAGES.map((lang, idx) => {
            const active = currentLang === lang.code || currentLang.startsWith(lang.code + '-');
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.row, idx < LANGUAGES.length - 1 && styles.rowDivider]}
                onPress={() => handleLangChange(lang.code)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                  {lang.label}
                </Text>
                {active && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Notificaciones ── */}
        <Text style={styles.sectionLabel}>{t('perfil.notificaciones')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Bell size={18} color={colors.text.secondary} strokeWidth={1.8} />
            <Text style={[styles.rowLabel, styles.rowLabelFlex]}>{t('perfil.notifWIP')}</Text>
            <Switch
              value={notifEnabled}
              onValueChange={handleToggleNotif}
              trackColor={{ false: colors.neutral.greige, true: colors.secondary.olive }}
              thumbColor={colors.card}
            />
          </View>
        </View>

        {/* ── Datos y privacidad ── */}
        <Text style={styles.sectionLabel}>{t('perfil.datosPrivacidad')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowDivider]}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <Download size={18} color={colors.text.secondary} strokeWidth={1.8} />
            <Text style={styles.rowLabel}>{t('perfil.exportarDatos')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setDeleteModalVisible(true)}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color={colors.status.errorText} strokeWidth={1.8} />
            <Text style={[styles.rowLabel, { color: colors.status.errorText }]}>
              {t('perfil.eliminarCuenta')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Acerca de ── */}
        <Text style={styles.sectionLabel}>{t('perfil.acercaDe')}</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.rowLabel}>{t('perfil.version')}</Text>
            <Text style={styles.rowValue}>{APP_VERSION}</Text>
          </View>
          <TouchableOpacity
            style={[styles.row, styles.rowDivider]}
            onPress={() => setTermsVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{t('perfil.terminos')}</Text>
            <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={1.5} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setPrivacyVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{t('perfil.politica')}</Text>
            <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* ── Cerrar sesión ── */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setSignOutModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowLabel, { color: colors.status.errorText }]}>
              {t('perfil.cerrarSesion')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      <LoadingOverlay visible={exportLoading} />

      <ConfirmationModal
        visible={deleteModalVisible}
        title={t('perfil.eliminarTitle')}
        message={t('perfil.eliminarMessage')}
        confirmLabel={t('perfil.eliminarConfirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteModalVisible(false)}
        destructive
      />

      <ConfirmationModal
        visible={signOutModalVisible}
        title={t('perfil.cerrarSesionTitle')}
        message={t('perfil.cerrarSesionMessage')}
        confirmLabel={t('perfil.cerrarSesionConfirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleSignOut}
        onCancel={() => setSignOutModalVisible(false)}
      />

      <DocViewerModal
        visible={termsVisible}
        onClose={() => setTermsVisible(false)}
        title={t('perfil.terminos')}
        content={termsContent}
      />

      <DocViewerModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
        title={t('perfil.politica')}
        content={privacyContent}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors) { return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  screenTitle: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },

  // Profile card
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.primary.light,
    borderRadius: radii.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: colors.secondary.copper,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary.cinnamon,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nombre: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
  },
  nameInput: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary.dark,
    minWidth: 120,
    paddingVertical: 2,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  memberSince: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },

  // Section labels
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },

  // Settings card
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: 48,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.greige,
  },
  rowLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.primary,
    flex: 1,
  },
  rowLabelFlex: {
    flex: 1,
  },
  rowLabelActive: {
    fontFamily: fonts.semiBold,
    color: colors.primary.dark,
  },
  rowValue: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.tertiary,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.dark,
  },

  bottomPad: {
    height: spacing.xl,
  },
}); }
