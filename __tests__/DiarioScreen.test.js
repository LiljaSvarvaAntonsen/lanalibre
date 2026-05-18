jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es' }]),
}));

jest.mock('../firebase', () => ({}));

jest.mock('../services/storage', () => ({
  uploadEntradaStrokes: jest.fn(() => Promise.resolve('https://storage/strokes.json')),
  fetchEntradaStrokes: jest.fn(() => Promise.resolve({ freeStrokes: [], gridFills: {} })),
  uploadEntradaFile: jest.fn(() => Promise.resolve({ url: 'https://storage/img.jpg', storagePath: 'path' })),
  uploadPatron: jest.fn(),
  uploadInspiracion: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true })),
}));

jest.mock('react-native-color-picker', () => ({
  ColorPicker: () => null,
  fromHsv: jest.fn(() => '#7C6AAF'),
  toHsv: jest.fn(() => ({ h: 260, s: 0.4, v: 0.7 })),
}));

jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return View;
});

// ── Firestore mocks ────────────────────────────────────────────────────────────

const mockUpdateEntrada = jest.fn(() => Promise.resolve());

jest.mock('../services/firestore', () => ({
  getEntrada: jest.fn(() =>
    Promise.resolve({
      id: 'e1',
      nombre: 'Entrada 1',
      elementos: [],
    })
  ),
  updateEntrada: (...args) => mockUpdateEntrada(...args),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'test-uid' } })),
}));

// ── Render helpers ────────────────────────────────────────────────────────────

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import i18n from '../i18n';
import EntradaDiarioScreen from '../screens/EntradaDiarioScreen';

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const mockRoute = { params: { diarioId: 'd1', entradaId: 'e1' } };

function Wrapper({ children }) {
  return <NavigationContainer>{children}</NavigationContainer>;
}

beforeAll(async () => {
  await i18n;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EntradaDiarioScreen — canvas row counter', () => {
  it('adds a row counter element, increments it, and saves via updateEntrada', async () => {
    render(
      <Wrapper>
        <EntradaDiarioScreen navigation={mockNavigation} route={mockRoute} />
      </Wrapper>
    );

    // Wait for load to complete (toolbar appears after getEntrada resolves)
    await waitFor(() => {
      expect(screen.getByLabelText('Contador de filas')).toBeTruthy();
    });

    // Tap "Contador de filas" toolbar button to spawn widget
    fireEvent.press(screen.getByLabelText('Contador de filas'));

    // Counter widget appears with count 0
    await waitFor(() => {
      expect(screen.getByText('0')).toBeTruthy();
    });

    // Press +1
    fireEvent.press(screen.getByText('+1'));

    // Count updates to 1
    await waitFor(() => {
      expect(screen.getByText('1')).toBeTruthy();
    });

    // Press the Save button (accessibilityRole="button", Save icon)
    // The save button is the last role=button in the top bar
    const allBtns = screen.getAllByRole('button');
    // Save is the last TouchableOpacity in the top bar before the canvas
    // Find it by pressing each until updateEntrada is called
    // Simpler: press directly via the accessible element
    fireEvent.press(allBtns[allBtns.length - 1]);

    await waitFor(() => {
      expect(mockUpdateEntrada).toHaveBeenCalledWith(
        'd1',
        'e1',
        expect.objectContaining({
          elementos: expect.arrayContaining([
            expect.objectContaining({ type: 'rowCounter', count: 1 }),
          ]),
        })
      );
    });
  });
});
