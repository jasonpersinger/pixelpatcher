# Income Section — Design Doc

**Date:** 2026-03-02
**Status:** Approved

---

## Goal

Add a dedicated Income tab to the Pixel Patcher accounting app for logging cash jobs, tips, owner contributions, and any other revenue directly — not just when marking a job paid.

---

## Architecture

The `pp_income` key already exists in `DB` (localStorage + Firestore mirror). The Income section exposes it through a proper CRUD UI — the same add/delete/table pattern used by Expenses. No new data structures needed.

### Data Model

Existing `pp_income` record shape (unchanged):

```js
{
  id:            string,   // uuid
  date:          string,   // YYYY-MM-DD
  type:          string,   // 'Service' | 'Owner Contribution' | 'Other'
  category:      string,   // free text label
  description:   string,   // what the job/payment was
  amount:        number,
  paymentMethod: string,   // 'Cash' | 'Venmo' | 'Zelle' | 'Check' | 'Other'
  notes:         string,
  receiptUrl?:   string    // optional, added by this feature
}
```

---

## Components

### 1. Sidebar Nav Entry

Add "Income" between Dashboard and Jobs in the sidebar. Same style as existing nav items. Clicking shows the `#income` section and hides others.

### 2. Income Table

Columns: **Date · Type · Description · Amount · Method · Notes · Receipt · (delete)**

- All income entries displayed, newest first
- Receipt column: same red/green dot pattern as Expenses — red = no receipt, green = receipt attached; both are clickable (red opens upload modal, green opens receipt in new tab)
- Delete button with `confirm()` dialog, same as Expenses

### 3. Totals Bar

Two stats displayed above the table:

| Label | Calculation |
|---|---|
| **Total Revenue** | Sum of all income where `type !== 'Owner Contribution'` |
| **Total In** | Sum of all income (everything) |

Same styling as the Dashboard stat cards.

### 4. Add Income Form

Fields:
- Date (default: today)
- Type: dropdown — Service · Owner Contribution · Other
- Description (text)
- Amount (number)
- Payment Method: dropdown — Cash · Venmo · Zelle · Check · Other
- Notes (optional text)

Submit button: "Add Income". On submit: generate UUID, build record, `DB.set('pp_income', [...])`, re-render.

### 5. Receipt Upload

Reuses the existing `#receipt-modal`, `openReceiptModal()`, `closeReceiptModal()`, `handleReceiptFile()`, and `viewReceipt()` functions — zero new upload logic needed. Storage path: `users/{uid}/receipts/{incomeId}`.

---

## Dashboard Impact

No changes. Dashboard already filters owner contributions out of revenue and reads from `pp_income` correctly.

---

## What's Not Included

- Editing existing income entries (delete + re-add is sufficient for now)
- Income categories as a managed list (free text is fine)
- Income search/filter (can be added later)

