jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es' }]),
}));

jest.mock('../firebase', () => ({}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: require('../constants/colors').colors, isDark: false, toggleTheme: jest.fn() }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ user: null })),
}));

jest.mock('../services/firestore', () => ({
  getUserDocument: jest.fn(() => Promise.resolve(null)),
}));

import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import i18n from '../i18n';
import InicioScreen from '../screens/InicioScreen';

function Wrapper({ children }) {
  return <NavigationContainer>{children}</NavigationContainer>;
}

beforeAll(async () => {
  await i18n.changeLanguage('es');
});

test('renders all four shortcut cards', () => {
  render(<InicioScreen />, { wrapper: Wrapper });
  expect(screen.getByText(i18n.t('inicio.newProject'))).toBeTruthy();
  expect(screen.getByText(i18n.t('inicio.recentProjects'))).toBeTruthy();
  expect(screen.getByText(i18n.t('inicio.allProjects'))).toBeTruthy();
  expect(screen.getByText(i18n.t('inicio.journal'))).toBeTruthy();
});

test('renders greeting and subtitle', () => {
  render(<InicioScreen />, { wrapper: Wrapper });
  expect(screen.getByText(i18n.t('inicio.greeting'))).toBeTruthy();
  expect(screen.getByText(i18n.t('inicio.subtitle'))).toBeTruthy();
});
