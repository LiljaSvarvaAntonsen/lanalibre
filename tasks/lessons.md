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

> **[2026-05-17] Mistake:** `useAuth()` was called inside individual screens. Each call creates a new `onAuthStateChanged` subscription with its own local state, so `devSignIn()` (which bypasses Firebase and only mutates the AuthRouter's hook instance) left all other screens with `user = null`. This caused `DiarioScreen` to show infinite loading and silently discard the "Crear" action.
> **Rule:** Never call `useAuth()` inside individual screens to get the user. Auth state must be provided once at the app root via `AuthProvider` (`contexts/AuthContext.js`). All screens call `useAuth()` which now reads from that single shared context, so `devSignIn` and real Firebase sign-in both propagate everywhere instantly.
