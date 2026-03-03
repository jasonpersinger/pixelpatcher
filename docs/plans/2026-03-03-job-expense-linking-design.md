# Job-Expense Linking — Design

**Date:** 2026-03-03
**Feature:** Link expenses to jobs to show true per-job parts cost and profitability

---

## Goal

Allow expenses to be tagged to a specific job. The job row shows the sum of linked expenses as its parts cost, replacing the manual parts field when expenses exist.

---

## Architecture

Each expense gains an optional `jobId` field (string, matching a job's `id`). No changes to the job record structure. At render time, the job row calculates parts cost by summing all `pp_expenses` where `expense.jobId === job.id`. If no expenses are linked, falls back to the job's manual `parts` value — fully backwards compatible.

---

## Data Structure

```js
// Expense record — new optional field
{
  id: "abc123",
  date: "2026-03-03",
  category: "Parts & Materials",
  description: "Replacement screen",
  vendor: "iFixit",
  amount: 45.00,
  paymentMethod: "Credit Card",
  notes: "",
  jobId: "xyz789",   // optional — links to a job
  receiptUrl: "..."  // optional
}

// Job record — unchanged
{
  id: "xyz789",
  date: "2026-03-03",
  customer: "Jane Smith",
  parts: 0,          // used as fallback when no expenses linked
  labor: 120,
  ...
}
```

---

## UI Changes

### Expense Form

Add a "Link to Job" dropdown after the Notes field:
- Default option: "— No Job —" (jobId = null)
- Lists all jobs as "Customer — Issue (date)", sorted newest first
- Selecting a job sets `jobId` on the saved expense

### Job Row — Parts Column

- If linked expenses exist: show sum of linked expense amounts + `(N expenses)` badge
- If no linked expenses: show manual `parts` value as before (backwards compatible)
- Both displayed in the negative color to indicate cost

### Expense Row — Job Column

- Add a "Job" column to the expense table showing the linked job's customer name
- If no job linked: show `—`

---

## Profitability

Job row already shows labor + parts. With linked expenses replacing parts, the revenue vs. cost picture becomes accurate automatically — no extra calculations needed.

---

## Out of Scope (v1)

- Unlinking an expense from a job (edit the expense and set job to "— No Job —" is sufficient)
- Filtering expenses by job
- Per-job profit summary view
- Linking income to jobs
