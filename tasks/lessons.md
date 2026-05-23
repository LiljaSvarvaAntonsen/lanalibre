# LanaLibre — lessons.md

Add a rule here every time Claude makes a mistake and you correct it.
The goal: each rule prevents the same mistake from happening again.

## Format
> **[date] Mistake:** what went wrong
> **Rule:** what to do instead, always

---

<!-- Rules will accumulate here during development -->

> **[2026-05-16] Mistake:** jest-expo@55 was installed for Expo SDK 54, causing a jest-mock version mismatch (`clearMocksOnScope is not a function`) and requiring jest to be downgraded to 29.
> **Rule:** jest-expo version must match the Expo SDK major version (SDK 54 → jest-expo@~54.0.0, jest@^29.7.0). Check both when setting up or upgrading.

> **[2026-05-17] Mistake:** `react-native-color-picker` v0.6.0 uses string refs (`ref="pickerContainer"`) internally, which React 19 removed entirely. Passing `sliderComponent` prop does not help — the string ref crash fires first during render.
> **Rule:** Do not install `react-native-color-picker` in projects using React 19+. Build a swatch grid or use a React-19-compatible alternative instead.

> **[2026-05-17] Mistake:** `useAuth()` was called inside individual screens. Each call creates a new `onAuthStateChanged` subscription with its own local state, so `devSignIn()` (which bypasses Firebase and only mutates the AuthRouter's hook instance) left all other screens with `user = null`. This caused `DiarioScreen` to show infinite loading and silently discard the "Crear" action.
> **Rule:** Never call `useAuth()` inside individual screens to get the user. Auth state must be provided once at the app root via `AuthProvider` (`contexts/AuthContext.js`). All screens call `useAuth()` which now reads from that single shared context, so `devSignIn` and real Firebase sign-in both propagate everywhere instantly.

> **[2026-05-17] Mistake:** Firebase Storage uploads fail silently for the dev bypass user (`uid === 'dev-user'`) because it has no real auth token — the upload throws `Network request failed` and the image never appears on the canvas.
> **Rule:** Always check `user.uid === 'dev-user'` before any Firebase Storage upload. If true, use the local URI directly (e.g. a `data:image/png;base64,...` URI) instead of uploading, so the feature can be tested end-to-end during development without real auth.

> **[2026-05-21] Lesson:** Canvas elements (TextBoxWidget, RowCounterWidget) must never use theme colours for text or card backgrounds. The journal canvas is always white (`backgroundColor: '#FFFFFF'`), so hardcode canvas text to `#2C2C2A` and card backgrounds to `#FFFFFF`. Using `colors.text.primary` makes text invisible in dark mode.
> **Rule:** In `makeStyles` for `EntradaDiarioScreen`, any style that applies to a canvas element (textBox, rowCard, rowCount) must use hardcoded light-theme values, not theme variables.

> **[2026-05-21] Lesson:** `expo-file-system` is not automatically installed as a direct dependency — it was missing from `package.json` despite being used in `services/exportData.js`. This caused a silent failure at runtime. Always `npx expo install expo-file-system` explicitly when using `FileSystem.writeAsStringAsync` or `FileSystem.cacheDirectory`.
> **Rule:** Any Expo SDK module used via `import * as X from 'expo-x'` must be listed as a direct dependency in `package.json`. Transitive dependency availability is unreliable across SDK versions.

> **[2026-05-21] Lesson:** `expo-notifications` push notifications are not supported in Expo Go SDK 53+. Use a dev client or EAS build for real notifications. During development use a mock implementation with a Toast message explaining that notifications will work in the published version of the app. Real push notification scheduling will be implemented in Slice 14 during deployment.

> **[2026-05-23] Lesson:** The navigation background flash between screens in Expo Go is a known limitation of React Navigation with Expo Go on Android. It may not be present in a production EAS build. Do not spend more time on this — move on and test in the EAS build in Slice 14.
