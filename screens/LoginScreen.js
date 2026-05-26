import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation, Trans } from 'react-i18next';
import { radii } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/spacing';
import { fonts, fontSizes } from '../constants/typography';
import DocViewerModal from '../components/DocViewerModal';
import { getLegalContent } from '../constants/legalContent';

export default function LoginScreen({ signInWithGoogle, signInWithApple, error, devSignIn }) {
  const { theme: colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);

  async function handleGoogle() {
    setBusy(true);
    await signInWithGoogle();
    setBusy(false);
  }

  async function handleApple() {
    setBusy(true);
    await signInWithApple();
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>{t('common.appName')}</Text>
          <Text style={styles.tagline}>{t('login.tagline')}</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogle}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('login.signInWithGoogle')}
          >
            {busy ? (
              <ActivityIndicator color='#CB6D51' />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleLabel}>{t('login.signInWithGoogle')}</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleApple}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('login.signInWithApple')}
            >
              {busy ? (
                <ActivityIndicator color='#CB6D51' />
              ) : (
                <Text style={styles.appleLabel}>{'🍎  '}{t('login.signInWithApple')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {__DEV__ && (
          <TouchableOpacity style={styles.devButton} onPress={devSignIn} activeOpacity={0.7}>
            <Text style={styles.devButtonText}>Continuar sin cuenta (desarrollo)</Text>
          </TouchableOpacity>
        )}

        <View style={styles.termsRow}>
          <Trans
            i18nKey="login.termsAcceptance"
            components={{
              terms: <Text style={styles.termsLink} onPress={() => setModal('terms')} />,
              privacy: <Text style={styles.termsLink} onPress={() => setModal('privacy')} />,
            }}
            parent={({ children }) => (
              <Text style={styles.termsText}>{children}</Text>
            )}
          />
        </View>
      </ScrollView>

      <DocViewerModal
        visible={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'terms' ? t('legal.termsTitle') : t('legal.privacyTitle')}
        content={modal !== null ? getLegalContent(modal, i18n.language) : ''}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: spacing.sm,
  },
  logoText: {
    fontFamily: fonts.extraBold,
    fontSize: 40,
    color: colors.primary.dark,
    letterSpacing: 1,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.lg,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  errorBanner: {
    width: '100%',
    backgroundColor: colors.status.error,
    borderRadius: radii.small,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.primary,
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.greige,
    minHeight: 52,
    gap: spacing.xs,
  },
  googleIcon: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: '#4285F4',
  },
  googleLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  appleLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.card,
  },
  devButton: {
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  devButtonText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
  termsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  termsText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  termsLink: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.primary.dark,
    textDecorationLine: 'underline',
  },
}); }
