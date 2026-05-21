import './i18n';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
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
import { useAuth } from './hooks/useAuth';
import LoginScreen from './screens/LoginScreen';
import MainTabs from './navigation/MainTabs';
import { colors as lightColors } from './constants/colors';

const Stack = createStackNavigator();

function AuthRouter() {
  const { theme: colors } = useTheme();
  const { user, loading, error, signInWithGoogle, signInWithApple, devSignIn } = useAuth();

  if (loading) {
    return <View style={[styles.loading, { backgroundColor: colors.background }]} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
          <NavigationContainer>
            <StatusBar style="auto" />
            <AuthRouter />
          </NavigationContainer>
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
