import { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}) {
  const { theme: colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <TouchableOpacity
            style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
            onPress={onConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmLabel}>{confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelLabel}>{cancelLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radii.modal,
    padding: spacing.md,
    gap: spacing.md,
    width: '100%',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  confirmBtn: {
    backgroundColor: colors.button.primary,
    borderRadius: radii.small,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: colors.status.errorText,
  },
  confirmLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.card,
  },
  cancelBtn: {
    borderRadius: radii.small,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  cancelLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
}); }
