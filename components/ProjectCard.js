import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MoreVertical } from 'lucide-react-native';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function daysRemaining(deletedAt) {
  if (!deletedAt) return 0;
  const ts = deletedAt.toDate ? deletedAt.toDate() : new Date(deletedAt);
  const ms = THIRTY_DAYS_MS - (Date.now() - ts.getTime());
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function getTagStyle(tag) {
  return colors.tags[tag] || { bg: colors.primary.light, text: colors.primary.dark, border: colors.primary.DEFAULT };
}

export default function ProjectCard({ project, onDelete, onRestore, isDeleted, onPress }) {
  const { t } = useTranslation();
  const days = isDeleted ? daysRemaining(project.deletedAt) : 0;
  const tagStyle = getTagStyle(project.etiqueta);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={project.nombre}
    >
      <View style={styles.top}>
        <View style={[styles.badge, { backgroundColor: tagStyle.bg, borderColor: tagStyle.border }]}>
          <Text style={[styles.badgeText, { color: tagStyle.text }]}>{project.etiqueta}</Text>
        </View>
        {!isDeleted && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Eliminar proyecto"
          >
            <MoreVertical size={18} color={colors.text.tertiary} strokeWidth={1.8} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.nombre} numberOfLines={2}>
        {project.nombre}
      </Text>

      {isDeleted && (
        <View style={styles.bottom}>
          <View style={styles.daysBadge}>
            <Text style={styles.daysText}>
              {t('projects.daysRemaining', { count: days })}
            </Text>
          </View>
          <TouchableOpacity onPress={onRestore} activeOpacity={0.7}>
            <Text style={styles.restoreBtn}>{t('projects.restoreTitle').replace('?', '')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    borderWidth: 1,
    borderRadius: radii.small,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
  },
  nombre: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  daysBadge: {
    backgroundColor: colors.status.warning,
    borderRadius: radii.small,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  daysText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.primary,
  },
  restoreBtn: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary.dark,
  },
});
