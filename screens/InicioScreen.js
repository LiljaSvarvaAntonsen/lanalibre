import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Plus, Clock, Folder, BookOpen } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';

const CARD_TERRACOTTA = '#C07050';

function ShortcutCard({ label, icon: Icon, bg, iconColor, textColor, border, onPress, styles }) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg }, border && styles.cardBorder]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon size={28} color={iconColor} strokeWidth={1.8} />
      <Text style={[styles.cardLabel, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function InicioScreen({ navigation }) {
  const { theme: colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>{t('inicio.greeting')}</Text>
        <Text style={styles.subtitle}>{t('inicio.subtitle')}</Text>

        <View style={styles.grid}>
          <ShortcutCard
            styles={styles}
            label={t('inicio.newProject')}
            icon={Plus}
            bg={CARD_TERRACOTTA}
            iconColor={colors.card}
            textColor={colors.card}
            onPress={() => navigation.navigate('ProyectoFormScreen')}
          />
          <ShortcutCard
            styles={styles}
            label={t('inicio.recentProjects')}
            icon={Clock}
            bg={colors.primary.light}
            iconColor={colors.primary.dark}
            textColor={colors.text.primary}
            onPress={() => navigation.navigate('ProyectosScreen', { filter: 'recent' })}
          />
          <ShortcutCard
            styles={styles}
            label={t('inicio.allProjects')}
            icon={Folder}
            bg={colors.secondary.olive}
            iconColor={colors.card}
            textColor={colors.text.primary}
            onPress={() => navigation.navigate('ProyectosScreen')}
          />
          <ShortcutCard
            styles={styles}
            label={t('inicio.journal')}
            icon={BookOpen}
            bg={colors.card}
            iconColor={colors.text.primary}
            textColor={colors.text.primary}
            border
            onPress={() => navigation.navigate('Diario')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  greeting: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xxl,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: radii.card,
    padding: spacing.md,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  cardBorder: {
    borderWidth: 1,
    borderColor: colors.neutral.greige,
  },
  cardLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
}); }
