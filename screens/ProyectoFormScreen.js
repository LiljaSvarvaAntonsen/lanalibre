import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Upload, Calculator, Eye, BookOpen, ChevronRight } from 'lucide-react-native';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { createProject as fsCreateProject, updateProject as fsUpdateProject } from '../services/firestore';
import { useAuth } from '../hooks/useAuth';
import LoadingOverlay from '../components/LoadingOverlay';
import Toast from '../components/Toast';

const TAGS = ['WIP', 'PHD', 'FO', 'UFO', 'USO', 'YAP', 'TOAD'];

function getTagStyle(tag) {
  return colors.tags[tag] || { bg: colors.primary.light, text: colors.primary.dark, border: colors.primary.DEFAULT };
}

const TOOLS = [
  { key: 'calculadora', icon: Calculator, iconColor: colors.secondary.cinnamon, iconBg: '#FDE8D8' },
  { key: 'previsualizacion', icon: Eye, iconColor: colors.primary.dark, iconBg: '#EDE5F8' },
  { key: 'diario', icon: BookOpen, iconColor: colors.secondary.teal, iconBg: '#D5EEF0' },
];

export default function ProyectoFormScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const projectId = route?.params?.projectId ?? route?.params?.project?.id ?? null;
  const existingProject = route?.params?.project ?? null;

  const [nombre, setNombre] = useState(existingProject?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(existingProject?.descripcion ?? '');
  const [etiqueta, setEtiqueta] = useState(existingProject?.etiqueta ?? 'WIP');
  const [nombreError, setNombreError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const isEdit = !!projectId;

  function showToast(message, type = 'success') {
    setToast({ visible: true, message, type });
  }

  function validate() {
    if (!nombre.trim()) {
      setNombreError(t('projects.nombre') + ' ' + t('errors.required', { defaultValue: 'es obligatorio.' }));
      return false;
    }
    setNombreError('');
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEdit) {
        await fsUpdateProject(projectId, { nombre: nombre.trim(), descripcion: descripcion.trim(), etiqueta });
      } else {
        await fsCreateProject(user.uid, { nombre: nombre.trim(), descripcion: descripcion.trim(), etiqueta });
      }
      showToast(t('projects.save'));
      setTimeout(() => navigation.goBack(), 600);
    } catch {
      showToast(t('errors.googleToken', { defaultValue: 'Algo salió mal. Intenta de nuevo.' }), 'error');
    } finally {
      setLoading(false);
    }
  }

  const selectedTagStyle = getTagStyle(etiqueta);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
          {/* Nombre del proyecto */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('projects.nombre')}</Text>
            <TextInput
              style={[styles.input, !!nombreError && styles.inputError]}
              value={nombre}
              onChangeText={(v) => { setNombre(v); setNombreError(''); }}
              placeholder={t('projects.nombrePlaceholder')}
              placeholderTextColor={colors.text.tertiary}
              maxLength={60}
              returnKeyType="next"
            />
            {!!nombreError && <Text style={styles.fieldError}>{nombreError}</Text>}
          </View>

          {/* Etiqueta */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('projects.etiqueta')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagScroll}
            >
              {TAGS.map((tag) => {
                const ts = getTagStyle(tag);
                const selected = etiqueta === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      {
                        borderColor: selected ? ts.border : colors.neutral.greige,
                        backgroundColor: selected ? ts.bg : colors.card,
                      },
                    ]}
                    onPress={() => setEtiqueta(tag)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.tagChipText, { color: selected ? ts.text : colors.text.tertiary }]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={[styles.tagFullName, { color: selectedTagStyle.text }]}>
              {t(`projects.tags.${etiqueta}`)}
            </Text>
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('projects.descripcion')}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder={t('projects.descripcionPlaceholder')}
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={400}
            />
          </View>

          {/* Subir patrón o foto */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('projects.subirArchivo')}</Text>
            <View style={styles.uploadZone}>
              <Upload size={24} color={colors.text.tertiary} strokeWidth={1.5} />
              <Text style={styles.uploadLabel}>{t('projects.subirArchivoLabel')}</Text>
              <Text style={styles.uploadSoon}>{t('projects.proximamente')}</Text>
            </View>
          </View>

          {/* Herramientas del proyecto */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('projects.herramientas')}</Text>
            <View style={styles.toolList}>
              {TOOLS.map(({ key, icon: Icon, iconColor, iconBg }) => (
                <View key={key} style={styles.toolRow}>
                  <View style={[styles.toolIconWrap, { backgroundColor: iconBg }]}>
                    <Icon size={18} color={iconColor} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.toolName}>{t(`projectDetail.${key}`)}</Text>
                  <ChevronRight size={18} color={colors.neutral.greige} strokeWidth={1.5} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Fixed save button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>{t('projects.saveProject')}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
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
    minHeight: 96,
    paddingTop: spacing.sm,
  },
  inputError: {
    borderColor: colors.status.errorText,
  },
  fieldError: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.status.errorText,
  },

  tagScroll: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  tagChip: {
    borderWidth: 1.5,
    borderRadius: radii.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tagChipText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
  },
  tagFullName: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },

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
  uploadLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
  },
  uploadSoon: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.neutral.tertiary,
  },

  toolList: {
    gap: spacing.xs,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  toolIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolName: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.primary,
  },

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
  saveBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.card,
  },
});
