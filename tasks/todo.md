# LanaLibre — Feature backlog

Tasks are ordered by development slice. Complete each slice fully (services → screens → tests) before moving to the next. Mark done with `[x]`.

---

## Slice 0 — Project setup
- [x] Initialise Expo project with `npx create-expo-app lanalibre --template blank`
- [x] Install and configure React Navigation v6 (stack + bottom tabs)
- [x] Install Firebase SDK and create `firebase.js` Singleton initialisation
- [x] Add `.env` for Firebase config keys; add to `.gitignore`
- [x] Install Expo Google Fonts (Nunito) and verify rendering
- [x] Install lucide-react-native icons
- [x] Configure Jest + React Native Testing Library
- [x] Create folder structure: `services/`, `components/`, `constants/`, `hooks/`
- [x] Add `constants/colors.js` (full design token palette from spec)
- [x] Add `constants/spacing.js` (4px scale) and `constants/typography.js` (Nunito weights)
- [x] Set up GitHub repo, add `README.md`, configure branch protection on `main`

---

## Slice 1 — Internationalisation
- [x] Install `i18next`, `react-i18next`, and `expo-localization`
- [x] Create `i18n/index.js` — initialise i18next with `expo-localization` for device locale detection; supported locales: `es`, `en`, `nb`; fallback language: `es`
- [x] Create translation files: `i18n/locales/es.json`, `i18n/locales/en.json`, `i18n/locales/nb.json`
- [x] Seed all three locale files with strings used in `screens/LoginScreen.js`
- [x] Update `App.js` to initialise i18n before rendering
- [x] Refactor `screens/LoginScreen.js` to use `useTranslation()` instead of hardcoded strings
- [x] Unit test: i18n resolves the correct string for each of the three locales

---

## Slice 2 — Authentication (RF-01, RNF-04)
- [x] `services/auth.js` — `signInWithGoogle()`, `signInWithApple()`, `signOut()`, `getCurrentUser()`
- [x] `services/firestore.js` — `createUserDocument(uid, data)`, `getUserDocument(uid)`
- [x] Auth listener: on app load, check session → redirect to login or home
- [x] Login screen: logo, "Continuar con Google" button, "Continuar con Apple" button, T&C link modal
- [x] After login: create `users/{uid}` document if new user, navigate to project list
- [x] Handle auth errors: show user-facing error message, allow retry
- [x] Unit test: `signOut()` clears session state

---

## Slice 3 — Navigation & home shell (RF-02)
- [x] Bottom tab navigator: Inicio, Calculadora, Vista previa, Diario, Perfil (5 tabs — matches Figma)
- [x] Stack navigator inside each tab (structure ready for push navigation in later slices)
- [x] InicioScreen: home hub with 4 shortcut cards (Empezar nuevo proyecto, Proyectos recientes, Todos los proyectos, Diario)
- [x] Global loading indicator component (used across all async operations)
- [x] Toast component for success/error feedback

---

## Slice 4 — Project management (RF-04, RNF-05, RNF-06, RF-07)
- [x] `services/firestore.js` — `createProject(uid, data)`, `getActiveProjects(uid, lastVisible?)`, `getDeletedProjects(uid)`, `updateProject(id, data)`, `softDeleteProject(id)`, `restoreProject(id)`, `hardDeleteProject(id)`
- [x] Firestore composite index: `projects` on `(uId, deletedAt, fechaCreacion)` — add to `firestore.indexes.json`
- [x] `hooks/useProjects.js` — manages activeProjects, deletedProjects, loading, hasMore, loadMore, refresh, CRUD wrappers; auto-hard-deletes expired (>30 days) projects on mount
- [x] `components/ConfirmationModal.js` — reusable slide-up confirm/cancel dialog; `destructive` prop switches confirm button to error colour
- [x] `components/ProjectCard.js` — card with tag badge, days-remaining pill for deleted projects, delete/restore action
- [x] `components/TagLegendModal.js` — bottom sheet listing all 7 tags with abbreviation badges and full names
- [x] Project list screen (`screens/ProyectosScreen.js`): toggle between Activos and Eliminados lists (two tab buttons)
- [x] Search bar on project list: filters within whichever tab is active (Activos or Eliminados); client-side filter on project name, updates as user types
- [x] Search empty state — Activos: '🧶 No encontramos ese proyecto entre los activos. ¿Quizás está en la papelera?' + button that switches to Eliminados tab automatically
- [x] Search empty state — Eliminados: '🧶 No encontramos ese proyecto. Si lo eliminaste hace más de 30 días, ya no es posible recuperarlo.'
- [x] Passive info banner at top of Eliminados list (always visible, not a search state): 'Los proyectos eliminados se pueden recuperar durante 30 días. Después se borran para siempre.'
- [x] Add all search empty-state strings, 30-day banner, tag legend, and project form strings to all three locale files (es, en, nb) — `projects` namespace
- [x] Project list: lazy load, paginate at 20 items (RNF-02); `onEndReached` disabled while search query is active
- [x] Project tag system: each project gets exactly one tag from WIP / PHD / FO / UFO / USO / YAP / TOAD — stored as the abbreviation string in Firestore field `etiqueta`
- [x] Tag badge on project card: shows abbreviation only (e.g. "WIP"), no expanded label on the card
- [x] Tag legend modal: info (ⓘ) button on the project list screen opens a modal listing all seven tags with their full names
- [x] Tag legend text goes through i18next — full names added to all three locale files (abbreviations are universal)
- [x] Create project screen (`screens/ProyectoFormScreen.js`): nombre input + radio-style tag selector (7 options with full names) → save to Firestore
- [x] Edit project: same form screen, pre-fills from `route.params.project`, calls `updateProject` on save
- [x] Delete project: confirmation dialog → soft delete → removed from Activos → appears in Eliminados with days remaining shown
- [x] Restore project from Eliminados list: confirmation dialog → clears `deletedAt` → moves back to Activos
- [x] Scheduled hard delete: projects with `deletedAt` older than 30 days → `hardDeleteProject` called automatically on `useProjects` mount (client-side check on app open; subcollection cleanup deferred to Slice 12)
- [x] Register `ProyectosScreen` and `ProyectoFormScreen` in `InicioStack` in `navigation/MainTabs.js`
- [x] Wire navigation on `InicioScreen` shortcut cards: "Empezar nuevo proyecto" → ProyectoFormScreen, "Proyectos recientes" / "Todos los proyectos" → ProyectosScreen
- [x] `useFocusEffect` refresh in ProyectosScreen so the list reloads from Firestore whenever the screen regains focus (e.g. after returning from the form)
- [x] Unit test: `softDeleteProject` calls `updateDoc` with a `deletedAt` field
- [x] Unit test: `restoreProject` calls `updateDoc` with `{ deletedAt: null }`
- [x] Unit test: `getActiveProjects` query includes `where('deletedAt', '==', null)`
- [x] Unit test: `getDeletedProjects` query includes `where('deletedAt', '!=', null)`
- [x] Unit test: client-side search filter returns only projects whose name contains the query string (case-insensitive)
- [x] Component tests (`__tests__/ProyectosScreen.test.js`): Activos tab selected by default, cards render, search filters list, Eliminados banner visible on tab switch, empty-state switch button works

---

## Slice 5 — Project detail & tool hub (RF-05)
- [x] Project detail screen: shows project name, etiqueta badge, last-modified date
- [x] Three tool cards on project detail: Calculadora, Previsualización, Diario
- [x] Each tool card shows a summary of the saved result (or "Sin resultado aún")
- [x] Navigation from each card into the respective tool screen

---

## Slice 6 — Yarn calculator (RF-05, RF-06, RF-07, CU-03)
- [x] `services/calculadora.js` — `calcularConsumo({ metrosEtiqueta, gramosEtiqueta, tension, tipoPunto, dimensiones })` → returns `{ resultadoGramos, margen10pct }`
- [x] Stitch multiplier map: `{ punto_bajo: 1.0, punto_alto: 0.7, puntos_densos: 1.3 }`, factorBase = 10
- [x] `services/firestore.js` — `saveResultadoCalculadora(projectId, data)`, `getResultadoCalculadora(projectId)`
- [x] Calculator screen: form with fields for peso/metros de etiqueta, tension, tipo de punto, dimensiones (ancho + largo)
- [x] Pre-fill form with existing saved result on open
- [x] Show result in grams + 10% margin recommendation on calculate
- [x] Validate all fields before calculating — show inline error if empty or invalid
- [x] "Guardar resultado" button → check if existing result → confirm overwrite if yes → save
- [x] "Añadir al diario" option after saving
- [x] "No guardar" path — allow free recalculation without saving
- [x] Unit test: `calcularConsumo` with punto bajo, known dimensions, known tension → correct grams output
- [x] Unit test: `calcularConsumo` with punto alto multiplier
- [x] Unit test: `calcularConsumo` with puntos densos multiplier
- [x] Unit test: 10% margin is always applied to the final result
- [x] Unit test: missing required field returns validation error, not a calculation

---

## Slice 7 — Design preview (RF-05, RF-06, RF-07, CU-04)
- [x] Install `@shopify/react-native-skia` and verify Expo compatibility — using `react-native-svg` for now (Expo Go compatible); canvas isolated in `components/PreviewCanvas.js` for future Skia swap
- [x] `services/previsualización.js` — `buildCanvasParams({ tipoProyecto, dim1, dim2, colores, patronPunto })` → returns serialisable params object; throws Error('validation') on bad input
- [x] `services/firestore.js` — `saveResultadoPrevisualización(projectId, data)`, `getResultadoPrevisualización(projectId)`
- [x] Preview screen: project type selector (dropdown of supported types — Bufanda, Manta, Gorro, Top)
- [x] Dimension inputs (fields change per project type: ancho/largo or circunferencia/altura)
- [x] Colour assignment — 4×2 preset palette grid, multi-select up to 4 colours
- [x] Stitch pattern selector per section — 3-pill row: Liso / Rayas ↕ / Rayas ↔
- [x] SVG canvas render on "Generar" (real-time render from saved params on project open)
- [x] "Guardar resultado" → confirm overwrite if exists → save parameters to Firestore
- [x] Canvas regenerates from saved parameters on every project open (not stored as image)
- [x] "Añadir al diario" option (navigates to DiarioScreen with params)
- [x] Show error if selected project type has no template yet (validation via buildCanvasParams)
- [x] Component test: canvas renders without crashing given valid params (16 tests, all passing)

---

## Slice 8 — Interactive journal (RF-05, RF-06, CU-05)

### Foundation (complete)
- [x] Install `react-native-color-picker`
- [x] `services/firestore.js` — `createDiario`, `getDiarios`, `getDiario`, `updateDiario`, `deleteDiario`, `getDiarioByProyecto`, `addEntradaColor`, `getColores`, `deleteEntradaColor`, `addArchivoPatron`, `getArchivosPatron`, `addArchivoInspiracion`, `getArchivosInspiracion`, `deleteArchivoRef`
- [x] `services/storage.js` — `uploadPatron`, `uploadInspiracion`, `deleteFile`
- [x] Firestore composite index for `diarios`: `uId ASC, fechaCreacion DESC`
- [x] From project detail 'Diario' card: `getDiarioByProyecto` → navigate to entry or show link sheet (Nuevo / Vincular existente)
- [x] Navigation: `EntradaDiarioScreen` registered in `InicioStack` and `DiarioStack`
- [x] Component test: row counter increments and calls `updateDiario`

### Phase A — Canvas structure (complete)

**Data model**
- [x] Add `entradas` subcollection to `diarios/{diarioId}/entradas/{entradaId}` — fields: `nombre` (string), `elementos` (JSON array of canvas elements), `fechaCreacion`, `fechaModificacion`
- [x] `services/firestore.js` — `createEntrada(diarioId, nombre)`, `getEntradas(diarioId)`, `getEntrada(diarioId, entradaId)`, `updateEntrada(diarioId, entradaId, data)`, `deleteEntrada(diarioId, entradaId)`
- [x] Sequential default naming: `getDiarios` count → "Diario {n+1}" for new diaries; `getEntradas(diarioId)` count → "Entrada {n+1}" for new entries

**DiarioScreen** (list of diaries — update existing)
- [x] Sequential default name: modal pre-fills "Diario {n+1}" (user can edit)
- [x] Optional project link in Nuevo Diario modal: slide-up picker of active projects; badge shown when selected
- [x] Tapping a diary card navigates to `DiarioDetalleScreen`

**DiarioDetalleScreen** (entry list — new screen)
- [x] `screens/DiarioDetalleScreen.js` — diary name in header, FlatList of entry cards (nombre, lastEdit date), loading overlay
- [x] "+ Nueva entrada" button: "Entrada {n+1}" → `createEntrada` → navigate to `EntradaDiarioScreen` with `{ diarioId, entradaId }`
- [x] Tap existing entry card → navigate to `EntradaDiarioScreen`
- [x] Empty state: centered icon + i18n message
- [x] Registered in `DiarioStack` and `InicioStack`

**EntradaDiarioScreen** (canvas — full rewrite)
- [x] Full-screen canvas (`View` with `overflow: hidden`)
- [x] Top bar: back arrow + exit-guard ConfirmationModal, editable entry title, eraser toggle (Trash2), save icon (Save)
- [x] Grid overlay via react-native-svg (`LayoutGrid` toolbar button toggles, ~22 pt cells, light grey lines)
- [x] Canvas state: `elementos` array of `{ id, type, x, y, ...typeProps }` — persisted to Firestore on save
- [x] Floating draggable toolbar (`Animated.ValueXY` + `PanResponder`): pill toggle, 6 buttons (row counter, color placeholder, text, upload placeholder, stitches placeholder, grid)
- [x] Row counter widget (`rowCounter` type): draggable, count / +1 / reset, at most one per canvas
- [x] Text box (`textBox` type): tap-to-place in textInsertMode, draggable, dashed outline when selected, TextFormatBar (Bold/Italic/Underline/S/M/L/Trash)
- [x] Eraser mode: Trash2 toggle → tap any element to remove
- [x] Save: `updateEntrada` on save button press; exit-guard modal on back with unsaved changes
- [x] i18n `entrada` namespace added to all three locale files
- [x] Component test: row counter widget + save calls `updateEntrada` with correct `elementos`

### Phase B — Rich tools (deferred — implement after Phase A confirmed working)
- [ ] **Paleta de colores**: colour picker modal (react-native-color-picker), paintbrush mode — tap/drag to paint individual grid squares, brush width slider (1–5 squares), undo last stroke
- [ ] **Puntos**: stitch symbol panel (chain, slip stitch, sc, hdc, dc, treble, magic ring) — draggable symbols, independently rotatable via rotation handle, grid-snapping
- [ ] **Subir archivo**: native file picker (`expo-image-picker` / `expo-document-picker`), spawns draggable+resizable image element on canvas with corner resize handles and top drag handle; uploads to Firebase Storage via `uploadInspiracion`

---

## Slice 9 — Save flow & result management (RF-06, RF-07)
- [ ] Reusable `ConfirmationModal` component (title, message, confirm/cancel buttons)
- [ ] Wire confirmation modal to: delete project, overwrite calculator result, overwrite preview result, delete account
- [ ] `ResultSummaryCard` component — shows saved result date + key value for each tool, used on project detail
- [ ] "Reemplazar resultado" UX: inform user a result already exists → show existing date → confirm before overwriting

---

## Slice 10 — User profile (RF-03)
- [ ] Profile screen: display nombre, fotoPerfil (avatar), email (from Firebase Auth), fechaRegistro
- [ ] Edit profile: update nombre, upload new profile photo → save to Firestore
- [ ] Delete account: confirmation dialog → delete `users/{uid}` document → delete all user's projects (soft then scheduled hard) → `Firebase Auth deleteUser()` (RGPD compliance)
- [ ] Settings screen: language selector (es / en / nb) → persists choice to Firestore and updates i18next at runtime

---

## Slice 11 — Performance & accessibility (RNF-01, RNF-02, RNF-03, RNF-07)
- [ ] Lazy load all images throughout the app (`<Image>` with placeholder)
- [ ] Paginate project list at 20 items with "load more" or infinite scroll
- [ ] Verify app cold start < 3 s on a mid-range Android emulator
- [ ] Verify all user actions respond < 3 s
- [ ] Check colour contrast ratios for all text/background combinations against WCAG 2.1 AA (4.5:1 minimum)
- [ ] Test with system font size set to largest — ensure no text truncates or overflows
- [ ] Test on tablet viewport — verify layout adapts correctly (RNF-03)
- [ ] Limit session data transfer to ~5 MB typical use (verify with Firebase emulator)

---

## Slice 12 — Security hardening (RNF-04)
- [ ] Write and deploy Firestore security rules: `allow read, write: if request.auth.uid == resource.data.uId`
- [ ] Write and deploy Firebase Storage rules: `allow read, write: if request.auth.uid == <uid from path>`
- [ ] Verify rules in Firebase emulator: user A cannot read user B's projects
- [ ] Verify unauthenticated requests are rejected
- [ ] Remove all `console.log` statements that could expose user data before release

---

## Slice 13 — Testing (Sprint 6)
- [ ] Unit tests: all `calculadora.js` functions (see Slice 6 for specifics)
- [ ] Unit tests: `softDeleteProject` and `hardDeleteProject` logic
- [ ] Unit tests: auth service `createUserDocument` (new vs existing user)
- [ ] Component tests: project list renders correctly with mocked data
- [ ] Component tests: calculator form validation messages appear on submit with empty fields
- [ ] Component tests: journal row counter
- [ ] Integration test: full auth flow (mock Firebase Auth)
- [ ] Integration test: create project → open calculator → save result → result appears on project detail
- [ ] Functional test: delete project → appears in deleted list → restore → reappears in active list
- [ ] Document any bugs found and fixed in `tasks/lessons.md`

---

## Slice 14 — Deployment prep (Sprint 7)
- [ ] Configure `app.json` / `app.config.js`: app name "LanaLibre", bundle IDs, icons, splash screen
- [ ] Build for Android with `eas build --platform android`
- [ ] Build for iOS with `eas build --platform ios`
- [ ] Submit to Google Play Store (internal test track first)
- [ ] Submit to Apple App Store (TestFlight first)
- [ ] Verify Firebase plan is on Blaze (pay-as-you-go) for production Storage usage
- [ ] Final smoke test on physical iOS and Android devices
