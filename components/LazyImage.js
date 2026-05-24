import { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export default function LazyImage({ style, ...props }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {!loaded && (
        <ActivityIndicator
          style={StyleSheet.absoluteFill}
          color={colors.neutral.tertiary}
        />
      )}
      <Image
        {...props}
        style={[StyleSheet.absoluteFill, !loaded && { opacity: 0 }]}
        onLoad={() => setLoaded(true)}
      />
    </View>
  );
}
