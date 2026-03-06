# Feature Batch Design — 2026-03-06

## Features

1. Payment method on Mark Paid
2. Device/Model fields on Jobs
3. Job internal notes
4. Job status filter
5. Email invoice button
6. Unpaid job aging
7. Recurring expenses (reminder banner)
8. Customer search
9. Job photos upload
10. Revenue by service type on dashboard
11. Warranty tracking (new status)
12. Parts line items on Job form

---

## Data Model Changes

### Jobs (`pp_jobs`)
New fields added to each job record:
- `device` — string, e.g. "iPhone", "MacBook", "Windows PC" (free text)
- `model` — string, e.g. "iPhone 13 Pro", "MacBook Air M2" (free text)
- `notes` — string, internal tech notes
- `partsList` — array of `{name: string, cost: number}`, optional
- `photoUrl` — string, Firebase Storage URL, optional
- Status list gains `"Warranty Claim"` — warranty jobs skip income creation on Mark Paid

### Expenses (`pp_expenses`)
New field:
- `recurring` — boolean, default false

All new fields are optional/additive — existing records remain valid.

---

## Feature Designs

### 1. Payment Method on Mark Paid
- Replace `confirm()` flow with a small inline modal (reuse `edit-modal`)
- Dropdown of PAY_METHODS + confirm button
- Selected method is written to the auto-created income record
- Default: "Cash"

### 2. Device / Model Fields on Jobs
- Two new free-text inputs on the Add Job form and Edit Job modal: Device and Model
- Shown as a column in the jobs table (combined: "iPhone 13 Pro" or just "iPhone")
- Shown on the invoice under Bill To

### 3. Job Internal Notes
- Textarea added to Add Job form and Edit Job modal
- Shown in job table as a muted truncated cell (title attr for full text on hover)
- NOT shown on the invoice (internal only)

### 4. Job Status Filter
- A row of filter buttons above the jobs table: All | Pending | In Progress | Awaiting Parts | Complete | Closed | Warranty Claim
- Active filter highlighted in accent color
- Filter state is in-memory only (resets on nav away)

### 5. Email Invoice Button
- Button on Invoice page: "Email to Customer"
- Looks up customer email from `pp_customers`
- If found: writes to `mail` collection (same pattern as job-ready email)
- If not found: shows toast "No email on file for [name]"
- Email body: plain text invoice summary (not HTML)

### 6. Unpaid Job Aging
- In the Jobs table, the Paid column for unpaid jobs shows:
  "Mark Paid" button + muted text below: "3 days" (days since job date)
- Dashboard "Right Now" → Outstanding Balance sub-text gains: "X jobs, oldest N days"

### 7. Recurring Expenses — Reminder Banner
- Add "Recurring" checkbox to expense Add form and Edit modal
- On Expenses page load: check if any recurring expenses have no matching entry this calendar month
- If yes: show a yellow banner at top of Expenses section listing the recurring names
- Banner has a "Add Now" quick-action per item that pre-fills the Add Expense form

### 8. Customer Search
- Text input at top of Customers list (below totals bar)
- Filters by name, phone, or email as you type (case-insensitive)
- No server calls — filters the in-memory array on `input` event

### 9. Job Photos
- Reuse existing receipt modal (`openReceiptModal`) — parameterized to work for jobs too
- "📷 Add Photo" / "📷 View Photo" button in the job table Actions column
- Stored at `users/{uid}/job-photos/{jobId}` in Firebase Storage
- Stored as `job.photoUrl` on the job record

### 10. Revenue by Service Type
- New "By Service" card on Dashboard, below the monthly chart
- Groups income records by the linked job's service field (or "Other" if no job link)
- Shows top 5 services by revenue as a simple horizontal bar list
- Uses job records directly: groups `labor` by `service` field for paid jobs

### 11. Warranty Tracking
- Add `"Warranty Claim"` to `JOB_STATUSES` array
- In `markPaid()`: if `job.status === 'Warranty Claim'`, skip income entry creation
- Badge styled in muted/gray (same as Closed)
- No other changes needed

### 12. Parts Line Items
- Replace single "Parts ($)" input with a dynamic list
- Each row: [Part name input] [Cost input] [Remove button]
- "+ Add Part" button appends a row
- Total auto-sums in real time and displays below the list
- Stored as `partsList: [{name, cost}]` on job; `parts` field = sum (for backwards compat)
- Invoice shows individual line items when `partsList` exists, otherwise falls back to "Parts & Materials: $X"
- Edit Job modal gets the same parts list UI

---

## Implementation Order

Tasks should be done in this order to avoid conflicts in the single HTML file:

1. Data model + constants (add Warranty Claim status, update JOB_STATUSES)
2. Parts line items (most DOM-complex, touches job form + invoice)
3. Device/Model + Job notes fields
4. Job status filter
5. Job photos (reuse receipt modal)
6. Mark Paid payment method modal
7. Unpaid job aging
8. Recurring expenses
9. Customer search
10. Email invoice button
11. Revenue by service type dashboard card
12. Commit all

