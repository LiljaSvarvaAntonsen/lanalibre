import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { Home, Calculator, Pencil, BookOpen, User } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import { fonts, fontSizes } from '../constants/typography';
import InicioScreen from '../screens/InicioScreen';
import CalculadoraScreen from '../screens/CalculadoraScreen';
import VistaPreviaScreen from '../screens/VistaPreviaScreen';
import DiarioScreen from '../screens/DiarioScreen';
import EntradaDiarioScreen from '../screens/EntradaDiarioScreen';
import PerfilScreen from '../screens/PerfilScreen';
import ProyectosScreen from '../screens/ProyectosScreen';
import ProyectoFormScreen from '../screens/ProyectoFormScreen';
import ProyectoDetalleScreen from '../screens/ProyectoDetalleScreen';
import DiarioDetalleScreen from '../screens/DiarioDetalleScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function stackScreenOptions(colors) {
  return {
    headerShown: false,
    cardStyle: { backgroundColor: colors.background },
    sceneContainerStyle: { backgroundColor: colors.background },
    animationEnabled: false,
  };
}

function InicioStack() {
  const { theme: colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="InicioRoot" component={InicioScreen} />
      <Stack.Screen name="ProyectosScreen" component={ProyectosScreen} />
      <Stack.Screen name="ProyectoFormScreen" component={ProyectoFormScreen} />
      <Stack.Screen name="ProyectoDetalleScreen" component={ProyectoDetalleScreen} />
      <Stack.Screen name="CalculadoraScreen" component={CalculadoraScreen} />
      <Stack.Screen name="VistaPreviaScreen" component={VistaPreviaScreen} />
      <Stack.Screen name="DiarioDetalleScreen" component={DiarioDetalleScreen} />
      <Stack.Screen name="EntradaDiarioScreen" component={EntradaDiarioScreen} />
    </Stack.Navigator>
  );
}

function CalculadoraStack() {
  const { theme: colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="CalculadoraRoot" component={CalculadoraScreen} />
    </Stack.Navigator>
  );
}

function VistaPreviaStack() {
  const { theme: colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="VistaPreviaRoot" component={VistaPreviaScreen} />
    </Stack.Navigator>
  );
}

function DiarioStack() {
  const { theme: colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="DiarioRoot" component={DiarioScreen} />
      <Stack.Screen name="DiarioDetalleScreen" component={DiarioDetalleScreen} />
      <Stack.Screen name="EntradaDiarioScreen" component={EntradaDiarioScreen} />
    </Stack.Navigator>
  );
}

function PerfilStack() {
  const { theme: colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="PerfilRoot" component={PerfilScreen} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  const { theme: colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { triggerTabGuardIfAny } = useNavigationGuard();

  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: colors.background }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary.dark,
        tabBarInactiveTintColor: colors.neutral.tertiary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.neutral.greige,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 10 + insets.bottom,
          height: 68 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semiBold,
          fontSize: 10,
        },
      })}
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          const guarded = triggerTabGuardIfAny(route.name, () => {
            navigation.navigate(route.name);
          });
          if (guarded) {
            e.preventDefault();
          } else {
            navigation.navigate(route.name);
          }
        },
      })}
    >
      <Tab.Screen
        name="Inicio"
        component={InicioStack}
        options={{
          tabBarLabel: t('nav.inicio'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="Calculadora"
        component={CalculadoraStack}
        options={{
          tabBarLabel: t('nav.calculadora'),
          tabBarIcon: ({ color, size }) => <Calculator size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="VistaPrevia"
        component={VistaPreviaStack}
        options={{
          tabBarLabel: t('nav.vistaPrevia'),
          tabBarIcon: ({ color, size }) => <Pencil size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="Diario"
        component={DiarioStack}
        options={{
          tabBarLabel: t('nav.diario'),
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilStack}
        options={{
          tabBarLabel: t('nav.perfil'),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tab.Navigator>
  );
}
