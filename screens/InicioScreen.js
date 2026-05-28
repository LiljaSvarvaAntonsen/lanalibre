import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Plus, Clock, Folder, BookOpen } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { useAuth } from '../hooks/useAuth';
import { getUserDocument, createUserDocument } from '../services/firestore';

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
  const { theme: colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { user } = useAuth() ?? {};
  const [userName, setUserName] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      getUserDocument(user.uid)
        .then((userDoc) => {
          if (!userDoc) {
            return createUserDocument(user.uid, { nombre: '', fotoPerfil: null });
          }
          if (userDoc.nombre) setUserName(userDoc.nombre);
        })
        .catch(() => {});
    }, [user?.uid]),
  );

  const greeting = userName
    ? t('inicio.greetingWithName', { name: userName })
    : t('inicio.greeting');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={[styles.greeting, { color: isDark ? '#BA797D' : '#5D2D24' }]}>{greeting}</Text>
        <Text style={[styles.subtitle, { color: isDark ? '#BA797D' : '#5D2D24' }]}>{t('inicio.subtitle')}</Text>

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
            bg='#E69E7F'
            iconColor='#CB6D51'
            textColor={colors.text.primary}
            onPress={() => navigation.navigate('ProyectosScreen', { filter: 'recent' })}
          />
          <ShortcutCard
            styles={styles}
            label={t('inicio.allProjects')}
            icon={Folder}
            bg='#D0917F'
            iconColor='#5D2D24'
            textColor={colors.text.primary}
            onPress={() => navigation.navigate('ProyectosScreen')}
          />
          <ShortcutCard
            styles={styles}
            label={t('inicio.journal')}
            icon={BookOpen}
            bg='#5D2D24'
            iconColor='#CB6D51'
            textColor={colors.card}
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
