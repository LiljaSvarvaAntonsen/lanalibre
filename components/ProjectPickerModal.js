import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import { getActiveProjects } from '../services/firestore';

export default function ProjectPickerModal({ visible, onClose, onSelect, uid, onCreateProject }) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !uid) return;
    let cancelled = false;
    setLoading(true);
    getActiveProjects(uid)
      .then(({ projects: list }) => {
        if (!cancelled) setProjects(list);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, uid]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.header}>
          <Text style={s.title}>{t('projectPicker.title')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={colors.text.secondary} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            <Text style={s.emptyText}>{t('projectPicker.loading')}</Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyText}>{t('projectPicker.empty')}</Text>
            <TouchableOpacity style={s.createBtn} onPress={onCreateProject} activeOpacity={0.85}>
              <Text style={s.createBtnText}>{t('projectPicker.createFirst')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(p) => p.id}
            style={s.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.item}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={s.itemName}>{item.nombre}</Text>
                {item.etiqueta ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{item.etiqueta}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
  list: {
    flexGrow: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.greige,
  },
  itemName: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text.primary,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.primary.light,
    borderRadius: radii.small,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xs,
    color: colors.primary.dark,
  },
  center: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  createBtn: {
    backgroundColor: colors.button.primary,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  createBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: colors.card,
  },
});
