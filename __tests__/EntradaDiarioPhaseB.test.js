jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es' }]),
}));

jest.mock('../firebase', () => ({}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: require('../constants/colors').colors, isDark: false, toggleTheme: jest.fn() }),
}));

// ── Storage mocks ──────────────────────────────────────────────────────────────

const mockUploadEntradaStrokes = jest.fn(() => Promise.resolve('https://storage/strokes.json'));
const mockFetchEntradaStrokes = jest.fn(() => Promise.resolve({ freeStrokes: [], gridFills: {} }));
const mockUploadEntradaFile = jest.fn(() =>
  Promise.resolve({ url: 'https://storage/img.jpg', storagePath: 'inspiracion/uid/d1/img.jpg' })
);

jest.mock('../services/storage', () => ({
  uploadEntradaStrokes: (...args) => mockUploadEntradaStrokes(...args),
  fetchEntradaStrokes: (...args) => mockFetchEntradaStrokes(...args),
  uploadEntradaFile: (...args) => mockUploadEntradaFile(...args),
  uploadPatron: jest.fn(),
  uploadInspiracion: jest.fn(),
  deleteFile: jest.fn(),
}));

// ── Firestore mocks ────────────────────────────────────────────────────────────

const mockUpdateEntrada = jest.fn(() => Promise.resolve());

jest.mock('../services/firestore', () => ({
  getEntrada: jest.fn(() =>
    Promise.resolve({ id: 'e1', nombre: 'Entrada 1', elementos: [] })
  ),
  updateEntrada: (...args) => mockUpdateEntrada(...args),
}));

// ── Auth mock ──────────────────────────────────────────────────────────────────

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'test-uid' } })),
}));

// ── Picker mocks ───────────────────────────────────────────────────────────────

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: 'file://img.jpg', fileName: 'img.jpg' }] })
  ),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: 'file://doc.pdf', name: 'doc.pdf' }] })
  ),
}));

// ── react-native-color-picker mock ─────────────────────────────────────────────

jest.mock('react-native-color-picker', () => ({
  ColorPicker: () => null,
  fromHsv: jest.fn((hsv) => '#7C6AAF'),
  toHsv: jest.fn(() => ({ h: 260, s: 0.4, v: 0.7 })),
}));

jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return View;
});

// ── Imports ────────────────────────────────────────────────────────────────────

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import i18n from '../i18n';
import EntradaDiarioScreen from '../screens/EntradaDiarioScreen';
import PuntosPanel from '../components/journal/PuntosPanel';

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const mockRoute = { params: { diarioId: 'd1', entradaId: 'e1' } };

function Wrapper({ children }) {
  return <NavigationContainer>{children}</NavigationContainer>;
}

function renderScreen() {
  return render(
    <Wrapper>
      <EntradaDiarioScreen navigation={mockNavigation} route={mockRoute} />
    </Wrapper>
  );
}

beforeAll(async () => {
  await i18n;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Test 1: PuntosPanel — tapping a stitch tile calls onSelect ─────────────────

describe('PuntosPanel', () => {
  it('calls onSelect with correct stitchType when a tile is tapped', () => {
    const onSelect = jest.fn();
    render(
      <PuntosPanel
        visible
        onSelect={onSelect}
        onDismiss={jest.fn()}
        t={(key) => key.split('.').pop()}
      />
    );
    // "puntoBajo" tile label is last segment of i18n key → "puntoBajo"
    fireEvent.press(screen.getByText('puntoBajo'));
    expect(onSelect).toHaveBeenCalledWith('puntoBajo');
  });

  it('renders all 7 stitch tiles when visible', () => {
    render(
      <PuntosPanel
        visible
        onSelect={jest.fn()}
        onDismiss={jest.fn()}
        t={(key) => key.split('.').pop()}
      />
    );
    const stitchTypes = ['cadena', 'puntoRaso', 'puntoBajo', 'medioPuntoAlto', 'puntoAlto', 'puntoAltoDoble', 'anilloMagico'];
    stitchTypes.forEach((type) => {
      expect(screen.getByText(type)).toBeTruthy();
    });
  });
});

// ── Test 2: Palette button opens color picker panel ────────────────────────────

describe('EntradaDiarioScreen — paint mode', () => {
  it('tapping Palette toolbar button opens the colour picker panel', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText('Personaliza tu color')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Personaliza tu color'));

    // ColorPickerPanel step 1 renders "Siguiente" button
    await waitFor(() => {
      expect(screen.getByText('Siguiente')).toBeTruthy();
    });
  });

  it('undo button appears only when paint mode is active', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText('Personaliza tu color')).toBeTruthy());

    // Undo button should NOT be visible before paint mode
    expect(screen.queryByLabelText('Deshacer')).toBeNull();

    // Open colour picker → step 2 via Siguiente → activate brush
    fireEvent.press(screen.getByLabelText('Personaliza tu color'));
    await waitFor(() => expect(screen.getByText('Siguiente')).toBeTruthy());
    fireEvent.press(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByText('Activar pincel')).toBeTruthy());
    fireEvent.press(screen.getByText('Activar pincel'));

    // Undo button should now be visible
    await waitFor(() => {
      expect(screen.getByLabelText('Deshacer')).toBeTruthy();
    });
  });
});

// ── Test 3: Stitch insert — canvas tap adds stitch elemento ────────────────────

describe('EntradaDiarioScreen — stitch insert', () => {
  it('tapping Puntos button opens the puntos panel', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText('Puntos')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Puntos'));

    await waitFor(() => {
      // Panel title visible
      expect(screen.getByText('Puntos')).toBeTruthy();
    });
  });

  it('stitch insert mode — canvas tap places stitch and calls save with stitch element', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText('Puntos')).toBeTruthy());

    // Open puntos panel and select a stitch
    fireEvent.press(screen.getByLabelText('Puntos'));
    await waitFor(() => expect(screen.getByText('Punto bajo')).toBeTruthy());
    fireEvent.press(screen.getByText('Punto bajo'));

    // Panel closes; tap the canvas to place the stitch
    const canvas = screen.getByTestId('canvas-tap');
    fireEvent(canvas, 'press', {
      nativeEvent: { locationX: 100, locationY: 150 },
    });

    // Save and verify stitch in elementos
    const allBtns = screen.getAllByRole('button');
    fireEvent.press(allBtns[allBtns.length - 1]);

    await waitFor(() => {
      expect(mockUpdateEntrada).toHaveBeenCalledWith(
        'd1', 'e1',
        expect.objectContaining({
          elementos: expect.arrayContaining([
            expect.objectContaining({ type: 'stitch', stitchType: 'puntoBajo' }),
          ]),
        })
      );
    });
  });
});

// ── Test 4: Upload success ─────────────────────────────────────────────────────

describe('EntradaDiarioScreen — file upload', () => {
  it('picking an image uploads and adds an image elemento', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText('Subir archivo')).toBeTruthy());

    // Tap upload button — Alert.alert is called; we mock it and invoke the Imagen handler
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const imagenBtn = buttons.find((b) => b.text === 'Imagen');
        imagenBtn?.onPress?.();
      }
    );

    fireEvent.press(screen.getByLabelText('Subir archivo'));
    await waitFor(() => expect(mockUploadEntradaFile).toHaveBeenCalled());

    // Save and verify image elemento was added
    const allBtns = screen.getAllByRole('button');
    fireEvent.press(allBtns[allBtns.length - 1]);

    await waitFor(() => {
      expect(mockUpdateEntrada).toHaveBeenCalledWith(
        'd1', 'e1',
        expect.objectContaining({
          elementos: expect.arrayContaining([
            expect.objectContaining({ type: 'image', url: 'https://storage/img.jpg' }),
          ]),
        })
      );
    });

    alertSpy.mockRestore();
  });

  it('upload failure shows error toast and no elemento is added', async () => {
    mockUploadEntradaFile.mockRejectedValueOnce(new Error('network error'));

    renderScreen();
    await waitFor(() => expect(screen.getByLabelText('Subir archivo')).toBeTruthy());

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const imagenBtn = buttons.find((b) => b.text === 'Imagen');
        imagenBtn?.onPress?.();
      }
    );

    fireEvent.press(screen.getByLabelText('Subir archivo'));
    await waitFor(() => expect(mockUploadEntradaFile).toHaveBeenCalled());

    // Error toast text visible
    await waitFor(() => {
      expect(screen.getByText('Error al subir. Inténtalo de nuevo.')).toBeTruthy();
    });

    // Save — no image elemento in the call
    const allBtns = screen.getAllByRole('button');
    fireEvent.press(allBtns[allBtns.length - 1]);

    await waitFor(() => {
      const call = mockUpdateEntrada.mock.calls[0];
      const elementos = call?.[2]?.elementos ?? [];
      expect(elementos.some((el) => el.type === 'image')).toBe(false);
    });

    alertSpy.mockRestore();
  });
});
