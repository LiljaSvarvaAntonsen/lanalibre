import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { formatShortDate } from '../utils/dates';

export default function ResultSummaryCard({
  icon: Icon,
  label,
  keyValue,
  savedDate,
  iconColor,
  iconBg,
  onPress,
}) {
  const { theme: colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const dateStr = formatShortDate(savedDate);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Icon size={20} color={iconColor} strokeWidth={1.8} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.keyValue} numberOfLines={1}>{keyValue}</Text>
          {!!dateStr && (
            <Text style={styles.date}>{t('projectDetail.guardadoEl', { date: dateStr })}</Text>
          )}
        </View>
      </View>
      <ChevronRight size={20} color={colors.text.tertiary} strokeWidth={1.5} />
    </TouchableOpacity>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
  keyValue: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.primary.dark,
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
}); }
