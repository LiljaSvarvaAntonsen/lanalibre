import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'nb', label: 'Norsk (Bokmål)' },
];

export default function PerfilScreen() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('perfil.title')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('perfil.idioma')}</Text>
        {LANGUAGES.map((lang) => {
          const active = currentLang === lang.code || currentLang.startsWith(lang.code + '-');
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langRow, active && styles.langRowActive]}
              onPress={() => i18n.changeLanguage(lang.code)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.langLabel, active && styles.langLabelActive]}>
                {lang.label}
              </Text>
              {active && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
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
  title: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.text.primary,
  },
  section: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary.dark,
    marginBottom: spacing.xs,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  langRowActive: {
    borderColor: colors.primary.dark,
    backgroundColor: colors.primary.light,
  },
  langLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
  langLabelActive: {
    fontFamily: fonts.semiBold,
    color: colors.primary.dark,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.dark,
  },
});
