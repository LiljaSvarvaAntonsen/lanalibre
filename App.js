import './i18n';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_400Regular_Italic,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_700Bold_Italic,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { NavigationGuardProvider } from './contexts/NavigationGuardContext';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './screens/LoginScreen';
import MainTabs from './navigation/MainTabs';
import { colors as lightColors } from './constants/colors';

const Stack = createStackNavigator();

// Wraps NavigationContainer with the app theme so React Navigation uses the
// correct background colour during screen transitions (eliminates dark flash).
// Spreads DefaultTheme/DarkTheme first so required properties like `fonts`
// (added in React Navigation 7) are always present, preventing 'medium' crash.
function ThemedNavigationContainer({ children }) {
  const { theme: colors, isDark } = useTheme();
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary.dark,
      background: colors.background,
      card: colors.card,
      text: colors.text.primary,
      border: colors.neutral.greige,
      notification: colors.secondary.copper,
    },
  };
  return <NavigationContainer theme={navTheme}>{children}</NavigationContainer>;
}

function AuthRouter() {
  const { theme: colors } = useTheme();
  const { user, loading, error, signInWithGoogle, signInWithApple, devSignIn } = useAuth();

  if (loading) {
    return <View style={[styles.loading, { backgroundColor: colors.background }]} />;
  }

  const screenOptions = {
    headerShown: false,
    cardStyle: { backgroundColor: colors.background },
    sceneContainerStyle: { backgroundColor: colors.background },
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login">
          {() => (
            <LoginScreen
              signInWithGoogle={signInWithGoogle}
              signInWithApple={signInWithApple}
              error={error}
              devSignIn={devSignIn}
            />
          )}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_400Regular_Italic,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_700Bold_Italic,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <NavigationGuardProvider>
            <ThemedNavigationContainer>
              <StatusBar style="auto" />
              <AuthRouter />
            </ThemedNavigationContainer>
          </NavigationGuardProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
});
