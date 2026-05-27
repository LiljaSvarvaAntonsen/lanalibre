import { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { CheckCircle, XCircle, Info } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';

const TOAST_CONFIG = {
  success: { bg: '#E69E7F', text: '#F7F5F0', Icon: CheckCircle },
  error:   { bg: '#F5C8C8', text: '#8B1A1A', Icon: XCircle },
  info:    { bg: '#E8E4F5', text: '#4A3570', Icon: Info },
};

export default function Toast({ visible, message, type = 'success', onHide }) {
  const config = TOAST_CONFIG[type] ?? TOAST_CONFIG.success;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHide?.());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const { Icon } = config;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={[styles.bubble, { backgroundColor: config.bg }]}>
        <Icon size={20} color={config.text} strokeWidth={2} />
        <Text style={[styles.message, { color: config.text }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    flexShrink: 1,
  },
});
