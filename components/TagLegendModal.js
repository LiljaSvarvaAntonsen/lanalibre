import { useMemo } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';

const TAGS = ['WIP', 'PHD', 'FO', 'UFO', 'USO', 'YAP', 'TOAD'];

function getTagStyle(tag, colors) {
  return colors.tags[tag] || { bg: colors.primary.light, text: colors.primary.dark, border: colors.primary.DEFAULT };
}

export default function TagLegendModal({ visible, onClose }) {
  const { theme: colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('projects.tagLegendTitle')}</Text>
          <Text style={styles.subtitle}>{t('projects.tagLegendSubtitle')}</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {TAGS.map((tag) => {
              const ts = getTagStyle(tag, colors);
              return (
                <View key={tag} style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: ts.bg, borderColor: ts.border }]}>
                    <Text style={[styles.badgeText, { color: ts.text }]}>{tag}</Text>
                  </View>
                  <Text style={styles.definition}>{t(`projects.tags.${tag}`)}</Text>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeLabel}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: '#5D2D24',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#5D2D24',
    marginBottom: spacing.md,
  },
  scroll: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.greige,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radii.small,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    minWidth: 48,
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
  },
  definition: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  closeBtn: {
    backgroundColor: colors.button.primary,
    borderRadius: radii.small,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  closeLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.card,
  },
}); }
