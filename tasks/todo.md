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
- [ ] Set up GitHub repo, add `README.md`, configure branch protection on `main`

---

## Slice 1 — Authentication (RF-01, RNF-04)
- [ ] `services/auth.js` — `signInWithGoogle()`, `signInWithApple()`, `signOut()`, `getCurrentUser()`
- [ ] `services/firestore.js` — `createUserDocument(uid, data)`, `getUserDocument(uid)`
- [ ] Auth listener: on app load, check session → redirect to login or home
- [ ] Login screen: logo, "Continuar con Google" button, "Continuar con Apple" button, T&C link modal
- [ ] After login: create `users/{uid}` document if new user, navigate to project list
- [ ] Handle auth errors: show user-facing error message, allow retry
- [ ] Unit test: `signOut()` clears session state

---

## Slice 2 — Navigation & home shell (RF-02)
- [ ] Bottom tab navigator: Proyectos, Perfil, Ajustes
- [ ] Stack navigator inside Proyectos tab (list → project detail → tool screens)
- [ ] Empty state screen for project list (no projects yet → prompt to create first one)
- [ ] Global loading indicator component (used across all async operations)
- [ ] Toast component for success/error feedback

---

## Slice 3 — Project management (RF-04, RNF-05, RNF-06, RF-07)
- [ ] `services/firestore.js` — `createProject(uid, data)`, `getProjects(uid)`, `updateProject(id, data)`, `softDeleteProject(id)`, `restoreProject(id)`, `hardDeleteProject(id)`
- [ ] Firestore composite index: `projects` on `(uId, deletedAt, fechaCreacion)` — add to `firestore.indexes.json`
- [ ] Project list screen: shows active projects, search bar, filter by etiqueta (planificado / en progreso / finalizado)
- [ ] Project list: lazy load, paginate at 20 items (RNF-02)
- [ ] "Ver proyectos eliminados" section at bottom of list — shows soft-deleted projects with days remaining
- [ ] Create project screen: nombre input + etiqueta selector → save to Firestore
- [ ] Edit project: pre-fills form with existing data, saves on confirm
- [ ] Delete project: confirmation dialog → soft delete → hide from list
- [ ] Restore project from deleted list
- [ ] Scheduled hard delete: projects with `deletedAt` older than 30 days → delete doc + subcollections + Storage files (implement as a callable or scheduled Firebase Function, or run check on app open)
- [ ] Unit test: `softDeleteProject` sets `deletedAt` and does not remove document
- [ ] Unit test: project list query filters out `deletedAt != null` documents

---

## Slice 4 — Project detail & tool hub (RF-05)
- [ ] Project detail screen: shows project name, etiqueta badge, last-modified date
- [ ] Three tool cards on project detail: Calculadora, Previsualización, Diario
- [ ] Each tool card shows a summary of the saved result (or "Sin resultado aún")
- [ ] Navigation from each card into the respective tool screen

---

## Slice 5 — Yarn calculator (RF-05, RF-06, RF-07, CU-03)
- [ ] `services/calculadora.js` — `calcularConsumo({ metrosEtiqueta, gramosEtiqueta, tension, tipoPunto, dimensiones })` → returns `{ resultadoGramos, margen10pct }`
- [ ] Stitch multiplier map: `{ punto_bajo: 1.0, punto_alto: 0.7, puntos_densos: 1.3 }`, factorBase = 10
- [ ] `services/firestore.js` — `saveResultadoCalculadora(projectId, data)`, `getResultadoCalculadora(projectId)`
- [ ] Calculator screen: form with fields for peso/metros de etiqueta, tension, tipo de punto, dimensiones (ancho + largo)
- [ ] Pre-fill form with existing saved result on open
- [ ] Show result in grams + 10% margin recommendation on calculate
- [ ] Validate all fields before calculating — show inline error if empty or invalid
- [ ] "Guardar resultado" button → check if existing result → confirm overwrite if yes → save
- [ ] "Añadir al diario" option after saving
- [ ] "No guardar" path — allow free recalculation without saving
- [ ] Unit test: `calcularConsumo` with punto bajo, known dimensions, known tension → correct grams output
- [ ] Unit test: `calcularConsumo` with punto alto multiplier
- [ ] Unit test: `calcularConsumo` with puntos densos multiplier
- [ ] Unit test: 10% margin is always applied to the final result
- [ ] Unit test: missing required field returns validation error, not a calculation

---

## Slice 6 — Design preview (RF-05, RF-06, RF-07, CU-04)
- [ ] Install `@shopify/react-native-skia` and verify Expo compatibility
- [ ] `services/previsualización.js` — `buildCanvasParams({ tipoProyecto, medidas, colores, patronPuntos })` → returns grid data structure for Skia
- [ ] `services/firestore.js` — `saveResultadoPrevisualización(projectId, data)`, `getResultadoPrevisualización(projectId)`
- [ ] Preview screen: project type selector (dropdown of supported types)
- [ ] Dimension inputs (fields change per project type)
- [ ] Colour assignment per section (use react-native-color-picker)
- [ ] Stitch pattern selector per section
- [ ] Real-time Skia canvas render as user changes parameters
- [ ] "Guardar resultado" → confirm overwrite if exists → save parameters to Firestore
- [ ] Canvas regenerates from saved parameters on every project open (not stored as image)
- [ ] "Guardar captura en diario" option
- [ ] Show error if selected project type has no template yet
- [ ] Component test: canvas renders without crashing given valid params

---

## Slice 7 — Interactive journal (RF-05, RF-06, CU-05)
- [ ] Install `react-native-color-picker`
- [ ] `services/firestore.js` — `saveDiario(projectId, data)`, `getDiario(projectId)`, `addEntradaColor(projectId, colorData)`, `getColores(projectId)`, `deleteEntradaColor(projectId, colorId)`
- [ ] `services/storage.js` — `uploadPatron(uid, projectId, file)`, `uploadInspiracion(uid, projectId, file)`, `deleteFile(path)`
- [ ] Journal screen: free text area (auto-saves on change)
- [ ] Row counter: increment / decrement / reset buttons, saves `contadorFilas` to Firestore
- [ ] Timer: start/stop, accumulates `timer` in seconds, saves on stop
- [ ] Colour palette: add colour (name + hex via colour picker), display swatches, delete colour
- [ ] Upload PDF pattern: file picker → upload to `/patrones/{uid}/{projectId}/` → save URL reference in `archivosPatron` subcollection
- [ ] Upload inspiration image: image picker → lazy-load thumbnail → upload to `/inspiracion/{uid}/{projectId}/` → save URL reference
- [ ] Show upload error and allow retry without losing other journal content
- [ ] Export journal as PDF (use a PDF generation library compatible with Expo)
- [ ] Receive optional result from calculator or preview as a journal entry
- [ ] Component test: row counter increments correctly and calls save

---

## Slice 8 — Save flow & result management (RF-06, RF-07)
- [ ] Reusable `ConfirmationModal` component (title, message, confirm/cancel buttons)
- [ ] Wire confirmation modal to: delete project, overwrite calculator result, overwrite preview result, delete account
- [ ] `ResultSummaryCard` component — shows saved result date + key value for each tool, used on project detail
- [ ] "Reemplazar resultado" UX: inform user a result already exists → show existing date → confirm before overwriting

---

## Slice 9 — User profile (RF-03)
- [ ] Profile screen: display nombre, fotoPerfil (avatar), email (from Firebase Auth), fechaRegistro
- [ ] Edit profile: update nombre, upload new profile photo → save to Firestore
- [ ] Delete account: confirmation dialog → delete `users/{uid}` document → delete all user's projects (soft then scheduled hard) → `Firebase Auth deleteUser()` (RGPD compliance)
- [ ] Settings screen: placeholder for future app-level settings

---

## Slice 10 — Performance & accessibility (RNF-01, RNF-02, RNF-03, RNF-07)
- [ ] Lazy load all images throughout the app (`<Image>` with placeholder)
- [ ] Paginate project list at 20 items with "load more" or infinite scroll
- [ ] Verify app cold start < 3 s on a mid-range Android emulator
- [ ] Verify all user actions respond < 3 s
- [ ] Check colour contrast ratios for all text/background combinations against WCAG 2.1 AA (4.5:1 minimum)
- [ ] Test with system font size set to largest — ensure no text truncates or overflows
- [ ] Test on tablet viewport — verify layout adapts correctly (RNF-03)
- [ ] Limit session data transfer to ~5 MB typical use (verify with Firebase emulator)

---

## Slice 11 — Security hardening (RNF-04)
- [ ] Write and deploy Firestore security rules: `allow read, write: if request.auth.uid == resource.data.uId`
- [ ] Write and deploy Firebase Storage rules: `allow read, write: if request.auth.uid == <uid from path>`
- [ ] Verify rules in Firebase emulator: user A cannot read user B's projects
- [ ] Verify unauthenticated requests are rejected
- [ ] Remove all `console.log` statements that could expose user data before release

---

## Slice 12 — Testing (Sprint 6)
- [ ] Unit tests: all `calculadora.js` functions (see Slice 5 for specifics)
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

## Slice 13 — Deployment prep (Sprint 7)
- [ ] Configure `app.json` / `app.config.js`: app name "LanaLibre", bundle IDs, icons, splash screen
- [ ] Build for Android with `eas build --platform android`
- [ ] Build for iOS with `eas build --platform ios`
- [ ] Submit to Google Play Store (internal test track first)
- [ ] Submit to Apple App Store (TestFlight first)
- [ ] Verify Firebase plan is on Blaze (pay-as-you-go) for production Storage usage
- [ ] Final smoke test on physical iOS and Android devices
