import { Modal, View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export default function LoadingOverlay({ visible }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
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
