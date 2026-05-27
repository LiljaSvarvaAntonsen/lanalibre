# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx jest                                      # run all 86 tests (must stay green before every commit)
npx jest --testPathPattern=PerfilScreen       # run one test file
npx jest --watch                              # watch mode
npm start                                     # Expo dev server (Expo Go)
npm run android                               # Expo dev server targeting Android
```

Tests do not need a device or emulator. There is no lint command configured.

## Architecture

Three strict layers — components never call Firebase directly:

```
screens/ + components/          ← Presentation
services/calculadora.js         ← Logic (pure JS, no Firebase)
services/previsualización.js    ←   "
services/firestore.js           ← Data
services/auth.js                ←   "
services/storage.js             ←   "
        ↓
Firebase (Auth + Firestore + Storage)
```

**Context providers** (wrap order in App.js matters):
- `AuthContext` — Firebase Auth user, `signInWithGoogle`, `signInWithApple`, `devSignIn`. `useAuth()` is the hook.
- `ThemeContext` — `isDark`, `toggleTheme`, `theme` (the active colors object), `notifEnabled`. Reads `tema`/`idioma`/`notifWIP` from Firestore on login.
- `NavigationGuardContext` — intercepts tab presses when Calculator or Preview have unsaved data; shows a ConfirmationModal before allowing navigation.

**Navigation** (`navigation/MainTabs.js`):
- 5 bottom tabs: Inicio, Calculadora, VistaPrevia, Diario, Perfil — each owns a `Stack.Navigator`.
- `InicioStack` is the "master" stack and registers every shared screen (ProyectosScreen, ProyectoFormScreen, ProyectoDetalleScreen, CalculadoraScreen, VistaPreviaScreen, DiarioDetalleScreen, EntradaDiarioScreen). All stack animations are disabled.

## Firestore data model

| Path | Key fields |
|---|---|
| `users/{uid}` | `nombre`, `fotoPerfil`, `fechaRegistro` (serverTimestamp) |
| `projects/{id}` | `uId`, `nombre`, `etiqueta`, `deletedAt` (null = active) |
| `diarios/{id}` | `uId`, `nombre`, `proyectoId` |
| `diarios/{id}/entradas/{id}` | `nombre`, `elementos` (JSON array), `strokesUrl` |

`deletedAt` drives soft-delete: null = active, Timestamp = in trash, >30 days = auto hard-deleted by `useProjects` on mount. Composite index required: `projects (uId ASC, deletedAt ASC, fechaCreacion DESC)` — defined in `firestore.indexes.json`.

**Firestore timestamps** are `serverTimestamp()` objects. Always convert with `ts.toDate()` or check `ts.toDate ? ts.toDate() : new Date(ts)` before using as a JS Date.

## Styling pattern

Every screen/component builds styles with:
```js
const styles = useMemo(() => makeStyles(colors), [colors]);
```
`makeStyles(colors)` is a module-level function returning `StyleSheet.create({...})`. The `colors` object comes from `useTheme().theme` and switches between `colors` and `darkColors` from `constants/colors.js`. Never hardcode colors outside of one-off brand overrides (e.g. `#5D2D24`, `#CB6D51`) — use design tokens.

## i18n

Three locale files must always be kept in sync: `i18n/locales/es.json`, `en.json`, `nb.json`. Fallback language is `es`. When adding any user-visible string, add the key to all three files in the same commit.

## Journal canvas (EntradaDiarioScreen)

The canvas manages several mutually exclusive interaction modes (`paintMode`, `eraserMode`, `stitchInsertMode`, `textInsertMode`) plus a draggable floating toolbar. Two separate storage paths:
- `elementos` array → Firestore (`entradas/{id}.elementos`)
- `freeStrokes` + `gridFills` → Firebase Storage as a JSON blob (`uploadEntradaStrokes`), URL stored in `strokesUrl`

StitchWidget SVG icons use hardcoded stroke `#2C2C2A` (not a theme color) so they are always visible on the white journal canvas in dark mode.

## Testing conventions

Every test file must open with these mocks before any imports:
```js
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageCode: 'es' }]) }));
jest.mock('../firebase', () => ({}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: require('../constants/colors').colors, isDark: false, toggleTheme: jest.fn() }),
}));
```
`react-native-color-picker` has a manual mock at `__mocks__/react-native-color-picker.js`. All Firestore/Storage/Auth modules are mocked per-test-file — no emulator needed.

## Environment variables

Stored in `.env` (gitignored). Required keys:
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

## Git workflow

User runs all git commands manually — do not invoke git via tools. Run `npx jest` after any cross-cutting change and confirm all 86 tests pass before reporting work as done.
