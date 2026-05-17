# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview
LanaLibre is a free cross-platform mobile app (iOS & Android) for intermediate-to-advanced crocheters.
It lets users plan and track crochet projects using three core tools: a yarn calculator, a design preview, and an interactive journal.

**Current state:** Slices 0–7 are complete (setup, i18n, auth, navigation shell, project management, project detail, yarn calculator, design preview). Slice 8 (Interactive journal) is next. Feature backlog is in `tasks/todo.md` — build slice by slice (services → screens → tests) in the order listed there. Check `tasks/lessons.md` before starting new work; add a rule there whenever a mistake is corrected.

## Tech stack
- **Language:** JavaScript (ES modules, not CommonJS)
- **Framework:** React Native 0.81.5 + Expo SDK 54
- **Navigation:** React Navigation v6 (not yet installed)
- **Graphics:** React Native Skia / `@shopify/react-native-skia` (not yet installed)
- **Color picker:** react-native-color-picker (not yet installed)
- **Icons:** lucide-react-native (not yet installed)
- **Font:** Nunito via Expo Google Fonts (not yet installed)
- **Backend:** Firebase — Auth + Cloud Firestore + Storage (not yet installed)
- **Auth:** Firebase Authentication with OAuth (Google + Apple)
- **i18n:** i18next + react-i18next + expo-localization — languages: Spanish (`es`, default), English (`en`), Norwegian Bokmål (`nb`)
- **Testing:** Jest + React Native Testing Library (not yet configured)
- **Package manager:** npm

## Run commands
```bash
npm start              # start Expo dev server
npm run android        # Android emulator
npm run ios            # iOS simulator
npm run web            # web preview
npx jest               # run all tests (once Jest is configured)
npx jest --testPathPattern=calculadora  # run calculator tests only
```

## Architecture (3-layer — target state)
```
Presentation   screens/, components/       ← never call Firebase directly
Logic          services/calculadora.js     ← pure JS, no Firebase
               services/previsualización.js
Data           services/firestore.js       ← all Firestore read/write
               services/storage.js
               services/auth.js
                        │
                   Firebase (Auth + Firestore + Storage)
```

UI calls logic services. Logic calls data services. Data services call Firebase. This boundary is a hard rule — see below.

### Planned module layout
```
/
├── App.js                ← entry point (currently blank scaffold)
├── firebase.js           ← Firebase Singleton init (one-time, reused everywhere)
├── services/
│   ├── auth.js           ← signInWithGoogle, signInWithApple, signOut, getCurrentUser
│   ├── firestore.js      ← all Firestore CRUD (projects, users, journal, colours)
│   ├── storage.js        ← Firebase Storage upload/delete wrappers
│   ├── calculadora.js    ← yarn formula, pure JS, unit-testable
│   └── previsualización.js ← canvas parameter builder
├── screens/              ← one file per screen
├── components/           ← shared UI components
├── hooks/                ← custom React hooks
├── i18n/
│   ├── index.js          ← i18next init + expo-localization detection
│   └── locales/
│       ├── es.json        ← Spanish (default / fallback)
│       ├── en.json        ← English
│       └── nb.json        ← Norwegian Bokmål
└── constants/
    ├── colors.js         ← full design token palette (see tokens below)
    ├── spacing.js        ← 4 px base scale
    └── typography.js     ← Nunito weights
```

## Firebase structure
```
Firestore:
  users/{uid}            → nombre, fotoPerfil, fechaRegistro
  projects/{projectId}   → uId, nombre, etiqueta (one of: WIP|PHD|FO|UFO|USO|YAP|TOAD), fechaCreacion, deletedAt
    embedded:  resultadoCalculadora, resultadoPrevisualización
  diarios/{diarioId}     → uId, nombre, fechaCreacion, proyectoId (null | string)
    embedded:  textoLibre, contadorFilas, timer, fechaActualizacion
    subcollections: colores/, archivosPatron/, archivosInspiracion/

Storage:
  /patrones/{uid}/{diarioId}/{archivoId}
  /inspiracion/{uid}/{diarioId}/{archivoId}
  /previsualizaciones/{uid}/{projectId}/{archivoId}

Required Firestore composite indexes:
  collection: projects   fields: uId ASC, deletedAt ASC, fechaCreacion DESC
  collection: diarios    fields: uId ASC, fechaCreacion DESC
  → define in firestore.indexes.json
```

## Business logic rules
- **Yarn calculator formula:**
  ```
  metrosPor100g  = metrosEtiqueta / (gramosEtiqueta / 100)
  areaProyecto   = ancho × largo  (cm²)
  densidad       = (tension / 10)²
  metrosTotales  = (areaProyecto × densidad × multiplicadorPunto) / 10
  gramosTotales  = metrosTotales / metrosPor100g × 100
  resultadoFinal = gramosTotales × 1.10   ← always +10 % margin
  ```
- **Stitch multipliers:** punto bajo 1.0 · punto alto 0.7 · puntos densos 1.3 · factorBase 10
- Each project stores **exactly one result per tool** for the calculator and design preview — saving replaces the old one (confirm with user first, RF-06/RF-07)
- **Diaries are standalone** — `diarios/{diarioId}` is a top-level collection. A diary can optionally be linked to a project via `proyectoId` (nullable string). A project does not own the diary; the diary owns the link. Multiple diaries can reference the same project.
- **Soft delete:** set `deletedAt` timestamp → hide from list → recoverable for 30 days
- **Hard delete:** after 30 days, remove Firestore doc + subcollections + Storage files permanently (both require confirmation, RF-07)
- Preview canvas is **never stored as a file** — it regenerates from saved parameters on every open
- **Project tags:** each project carries exactly one tag abbreviation stored as a string. Valid values and meanings:
  - `WIP` — Work In Progress
  - `PHD` — Project Half Done
  - `FO` — Finished Object
  - `UFO` — Unfinished Project
  - `USO` — Unstarted Object
  - `YAP` — Yet Another Project
  - `TOAD` — Trashed Object Abandoned in Disgust
  The abbreviation is shown as a badge on the project card. A tag legend modal (opened via an info button on the project list screen) explains all seven meanings. Legend text goes through i18next.
- **Project list search:** a single search bar on the project list screen filters within whichever tab is active (Activos or Eliminados). Filtering is client-side by project name. Empty-state messages differ per tab and must go through i18next; see Slice 4 in `tasks/todo.md` for exact wording. A passive 30-day recovery banner is shown at the top of the Eliminados list.

## Design tokens
```
Primary:   lavender  #C8BBE8 / #B89AD8 / #7C6AAF
Secondary: amber     #F5DFA8   olive  #A8BB7A   teal  #7DCEC4
Neutral:   greige    #D4CFC7   text-tertiary  #A8A9A6
Base bg:   #F7F5F0   cards  #FFFFFF
Status:    success   #D4EAC8   warning  #FAE3C8   error  #F5C8C8
Radii:     8 px small · 12 px cards · 16 px modals
Spacing:   4 px base → 8 / 12 / 16 / 24 / 32
```

## Code style
- Functional components with hooks only — no class components
- ES module imports only (`import { x } from 'y'`), never `require()`
- Validate all user input client-side before any Firebase call
- Secrets and Firebase config go in `.env` accessed via Expo's `Constants` — never in source

## Hard rules — never break these
- **No direct Firebase calls from UI** — always go through `/services/`
- **No confirmation skip** — every destructive action (delete, overwrite) requires a confirmation dialog (RF-07)
- **No cross-user data access** — Firestore security rules must gate every read/write on `request.auth.uid == resource.data.uId`
- **Calculator result is always an estimate** — never present it as a guarantee
- **No hardcoded user-facing strings** — every string shown to the user must go through `useTranslation()` / i18next; add to all three locale files simultaneously
- **WCAG 2.1 AA** — minimum 4.5:1 contrast ratio for all text on colour backgrounds (RNF-07)
- **Performance:** cold start and all user actions < 3 s on mid-range devices (RNF-01); lazy-load images, paginate lists > 20 items, target < 5 MB per session (RNF-02)

## Testing priorities
1. Unit tests on `services/calculadora.js` — highest priority, pure JS so no mocking needed
2. Component tests for main UI elements
3. Integration: auth flow and Firestore read/write

## Git conventions
- Branch per feature/fix — never commit directly to `main`
- Commit messages in English, conventional-commits style: `feat: add row counter to journal`
- PR description must reference the relevant RF/RNF requirement ID

## Design reference
Figma mockup screenshots are in `/figma-mockups/`. When building any screen, @-mention the relevant mockup as a visual reference and use  it as a starting point. You can improve on the mockups but should  respect the colour palette, typography and general layout.

Mockups available:
- figma-mockups/0_login.png
- figma-mockups/1_login2.png
- figma-mockups/2_Inicio.png
- figma-mockups/3_NuevoProyecto1.png
- figma-mockups/4_NuevoProyecto2.png
- figma-mockups/5_RecientesActivos.png
- figma-mockups/6_RecientesEliminados.png
- figma-mockups/7-TodosActivos.png
- figma-mockups/8_TodosEliminados.png
- figma-mockups/9_Diarios.png
- figma-mockups/10_NuevoDiario.png
- figma-mockups/11_Entrada1_BarraVertical.png
- figma-mockups/12_Entrada1_BarraComprimida.png
- figma-mockups/13_Entrada1_BarraHorizontal.png
- figma-mockups/14_RowCounter.png
- figma-mockups/15_Texto.png
- figma-mockups/16_Texto.png
- figma-mockups/17_TextoEliminar.png
- figma-mockups/18_ColorPalette.png
- figma-mockups/19_ColorPalette_Pincel.png
- figma-mockups/20_Puntos_Grid.png
- figma-mockups/21_Foto.png
- figma-mockups/22_Salir_Popup.png
- figma-mockups/23_Calculadora.png
- figma-mockups/24_CalculadoraResultado.png
- figma-mockups/25_CalculadoraGuardadoProyecto.png
- figma-mockups/26_VistaPrevia.png
- figma-mockups/27_VistaPreviaBufanda.png
- figma-mockups/28_VistaPreviaResultado.png
- figma-mockups/29_VistaPreviaGuardadoProyecto.png
- figma-mockups/30_VistaPrevia_Salir.png
- figma-mockups/31_Perfil.png
- figma-mockups/32_Terminos.png
- figma-mockups/33_Politica.png
- figma-mockups/34_PerfilEliminar.png

- Logo: assets/logo.png — use this on the login screen and anywhere 
  the app identity is shown