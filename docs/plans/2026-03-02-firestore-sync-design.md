# Firestore Sync — Design Document

**Date:** 2026-03-02
**App:** `Accounting/PIXELPATCHER-Accounting.html`

## Goal

Replace manual JSON backup with automatic cloud sync. Every write persists to localStorage immediately and mirrors to Firestore in the background. On load, Firestore is the authoritative source; localStorage is the offline fallback.

## Approach: Option B — Write-Through Mirror

- **localStorage** → immediate, synchronous, offline-capable
- **Firestore** → background async write after every DB.set call
- **On load** → fetch all pp_* keys from Firestore; if available, overwrite localStorage

## Firebase Services

- **Firestore** — document store, one doc per pp_* key
- **Firebase Auth** — Google Sign-In, locks data to user's Google account

## Data Shape

```
/users/{uid}/data/pp_expenses  → { value: [...] }
/users/{uid}/data/pp_income    → { value: [...] }
/users/{uid}/data/pp_mileage   → { value: [...] }
/users/{uid}/data/pp_jobs      → { value: [...] }
/users/{uid}/data/pp_settings  → { value: {...} }
/users/{uid}/data/pp_seeded    → { value: true }
```

Each localStorage key maps to one Firestore document under the authenticated user's path.

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{key} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Auth Flow

1. App loads → `onAuthStateChanged` fires
2. If not signed in → show centered sign-in overlay with "Sign in with Google" button
3. User clicks → Google account picker pop-up → one-time sign-in
4. After sign-in → fetch Firestore data → populate localStorage → render dashboard
5. Subsequent opens → silent auto-login, no UI shown

## SDK Strategy

Firebase compat CDN (v10) — three `<script>` tags in `<head>`:
- `firebase-app-compat.js`
- `firebase-firestore-compat.js`
- `firebase-auth-compat.js`

No build step. Integrates with existing classic JS script unchanged.

## DB Layer Changes

```js
// Original DB.set:
set: (key, v) => localStorage.setItem(key, JSON.stringify(v))

// New DB.set (write-through):
set: (key, v) => {
  localStorage.setItem(key, JSON.stringify(v));
  firestoreSet(key, v); // fire-and-forget, updates sync indicator
}
```

`firestoreSet` updates the sync status indicator: gold "Syncing" while in-flight, green "Synced" on success, muted "Offline" on error.

## Sync Status Indicator

Small dot added to sidebar footer:
- `● Synced` — green, all writes confirmed
- `⟳ Syncing` — gold, write in flight
- `○ Offline` — muted, Firestore unreachable

## Conflict Resolution

- Firestore always wins on load (cross-device authoritative source)
- If Firestore fetch fails: fall back to localStorage silently, show Offline indicator
- No merge logic needed — single user, single active session

## Out of Scope

- Real-time listeners (overkill for single-user tool)
- Multi-user or shared access
- Offline queue / retry logic (Firestore SDK handles this natively)
