# LanaLibre — Architecture summary

## What the app does
LanaLibre is a free React Native / Expo mobile app for iOS and Android. Users create crochet projects and work on them using three tools: a yarn calculator, a design preview canvas, and an interactive journal. All data is private per user and stored in Firebase.

## Three-layer architecture

```
┌─────────────────────────────────────┐
│  Presentation layer                 │
│  screens/, components/              │
│  React Native + React Navigation v6 │
├─────────────────────────────────────┤
│  Logic layer                        │
│  services/calculadora.js            │
│  services/previsualización.js       │
│  (pure JS, no Firebase here)        │
├─────────────────────────────────────┤
│  Data layer                         │
│  services/firestore.js              │
│  services/storage.js                │
│  services/auth.js                   │
└─────────────────────────────────────┘
         │
         ▼
   Firebase (Auth + Firestore + Storage)
```

UI components call logic services. Logic services call data services. Data services call Firebase. Components never touch Firebase directly.

## Design patterns in use
- **Repository** — all Firestore/Storage operations behind service functions; components are decoupled from the database
- **Observer** — Firestore real-time listeners propagate data changes to the UI automatically
- **Singleton** — Firebase initialised once at app start and reused across all modules

## Main entities

### User
Stored at `users/{uid}` (UID comes from Firebase Auth). Fields: `nombre` (String), `fotoPerfil` (URL String), `fechaRegistro` (Timestamp).

### Project
Stored at `projects/{projectId}`. Fields: `uId` (owner UID), `nombre`, `etiqueta` (planificado / en progreso / finalizado), `fechaCreacion`, `deletedAt` (null when active, Timestamp when soft-deleted).

Each project document contains three embedded objects — one result per tool:

- `resultadoCalculadora` — `pesoLana`, `tension`, `tamanioGanchillo`, `dimensiones`, `resultadoGramos`, `fechaActualizacion`
- `resultadoPrevisualización` — `tipoProyecto`, `medidas`, `colores` (Array), `patronPuntos`, `fechaActualizacion`
- `diario` — `textoLibre`, `contadorFilas`, `timer`, `fechaActualizacion`

Each project also has three subcollections for variable-length data:
- `colores/` — `{ nombre, valorHex }` per yarn colour in the palette
- `archivosPatron/` — `{ urlStorage, fechaSubida }` per uploaded PDF pattern
- `archivosInspiracion/` — `{ urlStorage, fechaSubida }` per inspiration image

### Files in Firebase Storage
```
/patrones/{uid}/{projectId}/{archivoId}       ← PDF patterns
/inspiracion/{uid}/{projectId}/{archivoId}    ← inspiration images
/previsualizaciones/{uid}/{projectId}/{id}    ← optional preview snapshots
```

## Key data flows

### Authentication
App open → check Firebase Auth session → if no session, show login screen → user picks Google or Apple OAuth → Firebase returns token → app checks `users/{uid}` in Firestore → creates document if new user → navigates to project list.

### Yarn calculator
User opens calculator in a project → load `resultadoCalculadora` from Firestore (pre-fill form if exists) → user enters parameters → JS formula runs client-side → result shown with 10% margin → user chooses to save → if existing result, confirm overwrite → save to `projects/{projectId}.resultadoCalculadora` → optionally append to `diario`.

**Formula:**
```
metrosPor100g = metrosEtiqueta / (gramosEtiqueta / 100)
areaProyecto  = ancho × largo  (cm²)
densidad      = (tension / 10)²
metrosTotales = (areaProyecto × densidad × multiplicadorPunto) / 10
gramosTotales = metrosTotales / metrosPor100g × 100
resultadoFinal = gramosTotales × 1.10   ← always +10% margin
```

Stitch multipliers: punto bajo 1.0 · punto alto 0.7 · puntos densos 1.3

### Design preview
User selects project type → enters dimensions and colours → React Native Skia renders a grid canvas in real time (each cell = one stitch unit, filled with the selected colour) → parameters saved to Firestore → canvas regenerates from those parameters every time the project is opened (not stored as a file).

### Interactive journal
Auto-saves on every change. Stores free text, row counter state, timer accumulation, and the colour palette. PDFs and images upload to Firebase Storage; the URL reference is saved in the relevant subcollection. Journal can be exported as a PDF.

### Delete cycle
Soft delete: `deletedAt` = now → project hidden from list → recoverable for 30 days. Hard delete: automatic process after 30 days removes Firestore doc + all subcollections + all Storage files permanently. Both require explicit user confirmation (RF-07).

## Module map
```
/
├── app/                  ← Expo Router screens (or /screens/ if file-based nav not used)
│   ├── auth/             ← login screen
│   ├── projects/         ← project list, create/edit
│   ├── project/[id]/     ← project detail + tool tabs
│   │   ├── calculadora/
│   │   ├── previsualización/
│   │   └── diario/
│   ├── profile/
│   └── settings/
├── components/           ← shared UI components
├── services/
│   ├── auth.js           ← Firebase Auth wrappers
│   ├── firestore.js      ← all Firestore read/write
│   ├── storage.js        ← Firebase Storage wrappers
│   ├── calculadora.js    ← yarn formula (pure JS, unit-testable)
│   └── previsualización.js ← canvas parameter logic
├── hooks/                ← custom React hooks
├── constants/            ← colours, spacing, stitch multipliers
└── firebase.js           ← Firestore/Auth/Storage initialisation (Singleton)
```

## Security model
- Firebase Auth manages all credentials — no passwords stored in the app
- Firestore security rules: every read/write is gated on `request.auth.uid == resource.data.uId`
- Storage rules mirror the same UID-based path structure
- All Firebase traffic is over HTTPS automatically
- Client-side validation runs before any Firebase call
- Composite Firestore index required: `projects` on `(uId ASC, deletedAt ASC, fechaCreacion DESC)` — defined in `firestore.indexes.json`

## Non-functional constraints (from spec)
- Cold start and all user actions < 3 s on mid-range devices (RNF-01)
- Lazy load images, paginate lists > 20 items, < 5 MB per typical session (RNF-02)
- Responsive for phones and tablets (RNF-03)
- WCAG 2.1 AA colour contrast, system text size respected (RNF-07)
- Soft delete 30-day window before permanent removal (RNF-05 / RNF-06)
