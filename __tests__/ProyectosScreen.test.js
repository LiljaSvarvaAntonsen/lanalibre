jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es' }]),
}));

jest.mock('../firebase', () => ({}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: require('../constants/colors').colors, isDark: false, toggleTheme: jest.fn() }),
}));

const mockActiveProjects = [
  { id: 'p1', nombre: 'Bufanda azul', etiqueta: 'WIP', deletedAt: null },
  { id: 'p2', nombre: 'Gorro de lana', etiqueta: 'FO', deletedAt: null },
];
const mockDeletedProjects = [
  {
    id: 'p3',
    nombre: 'Proyecto abandonado',
    etiqueta: 'TOAD',
    deletedAt: { toDate: () => new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
  },
];

jest.mock('../hooks/useProjects', () => ({
  useProjects: jest.fn(() => ({
    activeProjects: mockActiveProjects,
    deletedProjects: mockDeletedProjects,
    loading: false,
    error: null,
    hasMore: false,
    loadMore: jest.fn(),
    refresh: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    hardDelete: jest.fn(),
  })),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'test-uid' } })),
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import i18n from '../i18n';
import ProyectosScreen from '../screens/ProyectosScreen';

function Wrapper({ children }) {
  return <NavigationContainer>{children}</NavigationContainer>;
}

const mockNavigation = { navigate: jest.fn() };

beforeAll(async () => {
  await i18n.changeLanguage('es');
});

afterEach(() => jest.clearAllMocks());

test('renders Activos tab selected by default', () => {
  render(<ProyectosScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  expect(screen.getAllByText(i18n.t('projects.tabActive')).length).toBeGreaterThanOrEqual(1);
});

test('renders active project names from fixture', () => {
  render(<ProyectosScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  expect(screen.getByText('Bufanda azul')).toBeTruthy();
  expect(screen.getByText('Gorro de lana')).toBeTruthy();
});

test('typing in search bar filters the list', async () => {
  render(<ProyectosScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  const input = screen.getByPlaceholderText(i18n.t('projects.searchPlaceholder'));
  fireEvent.changeText(input, 'Bufanda');
  expect(screen.getByText('Bufanda azul')).toBeTruthy();
  expect(screen.queryByText('Gorro de lana')).toBeNull();
});

test('searching with no match on Activos shows searchEmptyActive message', async () => {
  render(<ProyectosScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  const input = screen.getByPlaceholderText(i18n.t('projects.searchPlaceholder'));
  fireEvent.changeText(input, 'zzznomatch');
  expect(screen.getByText(i18n.t('projects.searchEmptyActive'))).toBeTruthy();
  expect(screen.getByText(i18n.t('projects.searchEmptyActiveButton'))).toBeTruthy();
});

test('switching to Eliminados tab shows the 30-day banner', () => {
  render(<ProyectosScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  fireEvent.press(screen.getByText(i18n.t('projects.tabDeleted')));
  expect(screen.getByText(i18n.t('projects.deletedBanner'))).toBeTruthy();
});

test('pressing Ver en la papelera switches to Eliminados tab', async () => {
  render(<ProyectosScreen navigation={mockNavigation} />, { wrapper: Wrapper });
  const input = screen.getByPlaceholderText(i18n.t('projects.searchPlaceholder'));
  fireEvent.changeText(input, 'zzznomatch');
  fireEvent.press(screen.getByText(i18n.t('projects.searchEmptyActiveButton')));
  expect(screen.getByText(i18n.t('projects.deletedBanner'))).toBeTruthy();
});
