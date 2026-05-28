jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es' }]),
}));

jest.mock('../firebase', () => ({}));

const mockToggleTheme = jest.fn();
const mockSetNotifEnabled = jest.fn();

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: require('../constants/colors').colors,
    isDark: false,
    toggleTheme: mockToggleTheme,
    notifEnabled: false,
    setNotifEnabled: mockSetNotifEnabled,
  }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'test-uid', email: 'test@example.com' } })),
}));

jest.mock('../services/firestore', () => ({
  getUserDocument: jest.fn(() => Promise.resolve({ nombre: 'Test User' })),
  saveUserSettings: jest.fn(() => Promise.resolve()),
  updateUserDocument: jest.fn(() => Promise.resolve()),
}));

const mockDeleteAccount = jest.fn(() => Promise.resolve());

jest.mock('../services/auth', () => ({
  deleteAccount: (...args) => mockDeleteAccount(...args),
}));

jest.mock('../services/storage', () => ({
  uploadProfilePhoto: jest.fn(() => Promise.resolve('https://example.com/photo.jpg')),
}));

const mockExportUserData = jest.fn(() => Promise.resolve());

jest.mock('../services/exportData', () => ({
  exportUserData: (...args) => mockExportUserData(...args),
}));

const mockRequestPermissionsAsync = jest.fn(() => Promise.resolve({ status: 'granted' }));
const mockCancelAllScheduledNotificationsAsync = jest.fn(() => Promise.resolve());
const mockScheduleNotificationAsync = jest.fn(() => Promise.resolve());

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: (...args) => mockRequestPermissionsAsync(...args),
  cancelAllScheduledNotificationsAsync: (...args) => mockCancelAllScheduledNotificationsAsync(...args),
  scheduleNotificationAsync: (...args) => mockScheduleNotificationAsync(...args),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3' } },
}));

import React from 'react';
import { Switch } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import i18n from '../i18n';
import PerfilScreen from '../screens/PerfilScreen';

function Wrapper({ children }) {
  return <NavigationContainer>{children}</NavigationContainer>;
}

const mockNavigation = { navigate: jest.fn() };

beforeAll(async () => {
  await i18n.changeLanguage('es');
});

afterEach(() => {
  jest.clearAllMocks();
  mockToggleTheme.mockClear();
  mockSetNotifEnabled.mockClear();
  mockDeleteAccount.mockClear();
  mockExportUserData.mockClear();
  mockRequestPermissionsAsync.mockClear();
  mockCancelAllScheduledNotificationsAsync.mockClear();
  mockScheduleNotificationAsync.mockClear();
});

test('renders all five settings section labels', async () => {
  render(<PerfilScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  await waitFor(() => {
    expect(screen.getByText(i18n.t('perfil.apariencia'))).toBeTruthy();
    expect(screen.getByText(i18n.t('perfil.idioma'))).toBeTruthy();
    expect(screen.getByText(i18n.t('perfil.notificaciones'))).toBeTruthy();
    expect(screen.getByText(i18n.t('perfil.datosPrivacidad'))).toBeTruthy();
    expect(screen.getByText(i18n.t('perfil.acercaDe'))).toBeTruthy();
  });
});

test('language selector: pressing English calls saveUserSettings with idioma en', async () => {
  const { saveUserSettings } = require('../services/firestore');
  render(<PerfilScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  await waitFor(() => screen.getByText('English'));
  fireEvent.press(screen.getByText('English'));
  await waitFor(() => {
    expect(saveUserSettings).toHaveBeenCalledWith('test-uid', { idioma: 'en' });
  });
});

test('language selector: pressing Norsk calls saveUserSettings with idioma nb', async () => {
  const { saveUserSettings } = require('../services/firestore');
  render(<PerfilScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  await waitFor(() => screen.getByText('Norsk (Bokmål)'));
  fireEvent.press(screen.getByText('Norsk (Bokmål)'));
  await waitFor(() => {
    expect(saveUserSettings).toHaveBeenCalledWith('test-uid', { idioma: 'nb' });
  });
});

test('dark mode toggle calls toggleTheme', async () => {
  render(<PerfilScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  await waitFor(() => screen.getByText(i18n.t('perfil.modoOscuro')));
  const switches = screen.UNSAFE_getAllByType(Switch);
  fireEvent(switches[0], 'valueChange', true);
  expect(mockToggleTheme).toHaveBeenCalledTimes(1);
});

test('notifications toggle: toggling on saves setting, requests permission and schedules notification', async () => {
  const { saveUserSettings } = require('../services/firestore');
  render(<PerfilScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  await waitFor(() => screen.getByText(i18n.t('perfil.notifWIP')));
  const switches = screen.UNSAFE_getAllByType(Switch);
  fireEvent(switches[1], 'valueChange', true);
  await waitFor(() => {
    expect(saveUserSettings).toHaveBeenCalledWith('test-uid', { notifWIP: true });
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});

test('notifications toggle: toggling off saves setting and cancels notifications', async () => {
  const { getUserDocument, saveUserSettings } = require('../services/firestore');
  getUserDocument.mockResolvedValueOnce({ nombre: 'Test User', notifWIP: true });
  render(<PerfilScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  await waitFor(() => screen.getByText(i18n.t('perfil.notifWIP')));
  const switches = screen.UNSAFE_getAllByType(Switch);
  fireEvent(switches[1], 'valueChange', false);
  await waitFor(() => {
    expect(saveUserSettings).toHaveBeenCalledWith('test-uid', { notifWIP: false });
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });
  expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
});

test('export button calls exportUserData with uid', async () => {
  render(<PerfilScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  await waitFor(() => screen.getByText(i18n.t('perfil.exportarDatos')));
  fireEvent.press(screen.getByText(i18n.t('perfil.exportarDatos')));
  await waitFor(() => {
    expect(mockExportUserData).toHaveBeenCalledWith('test-uid');
  });
});

test('delete account: pressing button opens modal; confirming calls deleteAccount', async () => {
  render(<PerfilScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  await waitFor(() => screen.getByText(i18n.t('perfil.eliminarCuenta')));
  fireEvent.press(screen.getByText(i18n.t('perfil.eliminarCuenta')));
  await waitFor(() => {
    expect(screen.getByText(i18n.t('perfil.eliminarTitle'))).toBeTruthy();
  });
  fireEvent.press(screen.getByText(i18n.t('perfil.eliminarConfirm')));
  await waitFor(() => {
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });
});

test('version is displayed in Acerca de section', async () => {
  render(<PerfilScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  await waitFor(() => screen.getByText('1.2.3'));
  expect(screen.getByText('1.2.3')).toBeTruthy();
});
