import { Modal, View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function LoadingOverlay({ visible }) {
  const { theme: colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color='#CB6D51' />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
