# Edit Functionality — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add modal-based edit capability to all data tables (expenses, income, mileage, jobs) so records can be corrected without deleting and re-entering.

**Architecture:** A single shared `<div id="edit-modal">` is added to the DOM. Each entity's `editXxx(id)` function fills the modal's title and body dynamically, then sets the Save button's onclick. `saveEditXxx(id)` reads the fields, replaces the record in its array, calls `DB.set()` (which auto-syncs to Firestore), closes the modal, and re-renders. Customers already have edit — this plan adds the other four.

**Tech Stack:** Vanilla JS, localStorage via DB helpers, single HTML file at `Accounting/PIXELPATCHER-Accounting.html`. Use the **Edit tool** (not Write tool) for all HTML file changes — the pre-commit hook blocks Write on .html files.

---

## Task 1: Add Edit Modal HTML

**File:** `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Insert modal div after receipt-modal**

Find (line ~173):
```html
  </div>
</div>

<div id="signin-overlay"
```

Replace with:
```html
  </div>
</div>

<div id="edit-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85);
     z-index:999; align-items:center; justify-content:center; flex-direction:column;">
  <div style="background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
              padding:32px; width:520px; max-width:95vw; max-height:85vh; overflow-y:auto;">
    <div id="edit-modal-title" style="font-weight:700; font-family:var(--font); margin-bottom:20px;
         color:var(--text); font-size:16px;"></div>
    <div id="edit-modal-body"></div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-primary" id="edit-modal-save">Save</button>
      <button class="btn btn-ghost" onclick="closeEditModal()">Cancel</button>
    </div>
  </div>
</div>

<div id="signin-overlay"
```

**Step 2: Verify**

- [ ] Open the app in browser. The edit modal should not be visible.
- [ ] In DevTools console: `document.getElementById('edit-modal')` should return an element (not null).

**Step 3: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add edit modal HTML scaffold"
```

---

## Task 2: Add closeEditModal() JS Function

**File:** `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add closeEditModal after closeReceiptModal**

Find:
```js
function closeReceiptModal() {
  document.getElementById('receipt-modal').style.display = 'none';
}
```

Replace with:
```js
function closeReceiptModal() {
  document.getElementById('receipt-modal').style.display = 'none';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}
```

**Step 2: Verify**

- [ ] In DevTools console: `closeEditModal()` runs without error.
- [ ] In DevTools console: call `document.getElementById('edit-modal').style.display = 'flex'` → modal appears. Then `closeEditModal()` → modal hides.

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add closeEditModal function"
```

---

## Task 3: Expense Edit

**File:** `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add pencil button to expense row**

Find:
```html
              <td><button class="btn btn-danger" onclick="deleteExpense('${esc(e.id)}')">&#x2715;</button></td>
```

Replace with:
```html
              <td style="display:flex;gap:6px;align-items:center">
                <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                  onclick="editExpense('${esc(e.id)}')">&#x270E;</button>
                <button class="btn btn-danger" onclick="deleteExpense('${esc(e.id)}')">&#x2715;</button>
              </td>
```

**Step 2: Add editExpense and saveEditExpense functions after deleteExpense**

Find:
```js
function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  DB.del('pp_expenses', id);
  renderExpenses();
}
```

Replace with:
```js
function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  DB.del('pp_expenses', id);
  renderExpenses();
}

function editExpense(id) {
  const expenses = DB.get('pp_expenses') || [];
  const e = expenses.find(x => x.id === id);
  if (!e) return;
  const jobOptions = (DB.get('pp_jobs') || []).slice().reverse().map(j =>
    `<option value="${esc(j.id)}"${e.jobId === j.id ? ' selected' : ''}>${esc(j.customer)} &mdash; ${esc(j.issue)} (${esc(j.date)})</option>`
  ).join('');
  document.getElementById('edit-modal-title').textContent = 'Edit Expense';
  document.getElementById('edit-modal-body').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>Date</label>
        <input type="date" id="em-date" value="${esc(e.date)}"></div>
      <div class="form-group"><label>Category</label>
        <select id="em-cat">${optionsHTML(EXPENSE_CATS, e.category)}</select></div>
      <div class="form-group"><label>Description</label>
        <input id="em-desc" value="${esc(e.description)}"></div>
      <div class="form-group"><label>Vendor</label>
        <input id="em-vendor" value="${esc(e.vendor || '')}"></div>
      <div class="form-group"><label>Amount ($)</label>
        <input type="number" step="0.01" id="em-amt" value="${esc(String(e.amount))}"></div>
      <div class="form-group"><label>Payment Method</label>
        <select id="em-pay">${optionsHTML(PAY_METHODS, e.paymentMethod)}</select></div>
      <div class="form-group"><label>Notes</label>
        <input id="em-notes" value="${esc(e.notes || '')}"></div>
      <div class="form-group"><label>Link to Job <span style="color:var(--muted);font-weight:400">(optional)</span></label>
        <select id="em-job"><option value="">— No Job —</option>${jobOptions}</select></div>
    </div>
  `;
  document.getElementById('edit-modal-save').onclick = () => saveEditExpense(id);
  document.getElementById('edit-modal').style.display = 'flex';
}

function saveEditExpense(id) {
  const amt = parseFloat(document.getElementById('em-amt').value);
  if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }
  const expenses = DB.get('pp_expenses') || [];
  DB.set('pp_expenses', expenses.map(e => e.id !== id ? e : Object.assign({}, e, {
    date:          document.getElementById('em-date').value,
    category:      document.getElementById('em-cat').value,
    description:   document.getElementById('em-desc').value,
    vendor:        document.getElementById('em-vendor').value,
    amount:        amt,
    paymentMethod: document.getElementById('em-pay').value,
    notes:         document.getElementById('em-notes').value,
    jobId:         document.getElementById('em-job').value || null,
  })));
  closeEditModal();
  renderExpenses();
}
```

**Step 3: Verify**

- [ ] Expenses table shows a pencil button (✎) next to each ✕ button
- [ ] Clicking pencil opens modal pre-filled with that expense's values
- [ ] Editing a field and clicking Save updates the row
- [ ] Job link dropdown shows jobs and pre-selects current linked job
- [ ] DevTools → Application → Local Storage → `pp_expenses` shows updated values

**Step 4: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add edit for expenses"
```

---

## Task 4: Income Edit

**File:** `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add pencil button to income row**

Income uses string concatenation. Find:
```js
          + '<td><button class="btn btn-danger" onclick="deleteIncome(\'' + esc(i.id) + '\')">&#x2715;</button></td>'
```

Replace with:
```js
          + '<td style="display:flex;gap:6px;align-items:center">'
          + '<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="editIncome(\'' + esc(i.id) + '\')">&#x270E;</button>'
          + '<button class="btn btn-danger" onclick="deleteIncome(\'' + esc(i.id) + '\')">&#x2715;</button>'
          + '</td>'
```

**Step 2: Update income table colspan from 8 to 8 (no change — pencil replaces the last cell's content, not adding a new column)**

No colspan change needed — the pencil and delete share the last `<td>`.

**Step 3: Add editIncome and saveEditIncome after deleteIncome**

Find:
```js
function deleteIncome(id) {
  if (!confirm('Delete this income entry?')) return;
  DB.del('pp_income', id);
  renderIncome();
}
```

Replace with:
```js
function deleteIncome(id) {
  if (!confirm('Delete this income entry?')) return;
  DB.del('pp_income', id);
  renderIncome();
}

function editIncome(id) {
  const income = DB.get('pp_income') || [];
  const i = income.find(x => x.id === id);
  if (!i) return;
  document.getElementById('edit-modal-title').textContent = 'Edit Income';
  document.getElementById('edit-modal-body').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>Date</label>
        <input type="date" id="im-date" value="${esc(i.date)}"></div>
      <div class="form-group"><label>Type</label>
        <select id="im-type">${optionsHTML(INCOME_TYPES, i.type)}</select></div>
      <div class="form-group"><label>Description</label>
        <input id="im-desc" value="${esc(i.description)}"></div>
      <div class="form-group"><label>Amount ($)</label>
        <input type="number" step="0.01" id="im-amt" value="${esc(String(i.amount))}"></div>
      <div class="form-group"><label>Payment Method</label>
        <select id="im-pay">${optionsHTML(PAY_METHODS, i.paymentMethod)}</select></div>
      <div class="form-group"><label>Notes</label>
        <input id="im-notes" value="${esc(i.notes || '')}"></div>
    </div>
  `;
  document.getElementById('edit-modal-save').onclick = () => saveEditIncome(id);
  document.getElementById('edit-modal').style.display = 'flex';
}

function saveEditIncome(id) {
  const amt = parseFloat(document.getElementById('im-amt').value);
  if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }
  const income = DB.get('pp_income') || [];
  DB.set('pp_income', income.map(i => i.id !== id ? i : Object.assign({}, i, {
    date:          document.getElementById('im-date').value,
    type:          document.getElementById('im-type').value,
    description:   document.getElementById('im-desc').value,
    amount:        amt,
    paymentMethod: document.getElementById('im-pay').value,
    notes:         document.getElementById('im-notes').value,
  })));
  closeEditModal();
  renderIncome();
}
```

**Step 4: Verify**

- [ ] Income table shows pencil button next to ✕ on each row
- [ ] Clicking pencil opens modal pre-filled with correct values
- [ ] Editing amount and saving reflects in the table and totals bar

**Step 5: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add edit for income"
```

---

## Task 5: Mileage Edit

**File:** `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add pencil button to mileage row**

Find:
```html
              <td><button class="btn btn-danger" onclick="deleteMileage('${esc(m.id)}')">&#x2715;</button></td>
```

Replace with:
```html
              <td style="display:flex;gap:6px;align-items:center">
                <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                  onclick="editMileage('${esc(m.id)}')">&#x270E;</button>
                <button class="btn btn-danger" onclick="deleteMileage('${esc(m.id)}')">&#x2715;</button>
              </td>
```

**Step 2: Add editMileage and saveEditMileage after deleteMileage**

Find:
```js
function deleteMileage(id) {
  if (!confirm('Delete this trip?')) return;
  DB.del('pp_mileage', id);
  renderMileage();
}
```

Replace with:
```js
function deleteMileage(id) {
  if (!confirm('Delete this trip?')) return;
  DB.del('pp_mileage', id);
  renderMileage();
}

function editMileage(id) {
  const entries = DB.get('pp_mileage') || [];
  const m = entries.find(x => x.id === id);
  if (!m) return;
  document.getElementById('edit-modal-title').textContent = 'Edit Trip';
  document.getElementById('edit-modal-body').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>Date</label>
        <input type="date" id="mm-date" value="${esc(m.date)}"></div>
      <div class="form-group"><label>From</label>
        <input id="mm-from" value="${esc(m.from)}"></div>
      <div class="form-group"><label>To</label>
        <input id="mm-to" value="${esc(m.to)}"></div>
      <div class="form-group"><label>Purpose</label>
        <input id="mm-purpose" value="${esc(m.purpose)}"></div>
      <div class="form-group"><label>Miles</label>
        <input type="number" step="0.1" id="mm-miles" value="${esc(String(m.miles))}"></div>
      <div class="form-group"><label>Notes</label>
        <input id="mm-notes" value="${esc(m.notes || '')}"></div>
    </div>
  `;
  document.getElementById('edit-modal-save').onclick = () => saveEditMileage(id);
  document.getElementById('edit-modal').style.display = 'flex';
}

function saveEditMileage(id) {
  const miles = parseFloat(document.getElementById('mm-miles').value);
  if (!miles || miles <= 0) { alert('Enter a valid mileage.'); return; }
  const rate = getSettings().irsRate;
  const entries = DB.get('pp_mileage') || [];
  DB.set('pp_mileage', entries.map(m => m.id !== id ? m : Object.assign({}, m, {
    date:      document.getElementById('mm-date').value,
    from:      document.getElementById('mm-from').value,
    to:        document.getElementById('mm-to').value,
    purpose:   document.getElementById('mm-purpose').value,
    miles,
    deduction: parseFloat((miles * rate).toFixed(2)),
    notes:     document.getElementById('mm-notes').value,
  })));
  closeEditModal();
  renderMileage();
}
```

**Step 3: Verify**

- [ ] Mileage table shows pencil button on each row
- [ ] Editing miles updates both the Miles column and recalculates Deduction
- [ ] Total Miles YTD and total deduction update correctly

**Step 4: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add edit for mileage"
```

---

## Task 6: Job Edit

**File:** `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add pencil button to job Actions column**

Find:
```html
                <td style="display:flex;gap:6px;align-items:center">
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openInvoice('${esc(j.id)}')">Invoice</button>
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openFollowupModal('${esc(j.customer)}','${esc(j.phone)}')">Follow-up</button>
                  <button class="btn btn-danger" onclick="deleteJob('${esc(j.id)}')">&#x2715;</button>
                </td>
```

Replace with:
```html
                <td style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openInvoice('${esc(j.id)}')">Invoice</button>
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openFollowupModal('${esc(j.customer)}','${esc(j.phone)}')">Follow-up</button>
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="editJob('${esc(j.id)}')">&#x270E;</button>
                  <button class="btn btn-danger" onclick="deleteJob('${esc(j.id)}')">&#x2715;</button>
                </td>
```

**Step 2: Add editJob and saveEditJob after deleteJob**

Find:
```js
function deleteJob(id) {
  if (!confirm('Delete this job?')) return;
  DB.del('pp_jobs', id);
  renderJobs();
}
```

Replace with:
```js
function deleteJob(id) {
  if (!confirm('Delete this job?')) return;
  DB.del('pp_jobs', id);
  renderJobs();
}

function editJob(id) {
  const jobs = DB.get('pp_jobs') || [];
  const j = jobs.find(x => x.id === id);
  if (!j) return;
  const nameParts = (j.customer || '').split(' ');
  const fname = nameParts[0] || '';
  const lname = nameParts.slice(1).join(' ') || '';
  document.getElementById('edit-modal-title').textContent = 'Edit Job — ' + j.customer;
  document.getElementById('edit-modal-body').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>Date</label>
        <input type="date" id="jm-date" value="${esc(j.date)}"></div>
      <div class="form-group"><label>First Name</label>
        <input id="jm-fname" value="${esc(fname)}"></div>
      <div class="form-group"><label>Last Name</label>
        <input id="jm-lname" value="${esc(lname)}"></div>
      <div class="form-group"><label>Phone</label>
        <input id="jm-phone" value="${esc(j.phone || '')}"></div>
      <div class="form-group"><label>Issue</label>
        <input id="jm-issue" value="${esc(j.issue || '')}"></div>
      <div class="form-group"><label>Service Performed</label>
        <input id="jm-service" value="${esc(j.service || '')}"></div>
      <div class="form-group"><label>Labor ($)</label>
        <input type="number" step="0.01" id="jm-labor" value="${esc(String(j.labor || 0))}"></div>
      <div class="form-group"><label>Parts ($)</label>
        <input type="number" step="0.01" id="jm-parts" value="${esc(String(j.parts || 0))}"></div>
      <div class="form-group"><label>Status</label>
        <select id="jm-status">${optionsHTML(JOB_STATUSES, j.status)}</select></div>
    </div>
  `;
  document.getElementById('edit-modal-save').onclick = () => saveEditJob(id);
  document.getElementById('edit-modal').style.display = 'flex';
}

function saveEditJob(id) {
  const fname = document.getElementById('jm-fname').value.trim();
  if (!fname) { alert('Customer first name is required.'); return; }
  const lname    = document.getElementById('jm-lname').value.trim();
  const fullName = fname + (lname ? ' ' + lname : '');
  const parts    = parseFloat(document.getElementById('jm-parts').value) || 0;
  const tax      = parts * (getSettings().taxRate || 0);
  const jobs     = DB.get('pp_jobs') || [];
  DB.set('pp_jobs', jobs.map(j => j.id !== id ? j : Object.assign({}, j, {
    date:     document.getElementById('jm-date').value,
    customer: fullName,
    phone:    document.getElementById('jm-phone').value,
    issue:    document.getElementById('jm-issue').value,
    service:  document.getElementById('jm-service').value,
    labor:    parseFloat(document.getElementById('jm-labor').value) || 0,
    parts,
    tax,
    status:   document.getElementById('jm-status').value,
  })));
  closeEditModal();
  renderJobs();
}
```

**Step 3: Verify**

- [ ] Jobs table shows pencil button (✎) in Actions column
- [ ] Clicking pencil opens modal with job's current values pre-filled
- [ ] Changing status from Pending → In Progress and saving updates the status badge
- [ ] Editing labor/parts and saving updates the Total column
- [ ] Paid jobs can still be edited (status and amounts), but their `paid` flag is preserved

**Step 4: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add edit for jobs"
```

---

## Task 7: Deploy

**Step 1: Deploy to Firebase Hosting**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

**Step 2: Verify at live URL**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html

- [ ] Pencil edit button visible in all four tables (Expenses, Income, Mileage, Jobs)
- [ ] Each modal opens with correct pre-filled values
- [ ] Saving persists across page reload (Firestore sync working)
- [ ] Delete still works on all tables

---

## Final Checklist

- [ ] Expenses: edit all fields including job link
- [ ] Income: edit date, type, description, amount, method, notes
- [ ] Mileage: edit fields, deduction auto-recalculates from new miles
- [ ] Jobs: edit date, customer name, phone, issue, service, labor, parts, status
- [ ] No existing data broken — existing records unchanged until edited
- [ ] Customers still use their existing full-page edit (unchanged)
