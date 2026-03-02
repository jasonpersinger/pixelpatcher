# Firestore Write-Through Sync — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-sync the Pixel Patcher accounting app to Firebase Firestore — every write mirrors to the cloud instantly, and Firestore is the authoritative source on load.

**Architecture:** Firebase compat SDK (CDN) loaded in `<head>`. `DB.set` enhanced to mirror to Firestore after every localStorage write (fire-and-forget). On authenticated load, all `pp_*` keys are fetched from Firestore and written to localStorage before first render. Google Sign-In gates access; data is scoped to `/users/{uid}/data/{key}` in Firestore.

**Tech Stack:** Firebase JS SDK v10 (compat), Firestore (native mode), Firebase Auth (Google Sign-In provider), vanilla JS.

**Output File:** `/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html`

---

## Task 1: Firebase Project Setup

This task is interactive — it uses the Firebase MCP tools to create the project and retrieve the web app config.

**Step 1: Log into Firebase**

Use the Firebase MCP login tool. Follow the browser auth flow when the URL appears.

**Step 2: Create the Firebase project**

Use the Firebase MCP `firebase_create_project` tool:
- project_id: `pixelpatcher-accounting`
- display_name: `Pixel Patcher Accounting`

If that ID is taken, try `pixelpatcher-acct-2026`.

**Step 3: Set the active project**

Use `firebase_update_environment` with:
- project_dir: `/home/jason/Desktop/PIXELPATCHER/Accounting`
- active_project: `pixelpatcher-accounting` (or whichever ID succeeded)

**Step 4: Initialize Firestore and Auth**

Use `firebase_init` with:
```json
{
  "features": {
    "firestore": {
      "location_id": "us-east1"
    }
  }
}
```

**Step 5: Enable Google Sign-In via Firebase console**

Firebase Auth cannot be enabled via the MCP — the user must do this manually:
1. Go to https://console.firebase.google.com → select `pixelpatcher-accounting`
2. Build → Authentication → Get started
3. Sign-in method → Google → Enable → add support email → Save

**Step 6: Register the web app and get config**

Use `firebase_create_app` with platform: `web`, display_name: `Pixel Patcher Accounting Web`

Then use `firebase_get_sdk_config` with platform: `web` to retrieve the config object. It will look like:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "pixelpatcher-accounting.firebaseapp.com",
  projectId: "pixelpatcher-accounting",
  storageBucket: "pixelpatcher-accounting.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**Save this config — it's needed in Task 2.**

**Step 7: No commit needed** — nothing in the repo has changed yet.

---

## Task 2: Add Firebase SDK Scripts + Init Block

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add CDN scripts in `<head>`, after the Google Fonts link**

Find:
```html
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
  <style>
```

Replace with:
```html
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
  <!-- Firebase SDK (compat) -->
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
  <style>
```

**Step 2: Add Firebase init at the top of the `<script>` block**

Find the line:
```js
// ── XSS safety: all user strings escaped before innerHTML insertion ──────────
```

Insert this block immediately before it (paste actual config values from Task 1):
```js
// ── Firebase init ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const fsdb   = firebase.firestore();
const fsauth = firebase.auth();

```

**Step 3: Verify in browser console**

Open the file in Chrome. Open DevTools → Console.
- [ ] No "firebase is not defined" errors
- [ ] No "initializeApp" errors
- [ ] `firebase.apps.length` returns `1` in console

**Step 4: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Firebase SDK and init block"
```

---

## Task 3: Add Sign-In Overlay HTML + CSS

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add overlay div to body**

Find:
```html
<div id="app">
```

Insert this immediately before it:
```html
<div id="signin-overlay" style="display:flex; position:fixed; inset:0; background:#000;
     z-index:1000; align-items:center; justify-content:center; flex-direction:column;">
  <div style="font-family:var(--font-pixel); font-size:9px; color:var(--accent);
              letter-spacing:1px; margin-bottom:12px;">&#9632; PIXEL PATCHER</div>
  <div style="font-size:12px; color:var(--muted); margin-bottom:40px;
              font-family:var(--font);">Accounting</div>
  <button onclick="signInWithGoogle()"
    style="background:var(--accent); color:#000; border:none; padding:14px 32px;
           font-size:14px; font-weight:700; border-radius:var(--radius); cursor:pointer;
           font-family:var(--font);">
    Sign in with Google
  </button>
  <div id="signin-error"
    style="color:var(--negative); font-size:12px; margin-top:16px; font-family:var(--font);">
  </div>
</div>

```

Note: `display:flex` means it shows by default — the auth handler will hide it once signed in.

**Step 2: Verify**

Open in Chrome.
- [ ] Full-screen black overlay with gold "◼ PIXEL PATCHER" and "Sign in with Google" button appears
- [ ] App content is hidden behind it

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add sign-in overlay for Firebase auth gate"
```

---

## Task 4: Add Auth Layer and Firebase Helpers

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

All new code goes in the `<script>` block. Add it immediately after the `firebase.initializeApp` block from Task 2.

**Step 1: Add the auth + sync helpers block**

Find:
```js
const fsdb   = firebase.firestore();
const fsauth = firebase.auth();

```

Add this immediately after:
```js
// ── Auth ─────────────────────────────────────────────────────────────────────
const FS_KEYS = ['pp_settings','pp_income','pp_expenses','pp_mileage','pp_jobs','pp_seeded'];

function showSignInOverlay() {
  document.getElementById('signin-overlay').style.display = 'flex';
}
function hideSignInOverlay() {
  document.getElementById('signin-overlay').style.display = 'none';
}

function signInWithGoogle() {
  document.getElementById('signin-error').textContent = '';
  const provider = new firebase.auth.GoogleAuthProvider();
  fsauth.signInWithPopup(provider).catch(() => {
    document.getElementById('signin-error').textContent = 'Sign-in failed. Please try again.';
  });
}

// ── Sync status ───────────────────────────────────────────────────────────────
function updateSyncStatus(state) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  if (state === 'syncing') {
    el.innerHTML = '<span style="color:var(--accent)">&#x27F3; Syncing</span>';
  } else if (state === 'synced') {
    el.innerHTML = '<span style="color:var(--positive)">&#x25CF; Synced</span>';
  } else {
    el.innerHTML = '<span style="color:var(--muted)">&#x25CB; Offline</span>';
  }
}

// ── Firestore write helper ────────────────────────────────────────────────────
function firestoreSet(key, value) {
  const user = fsauth.currentUser;
  if (!user || !FS_KEYS.includes(key)) return;
  updateSyncStatus('syncing');
  fsdb.collection('users').doc(user.uid).collection('data').doc(key)
    .set({ value })
    .then(() => updateSyncStatus('synced'))
    .catch(err => {
      console.warn('Firestore write failed:', err);
      updateSyncStatus('offline');
    });
}

// ── Load from Firestore on login ──────────────────────────────────────────────
async function loadFromFirestore(uid) {
  updateSyncStatus('syncing');
  try {
    const snap = await fsdb.collection('users').doc(uid).collection('data').get();
    if (!snap.empty) {
      snap.forEach(doc => {
        localStorage.setItem(doc.id, JSON.stringify(doc.data().value));
      });
    }
    updateSyncStatus('synced');
  } catch (err) {
    console.warn('Firestore load failed, using localStorage:', err);
    updateSyncStatus('offline');
  }
}

// ── Auth state handler ────────────────────────────────────────────────────────
fsauth.onAuthStateChanged(async user => {
  if (user) {
    hideSignInOverlay();
    await loadFromFirestore(user.uid);
    seedData();
    renderDashboard();
  } else {
    showSignInOverlay();
  }
});

```

**Step 2: Remove the two standalone calls at the bottom of the script**

Find these two lines near the very end of the script (around line 820):
```js
// Initial render
renderDashboard();
```

Replace with:
```js
// Initial render triggered by fsauth.onAuthStateChanged above
```

Also find the standalone `seedData();` call (around line 227) and remove it — it is now called inside the auth handler.

**Step 3: Verify in browser**

- [ ] Page loads → sign-in overlay appears
- [ ] Click "Sign in with Google" → Google account picker pops up
- [ ] After signing in → overlay disappears, dashboard renders
- [ ] DevTools Console → no errors
- [ ] Reload page → overlay does NOT appear again (silent auto-login)

**Step 4: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Firebase auth flow with Google Sign-In"
```

---

## Task 5: Wire DB.set to Mirror to Firestore

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Update the DB.set method**

Find:
```js
const DB = {
  get:  key       => JSON.parse(localStorage.getItem(key) || 'null'),
  set:  (key, v)  => localStorage.setItem(key, JSON.stringify(v)),
  push: (key, obj) => { const a = DB.get(key) || []; a.push(obj); DB.set(key, a); },
  del:  (key, id)  => DB.set(key, (DB.get(key) || []).filter(x => x.id !== id)),
};
```

Replace with:
```js
const DB = {
  get:  key       => JSON.parse(localStorage.getItem(key) || 'null'),
  set:  (key, v)  => {
    localStorage.setItem(key, JSON.stringify(v));
    firestoreSet(key, v);
  },
  push: (key, obj) => { const a = DB.get(key) || []; a.push(obj); DB.set(key, a); },
  del:  (key, id)  => DB.set(key, (DB.get(key) || []).filter(x => x.id !== id)),
};
```

**Step 2: Verify in browser**

- [ ] Sign in → go to Expenses → click "+ Add Expense" → add a test expense
- [ ] Sync indicator shows gold "⟳ Syncing" briefly, then green "● Synced"
- [ ] Open Firebase Console → Firestore → `users/{uid}/data/pp_expenses` → document exists with your expense in the `value` array

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: wire DB.set to mirror writes to Firestore"
```

---

## Task 6: Add Sync Status Indicator to Sidebar

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add status element to sidebar footer**

Find:
```html
    <div class="sidebar-footer">
      <button onclick="exportCSV()">Export CSV</button>
```

Replace with:
```html
    <div class="sidebar-footer">
      <div id="sync-status" style="font-size:11px; text-align:center;
           padding: 4px 0 8px; font-family:var(--font); color:var(--muted)">
        &#x25CB; Not connected
      </div>
      <button onclick="exportCSV()">Export CSV</button>
```

**Step 2: Verify**

- [ ] Sidebar footer shows "○ Not connected" before sign-in
- [ ] After sign-in: shows gold "⟳ Syncing" while loading, then green "● Synced"
- [ ] After adding any record: briefly shows gold, then returns to green

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add sync status indicator to sidebar"
```

---

## Task 7: Set Firestore Security Rules

**Step 1: Use the Firebase MCP `firebase_get_security_rules` tool**

Fetch current rules for type: `firestore` to see what's there.

**Step 2: The rules to apply**

The Firestore rules must be set via Firebase Console since the MCP `firebase_init` sets rules from a file. Go to:

Firebase Console → Firestore Database → Rules tab → paste:

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

Click **Publish**.

**Step 3: Verify**

- [ ] In DevTools Console: `firebase.auth().currentUser.uid` → shows your UID
- [ ] Firestore Console → Rules → Playground → simulate a write to `/users/{your-uid}/data/pp_jobs` as your user → **Allow**
- [ ] Simulate a write without auth → **Deny**

**Step 4: Commit the rules file**

After setting via console, the `firestore.rules` file in the Accounting directory will reflect the rules. Commit it:

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/firestore.rules Accounting/firestore.indexes.json Accounting/firebase.json
git commit -m "feat: add Firestore security rules locking data to authenticated user"
```

---

## Task 8: End-to-End Verification

**Step 1: Fresh-state test**

1. Open DevTools → Application → Local Storage → clear all `pp_*` keys
2. Reload page → overlay appears
3. Sign in → data loads from Firestore → dashboard shows existing data
4. - [ ] Data survived the localStorage wipe

**Step 2: Cross-device test (optional but recommended)**

1. Open the HTML file on a second device (or a different Chrome profile)
2. Sign in with the same Google account
3. - [ ] Same data appears — jobs, expenses, everything

**Step 3: Offline test**

1. DevTools → Network tab → set throttling to "Offline"
2. Add an expense
3. - [ ] localStorage updates immediately, UI updates
4. - [ ] Sync indicator shows "○ Offline"
5. Go back online → reload
6. - [ ] Data is still there (from localStorage)
7. - [ ] Indicator returns to "● Synced"

---

## Final Checklist

- [ ] Sign-in overlay appears on first open, never again after
- [ ] All writes show Syncing → Synced in sidebar
- [ ] Firestore Console shows data under `users/{uid}/data/`
- [ ] Security rules deny unauthenticated access
- [ ] App works offline (localStorage fallback)
- [ ] Backup JSON and Export CSV still work unchanged
