# Job-Expense Linking — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow expenses to be tagged to a specific job so the job row shows true parts cost from linked expenses.

**Architecture:** Each expense gains an optional `jobId` field. The expense form gets a "Link to Job" dropdown. The job row calculates parts cost by summing linked expenses at render time, falling back to the manual `parts` value if none are linked. A "Job" column is added to the expense table showing the linked customer name.

**Tech Stack:** Vanilla JS, localStorage via DB helpers, Firebase Firestore sync (automatic via existing DB.set). Output file: `/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html`.

---

## Task 1: Add "Link to Job" Dropdown to Expense Form

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add dropdown to expense form**

Find:
```html
        <div class="form-group"><label>Notes</label>
          <input id="e-notes" placeholder="Optional"></div>
      </div>
      <button class="btn btn-primary" onclick="addExpense()">Add Expense</button>
```

Replace with:
```html
        <div class="form-group"><label>Notes</label>
          <input id="e-notes" placeholder="Optional"></div>
        <div class="form-group"><label>Link to Job <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <select id="e-job">
            <option value="">— No Job —</option>
            ${(DB.get('pp_jobs') || []).slice().reverse().map(j =>
              `<option value="${esc(j.id)}">${esc(j.customer)} &mdash; ${esc(j.issue)} (${esc(j.date)})</option>`
            ).join('')}
          </select></div>
      </div>
      <button class="btn btn-primary" onclick="addExpense()">Add Expense</button>
```

**Step 2: Save jobId in addExpense()**

Find:
```js
  DB.push('pp_expenses', {
    id: uid(), date: document.getElementById('e-date').value,
    category: document.getElementById('e-cat').value,
    description: document.getElementById('e-desc').value,
    vendor: document.getElementById('e-vendor').value,
    amount: amt, paymentMethod: document.getElementById('e-pay').value,
    notes: document.getElementById('e-notes').value,
  });
```

Replace with:
```js
  DB.push('pp_expenses', {
    id: uid(), date: document.getElementById('e-date').value,
    category: document.getElementById('e-cat').value,
    description: document.getElementById('e-desc').value,
    vendor: document.getElementById('e-vendor').value,
    amount: amt, paymentMethod: document.getElementById('e-pay').value,
    notes: document.getElementById('e-notes').value,
    jobId: document.getElementById('e-job').value || null,
  });
```

**Step 3: Verify**

- [ ] Expense form shows "Link to Job" dropdown with all jobs listed
- [ ] "— No Job —" is the default
- [ ] Adding an expense with a job selected saves `jobId` (check DevTools → Application → Local Storage → `pp_expenses`)
- [ ] Adding an expense with no job saves `jobId: null`

**Step 4: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Link to Job dropdown to expense form"
```

---

## Task 2: Add Job Column to Expense Table

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Build job lookup map at top of renderExpenses()**

Find:
```js
function renderExpenses() {
  const expenses = DB.get('pp_expenses') || [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
```

Replace with:
```js
function renderExpenses() {
  const expenses = DB.get('pp_expenses') || [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const jobMap = {};
  (DB.get('pp_jobs') || []).forEach(j => { jobMap[j.id] = j; });
```

**Step 2: Add Job column header**

Find:
```html
        <th>Date</th><th>Category</th><th>Description</th><th>Vendor</th>
        <th>Amount</th><th>Method</th><th>Notes</th><th>Receipt</th><th></th>
```

Replace with:
```html
        <th>Date</th><th>Category</th><th>Description</th><th>Vendor</th>
        <th>Amount</th><th>Method</th><th>Notes</th><th>Job</th><th>Receipt</th><th></th>
```

**Step 3: Add Job cell to each expense row**

Find:
```html
              <td style="color:var(--muted)">${esc(e.notes)}</td>
              <td>
                ${e.receiptUrl
```

Replace with:
```html
              <td style="color:var(--muted)">${esc(e.notes)}</td>
              <td style="color:var(--muted)">${e.jobId && jobMap[e.jobId] ? esc(jobMap[e.jobId].customer) : '&mdash;'}</td>
              <td>
                ${e.receiptUrl
```

**Step 4: Update empty-state colspan from 9 to 10**

Find:
```html
          ? '<tr><td colspan="9" style="color:var(--muted);text-align:center;padding:24px">No expenses yet</td></tr>'
```

Replace with:
```html
          ? '<tr><td colspan="10" style="color:var(--muted);text-align:center;padding:24px">No expenses yet</td></tr>'
```

**Step 5: Verify**

- [ ] Expense table shows "Job" column between Notes and Receipt
- [ ] Expenses linked to a job show the customer name
- [ ] Unlinked expenses show "—"

**Step 6: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Job column to expense table"
```

---

## Task 3: Update Job Row to Show Linked Expenses as Parts Cost

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Build per-job expense totals at top of renderJobs()**

Find:
```js
function renderJobs() {
  const jobs = DB.get('pp_jobs') || [];
  const done = jobs.filter(j => j.status === 'Complete' || j.status === 'Closed').length;
```

Replace with:
```js
function renderJobs() {
  const jobs = DB.get('pp_jobs') || [];
  const done = jobs.filter(j => j.status === 'Complete' || j.status === 'Closed').length;
  const linkedExpenseSum   = {};
  const linkedExpenseCount = {};
  (DB.get('pp_expenses') || []).forEach(e => {
    if (e.jobId) {
      linkedExpenseSum[e.jobId]   = (linkedExpenseSum[e.jobId]   || 0) + Number(e.amount);
      linkedExpenseCount[e.jobId] = (linkedExpenseCount[e.jobId] || 0) + 1;
    }
  });
```

**Step 2: Use linked expenses sum in job row Total calculation**

Find:
```js
              const num = jobs.length - i;
              const total = Number(j.labor) + Number(j.parts) + Number(j.tax || 0);
              return `<tr>
```

Replace with:
```js
              const num          = jobs.length - i;
              const expCount     = linkedExpenseCount[j.id] || 0;
              const partsForCalc = expCount > 0 ? linkedExpenseSum[j.id] : Number(j.parts);
              const total        = Number(j.labor) + partsForCalc + Number(j.tax || 0);
              return `<tr>
```

**Step 3: Add expense count badge to Total cell**

Find:
```html
                <td style="color:var(--positive)">${fmt(total)}</td>
```

Replace with:
```html
                <td style="color:var(--positive)">
                  ${fmt(total)}
                  ${expCount > 0 ? `<span style="color:var(--muted);font-size:10px;display:block">${expCount} expense${expCount > 1 ? 's' : ''}</span>` : ''}
                </td>
```

**Step 4: Verify**

- [ ] Jobs with no linked expenses show their manual parts value in Total (unchanged)
- [ ] Jobs with linked expenses show the sum of those expenses in Total
- [ ] The count badge "N expense(s)" appears under the Total for linked jobs
- [ ] Adding a new expense linked to a job → navigate to Jobs → Total updates

**Step 5: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: show linked expense sum as parts cost on job row"
```

---

## Task 4: Deploy

**Step 1: Deploy to Firebase Hosting**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

**Step 2: Verify at live URL**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html

- [ ] Expense form has "Link to Job" dropdown
- [ ] Expense table has "Job" column
- [ ] Job row Total reflects linked expense sum with count badge
- [ ] Reload page → all links persist (synced via Firestore)

---

## Final Checklist

- [ ] Linking an expense to a job saves `jobId` to Firestore
- [ ] Expense table shows linked job's customer name
- [ ] Job Total uses linked expenses when present, manual parts as fallback
- [ ] Expense badge shows count of linked expenses
- [ ] No existing data broken — unlinked expenses and existing jobs unchanged
