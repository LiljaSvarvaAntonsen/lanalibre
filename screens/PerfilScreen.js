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
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import LazyImage from '../components/LazyImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Pencil, Moon, Sun, Bell, Download, Trash2, ChevronRight, Camera } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { useAuth } from '../hooks/useAuth';
import { getUserDocument, saveUserSettings, updateUserDocument } from '../services/firestore';
import { deleteAccount } from '../services/auth';
import { uploadProfilePhoto } from '../services/storage';
import { exportUserData } from '../services/exportData';
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { user, signOut } = useAuth();
  const uid = user?.uid;

  const [nombre, setNombre] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [fechaRegistro, setFechaRegistro] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [tempName, setTempName] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropAsset, setCropAsset] = useState(null);

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
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setCropAsset(result.assets[0]);
  }

  async function handleCropAndSave() {
    if (!cropAsset) return;
    setCropAsset(null);
    setUploadingPhoto(true);
    try {
      const { width, height, uri } = cropAsset;
      const size = Math.min(width, height);
      const originX = Math.floor((width - size) / 2);
      const originY = Math.floor((height - size) / 2);
      const cropped = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX, originY, width: size, height: size } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const url = await uploadProfilePhoto(uid, cropped.uri);
      await updateUserDocument(uid, { fotoPerfil: url });
      setFotoPerfil(url);
    } catch (e) {
      console.error('[PerfilScreen] handleCropAndSave error:', e);
      showToast(t('common.error'), 'error');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSaveProfile() {
    const trimmed = tempName.trim();
    setEditingProfile(false);
    if (trimmed && trimmed !== nombre) {
      try {
        await updateUserDocument(uid, { nombre: trimmed });
        setNombre(trimmed);
      } catch (e) {
        console.error('[PerfilScreen] saveProfile error:', e);
        showToast(t('common.error'), 'error');
      }
    }
  }

  async function handleLangChange(code) {
    await i18n.changeLanguage(code);
    if (uid) saveUserSettings(uid, { idioma: code }).catch(() => {});
  }

  async function handleToggleNotif(value) {
    setNotifEnabled(value);
    if (uid) saveUserSettings(uid, { notifWIP: value }).catch(() => {});
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast(t('perfil.notifPermissionDenied'), 'error');
        setNotifEnabled(false);
        if (uid) saveUserSettings(uid, { notifWIP: false }).catch(() => {});
        return;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: { title: t('perfil.notifTitle'), body: t('perfil.notifBody') },
        trigger: { seconds: 7 * 24 * 60 * 60, repeats: true },
      });
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      await exportUserData(uid);
    } catch (e) {
      console.error('[export] handleExport error:', e);
      showToast(t('perfil.exportError'), 'error');
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
        <Text style={[styles.screenTitle, { color: isDark ? '#BA797D' : '#5D2D24' }]}>{t('perfil.title')}</Text>

        {/* ── Avatar + Name ── */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={editingProfile
              ? handleSaveProfile
              : () => { setTempName(nombre); setEditingProfile(true); }
            }
            activeOpacity={0.7}
          >
            {editingProfile
              ? <Text style={styles.saveProfileLabel}>{t('perfil.saveNombre')}</Text>
              : <Pencil size={16} color={colors.brand.copperRed} strokeWidth={1.8} />
            }
          </TouchableOpacity>

          {editingProfile ? (
            <TouchableOpacity
              onPress={handleAvatarEdit}
              disabled={uploadingPhoto}
              activeOpacity={0.8}
              style={styles.avatarWrap}
            >
              {fotoPerfil ? (
                <LazyImage source={{ uri: fotoPerfil }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color='#CB6D51' />
                  ) : (
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  )}
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Camera size={14} color="#FFFFFF" strokeWidth={2} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.avatarWrap}>
              {fotoPerfil ? (
                <LazyImage source={{ uri: fotoPerfil }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
            </View>
          )}

          {editingProfile ? (
            <TextInput
              style={styles.nameInput}
              value={tempName}
              onChangeText={setTempName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveProfile}
              textAlign="center"
            />
          ) : (
            <Text style={styles.nombre}>{nombre || t('perfil.title')}</Text>
          )}

          {!!user?.email && (
            <Text style={styles.email}>{user.email}</Text>
          )}
          {!!uid && (
            <Text style={styles.memberSince}>
              {t('perfil.memberSince', { date: dateStr || '—' })}
            </Text>
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

      {/* ── Crop modal ── */}
      <Modal visible={!!cropAsset} animationType="slide" statusBarTranslucent>
        <View style={styles.cropContainer}>
          <View style={styles.cropImageWrap}>
            {cropAsset && (
              <Image
                source={{ uri: cropAsset.uri }}
                style={{ width: screenWidth, flex: 1 }}
                resizeMode="contain"
              />
            )}
          </View>
          <View style={styles.cropActions}>
            <Text style={styles.cropHint}>La foto se recortará en formato cuadrado</Text>
            <TouchableOpacity
              style={styles.cropConfirmBtn}
              onPress={handleCropAndSave}
              activeOpacity={0.8}
            >
              <Text style={styles.cropConfirmLabel}>Recortar y guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cropCancelBtn}
              onPress={() => setCropAsset(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.cropCancelLabel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    borderRadius: radii.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  editProfileBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  saveProfileLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.brand.copperRed,
  },
  avatarWrap: {
    marginBottom: spacing.xs,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CB6D51',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.bold,
    fontSize: 36,
    color: colors.secondary.copper,
  },
  nombre: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.brand.burntCopper,
  },
  nameInput: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.brand.burntCopper,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.brand.burntCopper,
    minWidth: 120,
    paddingVertical: 2,
    textAlign: 'center',
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  memberSince: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.brand.copperRed,
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
    color: colors.brand.burntCopper,
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
    backgroundColor: colors.brand.burntCopper,
  },

  bottomPad: {
    height: spacing.xl,
  },

  // Crop modal
  cropContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  cropImageWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  cropActions: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  cropHint: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cropConfirmBtn: {
    width: '100%',
    backgroundColor: '#CB6D51',
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cropConfirmLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: '#FFFFFF',
  },
  cropCancelBtn: {
    width: '100%',
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cropCancelLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: '#FFFFFF',
  },
}); }
