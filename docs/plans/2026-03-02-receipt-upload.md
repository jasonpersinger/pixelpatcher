# Receipt Upload — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-expense receipt photo upload — red dot means no receipt, green dot means receipt attached; dots are clickable to upload or view.

**Architecture:** Firebase Storage holds photos at `users/{uid}/receipts/{expenseId}`. Each expense record gains an optional `receiptUrl` field. A modal with "Choose File" and "Take Photo" options handles upload. The receipt dot column is added to the expense table. Storage security rules mirror Firestore rules.

**Tech Stack:** Firebase JS SDK v10 (compat), Firebase Storage, vanilla JS. Output file: `/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html`.

---

## Task 1: Initialize Firebase Storage

**Step 1: Use Firebase MCP `firebase_init` with storage feature**

Call `firebase_init` with:
```json
{
  "features": {
    "storage": {
      "rules": "rules_version = '2';\nservice firebase.storage {\n  match /b/{bucket}/o {\n    match /users/{userId}/receipts/{expenseId} {\n      allow read, write: if request.auth != null && request.auth.uid == userId;\n    }\n  }\n}",
      "rules_filename": "storage.rules"
    }
  }
}
```

This creates `Accounting/storage.rules` locally.

**Step 2: Set Storage rules in Firebase Console**

Firebase Storage rules must be activated manually:
1. Go to https://console.firebase.google.com → select `pixelpatcher-accounting`
2. Build → Storage → Get started (if not already provisioned) → choose `us-east1`
3. Rules tab → paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/receipts/{expenseId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Click **Publish**

**Step 3: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/storage.rules Accounting/firebase.json
git commit -m "feat: add Firebase Storage configuration and security rules"
```

---

## Task 2: Add Firebase Storage SDK Script + Init

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add CDN script to `<head>`**

Find:
```html
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
```

Replace with:
```html
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-storage-compat.js"></script>
```

**Step 2: Initialize storage instance**

Find:
```js
const fsdb   = firebase.firestore();
const fsauth = firebase.auth();
```

Replace with:
```js
const fsdb      = firebase.firestore();
const fsauth    = firebase.auth();
const fsstorage = firebase.storage();
```

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Firebase Storage SDK and init"
```

---

## Task 3: Add Receipt Upload Modal HTML

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add modal HTML before `<div id="signin-overlay"`**

Find:
```html
<div id="signin-overlay"
```

Insert immediately before it:
```html
<div id="receipt-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85);
     z-index:999; align-items:center; justify-content:center; flex-direction:column;">
  <div style="background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
              padding:32px; width:320px; text-align:center;">
    <div style="font-family:var(--font); font-size:13px; color:var(--text);
                font-weight:700; margin-bottom:24px;">Attach Receipt</div>
    <div style="display:flex; gap:12px; justify-content:center; margin-bottom:20px;">
      <button onclick="document.getElementById('receipt-file-input').click()"
        style="background:var(--accent); color:#000; border:none; padding:12px 20px;
               font-size:13px; font-weight:700; border-radius:var(--radius); cursor:pointer;
               font-family:var(--font);">
        &#128193; Choose File
      </button>
      <button onclick="document.getElementById('receipt-camera-input').click()"
        style="background:var(--card); color:var(--text); border:1px solid var(--border);
               padding:12px 20px; font-size:13px; font-weight:700; border-radius:var(--radius);
               cursor:pointer; font-family:var(--font);">
        &#128247; Take Photo
      </button>
    </div>
    <div id="receipt-progress"
         style="font-size:12px; color:var(--muted); font-family:var(--font); min-height:18px;">
    </div>
    <button onclick="closeReceiptModal()"
      style="margin-top:16px; background:none; border:none; color:var(--muted);
             font-size:12px; cursor:pointer; font-family:var(--font);">
      Cancel
    </button>
    <input id="receipt-file-input"   type="file" accept="image/*"
           style="display:none" onchange="handleReceiptFile(event)">
    <input id="receipt-camera-input" type="file" accept="image/*" capture="environment"
           style="display:none" onchange="handleReceiptFile(event)">
  </div>
</div>

```

**Step 2: Verify**

Open in browser — modal should not be visible on load.

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add receipt upload modal HTML"
```

---

## Task 4: Add Receipt Upload JS Functions

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

All new code goes in the `<script>` block. Add immediately after the `fsauth.onAuthStateChanged` block.

**Step 1: Find the insertion point**

Find:
```js
// ── Auth state handler ────────────────────────────────────────────────────────
fsauth.onAuthStateChanged(async user => {
```

Find the closing `});` of that block, then add the following immediately after:

```js
// ── Receipt upload ────────────────────────────────────────────────────────────
let _receiptExpenseId = null;

function openReceiptModal(expenseId) {
  _receiptExpenseId = expenseId;
  document.getElementById('receipt-progress').textContent = '';
  document.getElementById('receipt-file-input').value   = '';
  document.getElementById('receipt-camera-input').value = '';
  const modal = document.getElementById('receipt-modal');
  modal.style.display = 'flex';
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').style.display = 'none';
  _receiptExpenseId = null;
}

function handleReceiptFile(event) {
  const file = event.target.files[0];
  if (!file || !_receiptExpenseId) return;
  const user = fsauth.currentUser;
  if (!user) return;

  const progressEl = document.getElementById('receipt-progress');
  progressEl.textContent = 'Uploading\u2026';

  const path = 'users/' + user.uid + '/receipts/' + _receiptExpenseId;
  const ref  = fsstorage.ref(path);

  ref.put(file).then(snapshot => snapshot.ref.getDownloadURL()).then(url => {
    const expenses = DB.get('pp_expenses') || [];
    DB.set('pp_expenses', expenses.map(e =>
      e.id === _receiptExpenseId ? Object.assign({}, e, { receiptUrl: url }) : e
    ));
    closeReceiptModal();
    renderExpenses();
  }).catch(err => {
    console.warn('Receipt upload failed:', err);
    progressEl.textContent = 'Upload failed. Please try again.';
  });
}

function viewReceipt(url) {
  window.open(url, '_blank', 'noopener');
}

```

**Step 2: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add receipt upload and view JS functions"
```

---

## Task 5: Add Receipt Dot Column to Expense Table

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add `<th>` to table header**

Find:
```html
        <th>Date</th><th>Category</th><th>Description</th><th>Vendor</th>
        <th>Amount</th><th>Method</th><th>Notes</th><th></th>
```

Replace with:
```html
        <th>Date</th><th>Category</th><th>Description</th><th>Vendor</th>
        <th>Amount</th><th>Method</th><th>Notes</th><th>Receipt</th><th></th>
```

**Step 2: Add receipt dot to each expense row**

Find:
```html
              <td><button class="btn btn-danger" onclick="deleteExpense('${esc(e.id)}')">&#x2715;</button></td>
```

Replace with:
```html
              <td>
                ${e.receiptUrl
                  ? `<button class="btn" title="View receipt"
                       onclick="viewReceipt('${esc(e.receiptUrl)}')"
                       style="color:var(--positive);background:none;border:none;
                              font-size:16px;cursor:pointer;padding:0 4px">&#x25CF;</button>`
                  : `<button class="btn" title="Attach receipt"
                       onclick="openReceiptModal('${esc(e.id)}')"
                       style="color:var(--negative);background:none;border:none;
                              font-size:16px;cursor:pointer;padding:0 4px">&#x25CF;</button>`}
              </td>
              <td><button class="btn btn-danger" onclick="deleteExpense('${esc(e.id)}')">&#x2715;</button></td>
```

**Step 3: Update empty-state colspan from 8 to 9**

Find:
```html
          ? '<tr><td colspan="8" style="color:var(--muted);text-align:center;padding:24px">No expenses yet</td></tr>'
```

Replace with:
```html
          ? '<tr><td colspan="9" style="color:var(--muted);text-align:center;padding:24px">No expenses yet</td></tr>'
```

**Step 4: Verify in browser**

- [ ] Expense table has a Receipt column
- [ ] All existing expenses show a red dot
- [ ] Clicking red dot opens the upload modal
- [ ] Choosing a file → "Uploading…" appears → dot turns green
- [ ] Clicking green dot opens the receipt in a new tab
- [ ] Reload page → green dot persists (receiptUrl stored in Firestore)

**Step 5: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add receipt dot column to expense table"
```

---

## Task 6: Deploy and Final Verification

**Step 1: Deploy to Firebase Hosting**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting,storage
```

**Step 2: Verify at live URL**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html

- [ ] Receipt column shows for all expenses
- [ ] Red dot → modal opens with "Choose File" and "Take Photo"
- [ ] Upload completes → dot turns green → data persists after reload
- [ ] Green dot → receipt opens in new tab
- [ ] Firebase Console → Storage → `users/{uid}/receipts/` → file appears

---

## Final Checklist

- [ ] Firebase Storage initialized and rules published
- [ ] Storage SDK loaded in `<head>`
- [ ] Upload modal appears and closes cleanly
- [ ] File and camera inputs both trigger upload handler
- [ ] Receipt URL written to expense record and synced to Firestore
- [ ] Receipt dot column visible in expense table
- [ ] Green dot opens receipt in new tab
- [ ] Works on live Firebase Hosting URL
