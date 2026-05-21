import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
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
import { exportUserData } from '../services/exportData';
import { formatShortDate } from '../utils/dates';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingOverlay from '../components/LoadingOverlay';
import Toast from '../components/Toast';
import DocViewerModal from '../components/DocViewerModal';

// ── Doc content (bundled as strings to avoid Metro .md transforms) ────────────

const TERMS_CONTENT = `# Términos y condiciones de uso — LanaLibre
Última actualización: mayo 2026
Desarrolladora: Lilja Svarva Antonsen
Contacto: contacto@lanalibre.es (placeholder)

1. Aceptación de los términos
Al usar LanaLibre aceptas estos términos. Si no estás de acuerdo, por favor no uses la aplicación.
2. Descripción del servicio
LanaLibre es una aplicación móvil gratuita para planificar y gestionar proyectos de crochet. Incluye una calculadora de lana, una herramienta de previsualización de diseños y un diario interactivo.
3. Cuenta de usuario
Necesitas una cuenta de Google o Apple para usar LanaLibre
Eres responsable de mantener tu cuenta segura
Debes tener al menos 16 años para usar la aplicación (requisito mínimo RGPD)
4. Contenido del usuario
Tus proyectos, diarios y patrones son tuyos — LanaLibre no reclama ningún derecho sobre tu contenido
Al subir contenido otorgas a LanaLibre el permiso necesario para almacenarlo y mostrártelo
No subas contenido que infrinja derechos de autor de terceros
5. Estimaciones de la calculadora
Los resultados de la calculadora de lana son estimaciones orientativas y no garantías. El consumo real puede variar según tu tensión personal, el tipo de fibra y el acabado del proyecto. LanaLibre no se hace responsable de compras de material basadas en estas estimaciones.
6. Eliminación de datos
Los proyectos eliminados se conservan durante 30 días y pueden recuperarse durante ese período
Transcurridos 30 días la eliminación es permanente e irreversible
Puedes eliminar tu cuenta en cualquier momento desde tu perfil
7. Limitación de responsabilidad
LanaLibre se proporciona tal como está, sin garantías de disponibilidad continua. Al tratarse de un proyecto académico en desarrollo, pueden producirse interrupciones del servicio.
8. Cambios en los términos
Si los términos cambian de forma significativa se te notificará dentro de la app. El uso continuado implica la aceptación de los nuevos términos.
9. Contacto
Para cualquier consulta sobre estos términos: contacto@lanalibre.es (placeholder)`;

const PRIVACY_CONTENT = `# Política de privacidad — LanaLibre
Última actualización: mayo 2026
Responsable del tratamiento: Lilja Svarva Antonsen
Contacto: contacto@lanalibre.es (placeholder)

1. Qué datos recogemos
LanaLibre recoge únicamente los datos necesarios para que la aplicación funcione:
Datos de cuenta (gestionados por Google o Apple):
Nombre de usuario
Dirección de correo electrónico
Foto de perfil (si está disponible)
Datos de uso generados por ti:
Proyectos de crochet que creas (nombre, etiqueta, herramientas usadas)
Entradas de diario, notas y paletas de color
Archivos que subes (patrones en PDF, imágenes de inspiración)
Resultados de la calculadora y parámetros de previsualización
Datos técnicos mínimos:
Fecha de registro
Preferencias de idioma y tema visual
2. Para qué usamos tus datos
Tus datos se usan exclusivamente para:
Permitirte acceder a tu cuenta y tus proyectos
Sincronizar tu contenido entre dispositivos
Mostrarte tus proyectos, diarios y resultados guardados
Enviarte notificaciones locales si las has activado (solo en tu dispositivo)
LanaLibre no vende tus datos, no los comparte con terceros y no los usa para publicidad.
3. Dónde se almacenan tus datos
Tus datos se almacenan en Google Firebase (Cloud Firestore y Firebase Storage), con servidores ubicados en Europa (región EUR3). Google Firebase cumple con el RGPD.
4. Durante cuánto tiempo conservamos tus datos
Proyectos activos: mientras tengas cuenta activa
Proyectos eliminados: 30 días, luego se borran permanentemente
Cuenta eliminada: todos tus datos se eliminan de Firestore y Storage en el momento de la eliminación
5. Tus derechos (RGPD)
Como usuario tienes derecho a:
Acceso — saber qué datos tenemos sobre ti
Rectificación — corregir datos incorrectos
Eliminación — borrar tu cuenta y todos tus datos
Portabilidad — exportar tus datos en formato descargable
Para ejercer cualquiera de estos derechos contacta con: contacto@lanalibre.es (placeholder)
6. Seguridad
La autenticación se gestiona íntegramente por Google o Apple — LanaLibre nunca ve ni almacena tu contraseña
Cada usuario solo puede acceder a sus propios datos (reglas de seguridad de Firestore)
Toda la comunicación con Firebase se realiza sobre HTTPS
7. Menores de edad
LanaLibre no está dirigida a menores de 16 años.
8. Contacto
Para cualquier consulta sobre privacidad: contacto@lanalibre.es (placeholder)`;

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'nb', label: 'Norsk (Bokmål)' },
];

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// ── PerfilScreen ──────────────────────────────────────────────────────────────

export default function PerfilScreen({ navigation }) {
  const { theme: colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const uid = user?.uid;

  const [nombre, setNombre] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [fechaRegistro, setFechaRegistro] = useState(null);
  const [notifEnabled, setNotifEnabled] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
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
        if (typeof doc.notifWIP === 'boolean') setNotifEnabled(doc.notifWIP);
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
      if (uid === 'dev-user') {
        setFotoPerfil(uri);
      } else {
        const url = await uploadProfilePhoto(uid, uri);
        await updateUserDocument(uid, { fotoPerfil: url });
        setFotoPerfil(url);
      }
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
      if (uid !== 'dev-user') {
        await updateUserDocument(uid, { nombre: trimmed });
      }
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
    console.log('[export] handleExport triggered, uid:', uid);
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

  const initial = nombre?.trim()?.[0]?.toUpperCase() ?? '?';
  const currentLang = i18n.language;
  const dateStr = formatShortDate(fechaRegistro);

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
              <Image source={{ uri: fotoPerfil }} style={styles.avatar} />
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
                <TouchableOpacity onPress={startEditName} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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

      <DocViewerModal
        visible={termsVisible}
        onClose={() => setTermsVisible(false)}
        title={t('perfil.terminos')}
        content={TERMS_CONTENT}
      />

      <DocViewerModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
        title={t('perfil.politica')}
        content={PRIVACY_CONTENT}
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
