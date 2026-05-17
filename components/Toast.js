import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';

const BG = {
  success: colors.status.success,
  error: colors.status.error,
  info: colors.primary.light,
};

const TEXT = {
  success: colors.text.primary,
  error: colors.text.primary,
  info: colors.primary.dark,
};

export default function Toast({ visible, message, type = 'info', onHide }) {
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onHide?.());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: BG[type], transform: [{ translateY }] },
      ]}
    >
      <Text style={[styles.message, { color: TEXT[type] }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 90,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  message: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
});
