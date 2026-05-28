# LanaLibre 🧶

A free mobile application for crochet project planning, built with React Native and Firebase.

## About

LanaLibre is a cross-platform mobile app designed for intermediate to advanced crochet enthusiasts who want to plan, calculate and document their projects in one place. The app provides three core tools:

- **Yarn Calculator** — estimates yarn consumption in grams and skeins based on tension, stitch type and project dimensions
- **Blanket Designer** — visualises colour patterns in real time with vertical stripes, horizontal stripes and granny squares
- **Interactive Journal** — a free-form canvas with text boxes, row counter, colour painting, crochet stitch symbols and file uploads

## Features

-  Google and Apple OAuth authentication via Firebase
-  Three languages: Spanish (default), English and Norwegian
-  Light and dark mode
-  Project management with soft delete and 30-day recovery
-  Results saved to projects with overwrite confirmation
-  Diary entries linked optionally to projects
-  Firestore security rules — users can only access their own data
-  Built and deployed as Android APK via EAS Build

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 + Expo SDK 54 |
| Navigation | React Navigation v6 |
| Backend | Firebase (Auth, Firestore, Storage) |
| Internationalisation | i18next + expo-localization |
| Testing | Jest + React Native Testing Library |
| Build | EAS Build (Expo Application Services) |
| Design | Figma |

## Architecture

The app follows a three-layer architecture:

Presentation  →  screens/ + components/
Logic         →  services/calculadora.js + services/previsualización.js
Data          →  services/firestore.js + services/storage.js + services/auth.js

Design patterns applied: Repository, Observer, Singleton.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Expo CLI: `npm install -g expo`
- Expo Go app on your physical device
- A Firebase project with Authentication, Firestore and Storage enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/LiljaSvarvaAntonsen/lanalibre.git

# Navigate to the project folder
cd lanalibre

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Fill in your Firebase configuration values
```

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
```

### Firebase Setup

1. Enable Google and Apple as Authentication providers
2. Create Firestore in test mode or deploy the rules from `firestore.rules`
3. Enable Firebase Storage on the Blaze plan
4. Add the SHA-1 fingerprint of your keystore to the Firebase Android app
5. Download `google-services.json` and place it in the project root
6. Create the three required composite indexes — the app will show error links on first run if they are missing

### Running in Development

```bash
npm start
```

Scan the QR code with Expo Go on your physical device.

## Testing

```bash
# Run the full test suite
npm test

# Run with coverage report
npm test -- --coverage
```

The test suite contains 86 tests across unit, integration and component categories.

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build Android APK
eas build --platform android --profile preview
```

See the EAS Build documentation for full deployment instructions.

## Project Structure

lanalibre/
├── assets/              # Images, fonts, icons
├── components/          # Reusable UI components
│   └── journal/         # Journal canvas components
├── constants/           # Colors, typography, spacing
├── contexts/            # AuthContext, ThemeContext, NavigationGuardContext
├── hooks/               # useProjects, custom hooks
├── i18n/                # Locale files (es, en, nb)
│   └── locales/
├── navigation/          # MainTabs, stack navigators
├── screens/             # All app screens
├── services/            # Firebase, calculator, preview logic
├── utils/               # Date formatting helpers
├── tests/           # Jest test files
├── app.json             # Expo configuration
├── eas.json             # EAS Build profiles
└── firestore.rules      # Firestore security rules

## Security

- Firestore rules enforce `request.auth.uid == resource.data.uId` on all documents
- Storage rules mirror the same UID-based path structure
- The `.env` file is in `.gitignore` and never committed to the repository
- `CLAUDE.md` is in `.gitignore` and never committed to the repository

## Author

**Lilja Svarva Antonsen**  
2º DAM Dual — CPI Los Enlaces, Zaragoza  
Final Degree Project 2025–2026

## License

This project was developed as a final degree project and is not currently licensed for public distribution.