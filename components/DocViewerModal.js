import { useMemo } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';

function renderContent(content, styles) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('# ')) return null;
    if (line.startsWith('## ')) {
      return <Text key={i} style={styles.h2}>{line.slice(3)}</Text>;
    }
    if (line.startsWith('### ')) {
      return <Text key={i} style={styles.h3}>{line.slice(4)}</Text>;
    }
    if (line.trim() === '') {
      return <View key={i} style={styles.spacer} />;
    }
    return <Text key={i} style={styles.body}>{line}</Text>;
  });
}

export default function DocViewerModal({ visible, onClose, title, content }) {
  const { theme: colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={colors.brand.copperRed} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!!content && renderContent(content, styles)}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.greige,
    backgroundColor: colors.card,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  h2: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  h3: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  spacer: {
    height: spacing.sm,
  },
}); }
