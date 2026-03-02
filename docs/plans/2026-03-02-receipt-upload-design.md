# Receipt Upload — Design

**Date:** 2026-03-02
**Feature:** Per-expense receipt photo upload via Firebase Storage

---

## Goal

Add a receipt attachment button to each expense row. Red dot = no receipt, green dot = has receipt. Red dot opens an upload modal; green dot opens the receipt in a new tab.

---

## Architecture

Firebase Storage is added to the project alongside existing Firebase services. A new `firebase-storage-compat.js` CDN script joins the existing SDK scripts in `<head>`. Storage security rules mirror Firestore rules — only the authenticated owner can read/write their receipts.

Each expense record gains one optional field: `receiptUrl` (string, Firebase Storage download URL). When absent or null, the dot is red. When present, the dot is green.

---

## Upload Flow

1. User clicks red dot on an expense row
2. Modal appears with two options:
   - **📁 Choose File** — opens file system / photo library
   - **📷 Take Photo** — opens camera via `<input capture="environment">`
3. Both feed the same upload handler
4. File uploads to `users/{uid}/receipts/{expenseId}` in Firebase Storage
5. Progress indicator shown during upload
6. On success: `receiptUrl` written to expense record via `DB.set`, dot turns green, modal closes

---

## View Flow

1. User clicks green dot on an expense row
2. Receipt URL opens in a new tab

---

## Data Structure

```js
// Expense record — new optional field
{
  id: "abc123",
  date: "2026-03-02",
  category: "Tools & Equipment",
  description: "Drill bits",
  vendor: "Home Depot",
  amount: 24.99,
  paymentMethod: "Credit Card",
  notes: "",
  receiptUrl: "https://firebasestorage.googleapis.com/..."  // optional
}
```

---

## Storage Path

```
users/{uid}/receipts/{expenseId}
```

One file per expense. Scoped to authenticated user. Natural to find/delete later.

---

## Storage Security Rules

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

---

## UI Changes

- Add receipt dot column to expense table (after Notes, before Delete)
- Red dot: `●` in `var(--negative)` color — clickable, opens upload modal
- Green dot: `●` in `var(--positive)` color — clickable, opens receipt in new tab
- Upload modal: centered overlay, two buttons, progress indicator, close button
- No replace/delete receipt UI in v1 — keep it simple

---

## Out of Scope (v1)

- Replacing or deleting a receipt
- Thumbnail preview in the row
- Receipt viewer in-app (opens in new tab instead)
- Multiple receipts per expense
