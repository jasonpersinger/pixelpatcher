# Feature Batch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 12 features to the Pixel Patcher accounting/CRM single-file app covering job details, parts line items, customer UX, and dashboard insights.

**Architecture:** All changes are in `Accounting/PIXELPATCHER-Accounting.html`. No build step. Vanilla JS, Firebase Firestore sync via `DB.set`. Edit tool for small changes; Bash python3 heredoc for large JS blocks. Each task ends with a commit.

**Tech Stack:** Vanilla JS, Firebase SDK v10 compat, Firebase Storage, Firebase Firestore mail collection.

**Key constraints:**
- Write tool blocked for content with innerHTML — use Edit tool for .html changes
- Bash python3 heredoc pattern for large replacements (see examples below)
- All user strings must go through `esc()` before innerHTML insertion
- `DB.set(key, value)` auto-syncs to Firestore — always use DB methods, never direct localStorage

---

## Bash heredoc pattern for large replacements

When a replacement block is too large for Edit tool, use:
```bash
python3 - << 'PYEOF'
with open('/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html', 'r') as f:
    content = f.read()
old = '''EXACT_OLD_TEXT'''
new = '''EXACT_NEW_TEXT'''
assert old in content, "OLD TEXT NOT FOUND"
content = content.replace(old, new, 1)
with open('/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html', 'w') as f:
    f.write(content)
print("Done")
PYEOF
```

---

### Task 1: Warranty Claim status + skip income on paid warranty jobs

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add "Warranty Claim" to JOB_STATUSES**

Find this line (~line 463):
```js
const JOB_STATUSES = ['Pending','In Progress','Complete','Awaiting Parts','Closed'];
```
Replace with:
```js
const JOB_STATUSES = ['Pending','In Progress','Complete','Awaiting Parts','Closed','Warranty Claim'];
```

**Step 2: Add badge style for Warranty Claim**

Find (~line 98):
```css
    .badge-closed   { background: rgba(100,116,139,0.10); color: var(--muted); }
```
Replace with:
```css
    .badge-closed   { background: rgba(100,116,139,0.10); color: var(--muted); }
    .badge-warranty { background: rgba(100,116,139,0.10); color: var(--muted); }
```

**Step 3: Update statusBadge() to handle Warranty Claim**

Find (~line 1798):
```js
  const cls = {
    'Pending': 'pending', 'In Progress': 'progress',
    'Complete': 'complete', 'Awaiting Parts': 'awaiting', 'Closed': 'closed',
  };
```
Replace with:
```js
  const cls = {
    'Pending': 'pending', 'In Progress': 'progress',
    'Complete': 'complete', 'Awaiting Parts': 'awaiting', 'Closed': 'closed',
    'Warranty Claim': 'warranty',
  };
```

**Step 4: Skip income creation for Warranty Claim in markPaid()**

Find (~line 2039):
```js
function markPaid(id) {
  const jobs = DB.get('pp_jobs') || [];
  const job  = jobs.find(j => j.id === id);
  if (!job) return;
  job.paid = true; job.status = 'Complete';
  DB.set('pp_jobs', jobs);
  sendJobReadyEmail(job);
  DB.push('pp_income', {
    id: uid(), date: today(), type: 'Service', category: 'Repair',
    description: 'Job: ' + job.issue + ' \u2014 ' + job.customer,
    amount: Number(job.labor) + Number(job.parts),
    paymentMethod: 'Cash', notes: 'Job ID ' + id,
  });
  renderJobs();
}
```
Replace with (leave `sendJobReadyEmail` call in place, skip income for warranty):
```js
function markPaid(id, paymentMethod) {
  const jobs = DB.get('pp_jobs') || [];
  const job  = jobs.find(j => j.id === id);
  if (!job) return;
  const isWarranty = job.status === 'Warranty Claim';
  job.paid = true;
  if (!isWarranty) job.status = 'Complete';
  DB.set('pp_jobs', jobs);
  sendJobReadyEmail(job);
  if (!isWarranty) {
    DB.push('pp_income', {
      id: uid(), date: today(), type: 'Service', category: 'Repair',
      description: 'Job: ' + job.issue + ' \u2014 ' + job.customer,
      amount: Number(job.labor) + Number(job.parts),
      paymentMethod: paymentMethod || 'Cash', notes: 'Job ID ' + id,
    });
  }
  renderJobs();
}
```

**Step 5: Verify**
- Open app, add a job with status "Warranty Claim"
- Confirm new status appears in dropdown
- Mark it paid — confirm no income entry is created in Income tab

**Step 6: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Warranty Claim job status, skip income creation on paid warranty jobs"
```

---

### Task 2: Payment method prompt on Mark Paid

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add pay-modal HTML above the signin overlay**

Find the line:
```html
<div id="signin-overlay"
```
Insert before it:
```html
<div id="pay-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85);
     z-index:999; align-items:center; justify-content:center; flex-direction:column;">
  <div style="background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
              padding:32px; width:320px;">
    <div style="font-weight:700; font-family:var(--font); margin-bottom:16px; color:var(--text);">Payment Method</div>
    <div class="form-group" style="margin-bottom:20px;">
      <label>How was this paid?</label>
      <select id="pay-modal-method" style="background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:9px 12px;font-size:14px;font-family:var(--font);width:100%"></select>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-primary" onclick="confirmMarkPaid()">Confirm Paid</button>
      <button class="btn btn-ghost" onclick="closePayModal()">Cancel</button>
    </div>
  </div>
</div>

```

**Step 2: Add pay-modal JS functions**

Find the line:
```js
// ── Receipt upload ────────────────────────────────────────────────────────────
```
Insert before it:
```js
// ── Pay modal ─────────────────────────────────────────────────────────────────
let _payJobId = null;

function openPayModal(id) {
  _payJobId = id;
  const sel = document.getElementById('pay-modal-method');
  sel.innerHTML = PAY_METHODS.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
  document.getElementById('pay-modal').style.display = 'flex';
}

function closePayModal() {
  document.getElementById('pay-modal').style.display = 'none';
  _payJobId = null;
}

function confirmMarkPaid() {
  const method = document.getElementById('pay-modal-method').value;
  closePayModal();
  markPaid(_payJobId, method);
}

```

**Step 3: Update job table "Mark Paid" button to open modal instead**

Find in renderJobs() (~line 1887):
```js
                  ? '<span style="color:var(--positive)">&#x2713; Paid</span>'
                  : `<button class="btn btn-success" style="font-size:11px;padding:4px 10px"
                       onclick="markPaid('${esc(j.id)}')">Mark Paid</button>`}</td>
```
Replace with:
```js
                  ? '<span style="color:var(--positive)">&#x2713; Paid</span>'
                  : `<button class="btn btn-success" style="font-size:11px;padding:4px 10px"
                       onclick="openPayModal('${esc(j.id)}')">Mark Paid</button>`}</td>
```

**Step 4: Verify**
- Click Mark Paid on a job
- Payment method modal appears with dropdown
- Select Venmo, confirm → income record shows Venmo as payment method

**Step 5: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: prompt for payment method when marking a job paid"
```

---

### Task 3: Device/Model fields and Job internal notes

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add Device, Model, Notes fields to the Add Job form**

Find in renderJobs() the line:
```html
        <div class="form-group"><label>Status</label>
          <select id="j-status">${optionsHTML(JOB_STATUSES)}</select></div>
```
Replace with:
```html
        <div class="form-group"><label>Status</label>
          <select id="j-status">${optionsHTML(JOB_STATUSES)}</select></div>
        <div class="form-group"><label>Device <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input id="j-device" placeholder="iPhone, MacBook, etc."></div>
        <div class="form-group"><label>Model <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input id="j-model" placeholder="iPhone 13, MacBook Air M2, etc."></div>
        <div class="form-group" style="grid-column:span 2"><label>Internal Notes <span style="color:var(--muted);font-weight:400">(optional, not on invoice)</span></label>
          <textarea id="j-notes" rows="2" style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:8px;color:var(--text);font-family:var(--font);font-size:13px;resize:vertical" placeholder="Tech notes, customer info, anything internal"></textarea></div>
```

**Step 2: Read the new fields in addJob()**

Find in addJob() the line:
```js
    status: document.getElementById('j-status').value,
    paid: false,
```
Replace with:
```js
    status:  document.getElementById('j-status').value,
    device:  document.getElementById('j-device').value.trim(),
    model:   document.getElementById('j-model').value.trim(),
    notes:   document.getElementById('j-notes').value.trim(),
    paid: false,
```

**Step 3: Add Device/Model/Notes fields to the Edit Job modal**

Find in editJob() the line:
```html
      <div class="form-group"><label>Status</label>
        <select id="jm-status">${optionsHTML(JOB_STATUSES, j.status)}</select></div>
    </div>
  `;
```
Replace with:
```html
      <div class="form-group"><label>Status</label>
        <select id="jm-status">${optionsHTML(JOB_STATUSES, j.status)}</select></div>
      <div class="form-group"><label>Device</label>
        <input id="jm-device" value="${esc(j.device || '')}"></div>
      <div class="form-group"><label>Model</label>
        <input id="jm-model" value="${esc(j.model || '')}"></div>
      <div class="form-group" style="grid-column:span 2"><label>Internal Notes</label>
        <textarea id="jm-notes" rows="2" style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:8px;color:var(--text);font-family:var(--font);font-size:13px;resize:vertical">${esc(j.notes || '')}</textarea></div>
    </div>
  `;
```

**Step 4: Read the new fields in saveEditJob()**

Find in saveEditJob():
```js
    status:   document.getElementById('jm-status').value,
  })));
```
Replace with:
```js
    status:  document.getElementById('jm-status').value,
    device:  document.getElementById('jm-device').value.trim(),
    model:   document.getElementById('jm-model').value.trim(),
    notes:   document.getElementById('jm-notes').value.trim(),
  })));
```

**Step 5: Show Device column in jobs table**

Find the jobs table header:
```html
        <th>#</th><th>Date</th><th>Customer</th><th>Phone</th>
        <th>Issue</th><th>Status</th><th>Total</th><th>Paid?</th><th>Actions</th>
```
Replace with:
```html
        <th>#</th><th>Date</th><th>Customer</th><th>Device</th>
        <th>Issue</th><th>Status</th><th>Total</th><th>Paid?</th><th>Actions</th>
```

Find in the job row rendering (~line 1875):
```js
                <td><strong>${esc(j.customer)}</strong></td>
                <td style="color:var(--muted)">${esc(j.phone) || '&mdash;'}</td>
```
Replace with:
```js
                <td><strong>${esc(j.customer)}</strong></td>
                <td style="color:var(--muted)">${j.device || j.model ? esc([j.device, j.model].filter(Boolean).join(' ')) : '&mdash;'}</td>
```

**Step 6: Show device/model on invoice**

Find in renderInvoice() the Bill To block:
```js
        <div style="font-weight:700;font-size:15px">${esc(job.customer)}</div>
        ${job.phone ? `<div style="color:#555;font-size:13px;margin-top:3px">${esc(job.phone)}</div>` : ''}
```
Replace with:
```js
        <div style="font-weight:700;font-size:15px">${esc(job.customer)}</div>
        ${job.phone ? `<div style="color:#555;font-size:13px;margin-top:3px">${esc(job.phone)}</div>` : ''}
        ${(job.device || job.model) ? `<div style="color:#555;font-size:13px;margin-top:3px">Device: ${esc([job.device, job.model].filter(Boolean).join(' '))}</div>` : ''}
```

**Step 7: Verify**
- Add a job with device "iPhone", model "13 Pro", notes "Customer said dropped"
- Jobs table shows "iPhone 13 Pro" in Device column
- Invoice shows device under Bill To
- Notes visible in edit modal, not on invoice

**Step 8: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Device, Model, and internal Notes fields to jobs"
```

---

### Task 4: Job status filter

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add filter state variable**

Find near the top of the JS section, after the constants block (~line 464):
```js
function optionsHTML(arr, selected = '') {
```
Insert before it:
```js
// ── Job filter state ──────────────────────────────────────────────────────────
let _jobFilter = 'All';

```

**Step 2: Add filter bar to renderJobs() and apply filter**

Find in renderJobs() the totals bar:
```html
    <div class="totals-bar">
      <div class="total-item"><label>Total Jobs</label><span>${jobs.length}</span></div>
      <div class="total-item"><label>Completed</label>
        <span style="color:var(--positive)">${done}</span></div>
    </div>
```
Replace with:
```html
    <div class="totals-bar">
      <div class="total-item"><label>Total Jobs</label><span>${jobs.length}</span></div>
      <div class="total-item"><label>Completed</label>
        <span style="color:var(--positive)">${done}</span></div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
      ${['All','Pending','In Progress','Awaiting Parts','Complete','Closed','Warranty Claim'].map(f =>
        `<button onclick="_jobFilter='${f}';renderJobs()"
           style="border:1px solid ${_jobFilter===f?'var(--accent)':'var(--border)'};
                  background:${_jobFilter===f?'var(--accent)':'var(--card)'};
                  color:${_jobFilter===f?'#000':'var(--muted)'};
                  border-radius:20px;padding:4px 14px;font-size:12px;cursor:pointer;
                  font-family:var(--font);font-weight:${_jobFilter===f?'700':'400'}">${f}</button>`
      ).join('')}
    </div>
```

**Step 3: Apply the filter to the rendered jobs**

Find in renderJobs() the jobs.slice().reverse().map line (~line 1869):
```js
          : jobs.slice().reverse().map((j, i) => {
              const num          = jobs.length - i;
```
Replace with:
```js
          : (() => {
              const filtered = _jobFilter === 'All' ? jobs : jobs.filter(j => j.status === _jobFilter);
              return filtered.slice().reverse().map((j, i) => {
              const num          = filtered.length - i;
```
And find the closing `.join('')}` for the jobs rows (the end of the map) and add a closing `})()` after it:
Find:
```js
            }).join('')}
      </tbody>
```
Replace with:
```js
            }).join('');
            })()}
      </tbody>
```

**Step 4: Verify**
- Open Jobs tab — filter buttons appear above table
- Click "In Progress" — only In Progress jobs show
- Click "All" — all jobs return

**Step 5: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add status filter bar to jobs table"
```

---

### Task 5: Job photos

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Generalize the receipt upload handler to support a configurable field name**

Find:
```js
let _receiptExpenseId = null;
let _receiptKey       = 'pp_expenses';
let _receiptRenderFn  = null;
```
Replace with:
```js
let _receiptExpenseId = null;
let _receiptKey       = 'pp_expenses';
let _receiptRenderFn  = null;
let _receiptField     = 'receiptUrl';
```

Find `openReceiptModal`:
```js
function openReceiptModal(id, key, renderFn) {
  _receiptExpenseId = id;
  _receiptKey       = key      || 'pp_expenses';
  _receiptRenderFn  = renderFn || renderExpenses;
```
Replace with:
```js
function openReceiptModal(id, key, renderFn, field) {
  _receiptExpenseId = id;
  _receiptKey       = key      || 'pp_expenses';
  _receiptRenderFn  = renderFn || renderExpenses;
  _receiptField     = field    || 'receiptUrl';
```

Find in `handleReceiptFile`:
```js
    DB.set(_receiptKey, items.map(e =>
      e.id === _receiptExpenseId ? Object.assign({}, e, { receiptUrl: url }) : e
    ));
```
Replace with:
```js
    DB.set(_receiptKey, items.map(e =>
      e.id === _receiptExpenseId ? Object.assign({}, e, { [_receiptField]: url }) : e
    ));
```

**Step 2: Add photo button to job rows**

Find in renderJobs() the Actions cell:
```js
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openInvoice('${esc(j.id)}')">Invoice</button>
```
Replace with:
```js
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openInvoice('${esc(j.id)}')">Invoice</button>
                  ${j.photoUrl
                    ? `<button class="btn" style="background:var(--positive);color:#000;border:none;border-radius:12px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font)"
                         onclick="viewReceipt('${esc(j.photoUrl)}')">&#x1F4F7; Photo</button>`
                    : `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                         onclick="openReceiptModal('${esc(j.id)}','pp_jobs',renderJobs,'photoUrl')">+ Photo</button>`}
```

**Step 3: Verify**
- Open Jobs tab — "+ Photo" button appears on each job row
- Click it — receipt modal opens
- Upload a photo — button changes to green "📷 Photo"
- Click green button — opens photo in new tab

**Step 4: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add before/after photo upload to job rows"
```

---

### Task 6: Unpaid job aging

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add a daysSince helper function**

Find:
```js
const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
const fmt   = n => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
```
Replace with:
```js
const uid       = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today     = () => new Date().toISOString().slice(0, 10);
const fmt       = n => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
```

**Step 2: Show aging below "Mark Paid" button in job rows**

Find:
```js
                  ? '<span style="color:var(--positive)">&#x2713; Paid</span>'
                  : `<button class="btn btn-success" style="font-size:11px;padding:4px 10px"
                       onclick="openPayModal('${esc(j.id)}')">Mark Paid</button>`}</td>
```
Replace with:
```js
                  ? '<span style="color:var(--positive)">&#x2713; Paid</span>'
                  : `<button class="btn btn-success" style="font-size:11px;padding:4px 10px"
                       onclick="openPayModal('${esc(j.id)}')">Mark Paid</button>
                     <div style="font-size:10px;color:var(--muted);margin-top:2px">${daysSince(j.date)}d</div>`}</td>
```

**Step 3: Update dashboard Outstanding Balance sub-text**

Find in renderDashboard():
```js
  const outstandingSub = unpaidCount > 0
    ? unpaidCount + ' unpaid job' + (unpaidCount > 1 ? 's' : '')
    : 'All clear';
```
Replace with:
```js
  const unpaidJobs     = jobs.filter(j => !j.paid && j.status !== 'Closed');
  const oldestUnpaid   = unpaidJobs.length > 0
    ? Math.max(...unpaidJobs.map(j => daysSince(j.date)))
    : 0;
  const outstandingSub = unpaidCount > 0
    ? unpaidCount + ' unpaid job' + (unpaidCount > 1 ? 's' : '') + (oldestUnpaid > 0 ? ', oldest ' + oldestUnpaid + 'd' : '')
    : 'All clear';
```
Note: remove the duplicate `const unpaidCount` line that previously computed unpaidJobs inline. Find:
```js
  const unpaidCount    = jobs.filter(j => !j.paid && j.status !== 'Closed').length;
```
Replace with:
```js
  const unpaidCount    = unpaidJobs.length;
```
(This must come after the `unpaidJobs` const above — ensure order is: outstanding sum, then unpaidJobs, then unpaidCount.)

**Step 4: Verify**
- Jobs tab: unpaid rows show "3d" or "0d" below Mark Paid button
- Dashboard: Outstanding Balance shows "2 unpaid jobs, oldest 5d"

**Step 5: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: show unpaid job aging in jobs table and dashboard"
```

---

### Task 7: Recurring expenses — reminder banner

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add "Recurring" checkbox to Add Expense form**

Find in renderExpenses() the add form notes field:
```html
        <div class="form-group"><label>Notes</label>
          <input id="e-notes" placeholder="Optional"></div>
        <div class="form-group"><label>Link to Job
```
Replace with:
```html
        <div class="form-group"><label>Notes</label>
          <input id="e-notes" placeholder="Optional"></div>
        <div class="form-group" style="justify-content:flex-end;flex-direction:row;align-items:center;gap:8px">
          <input type="checkbox" id="e-recurring" style="width:16px;height:16px;cursor:pointer">
          <label for="e-recurring" style="cursor:pointer;font-size:13px;color:var(--text)">Recurring monthly</label>
        </div>
        <div class="form-group"><label>Link to Job
```

**Step 2: Save recurring flag in addExpense()**

Find in addExpense():
```js
    jobId: document.getElementById('e-job').value || null,
  });
```
Replace with:
```js
    jobId:     document.getElementById('e-job').value || null,
    recurring: document.getElementById('e-recurring').checked,
  });
```

**Step 3: Add recurring checkbox to Edit Expense modal**

Find in editExpense() the Notes field:
```html
      <div class="form-group"><label>Notes</label>
        <input id="em-notes" value="${esc(e.notes || '')}"></div>
      <div class="form-group"><label>Link to Job
```
Replace with:
```html
      <div class="form-group"><label>Notes</label>
        <input id="em-notes" value="${esc(e.notes || '')}"></div>
      <div class="form-group" style="justify-content:flex-start;flex-direction:row;align-items:center;gap:8px">
        <input type="checkbox" id="em-recurring"${e.recurring ? ' checked' : ''} style="width:16px;height:16px;cursor:pointer">
        <label for="em-recurring" style="cursor:pointer;font-size:13px;color:var(--text)">Recurring monthly</label>
      </div>
      <div class="form-group"><label>Link to Job
```

**Step 4: Save recurring flag in saveEditExpense()**

Find in saveEditExpense():
```js
    jobId:         document.getElementById('em-job').value || null,
  })));
```
Replace with:
```js
    jobId:         document.getElementById('em-job').value || null,
    recurring:     document.getElementById('em-recurring').checked,
  })));
```

**Step 5: Add recurring banner logic to renderExpenses()**

Find at the start of renderExpenses():
```js
function renderExpenses() {
  const expenses = DB.get('pp_expenses') || [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const jobMap = {};
  (DB.get('pp_jobs') || []).forEach(j => { jobMap[j.id] = j; });
  document.getElementById('expenses').innerHTML = `
    <div class="section-header">
```
Replace with:
```js
function renderExpenses() {
  const expenses = DB.get('pp_expenses') || [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const jobMap = {};
  (DB.get('pp_jobs') || []).forEach(j => { jobMap[j.id] = j; });

  // Recurring banner: find recurring expenses not yet logged this calendar month
  const nowYM    = today().slice(0, 7); // 'YYYY-MM'
  const recurring = expenses.filter(e => e.recurring);
  const missing   = recurring.filter(r =>
    !expenses.some(e => e.id !== r.id && e.description === r.description && e.date && e.date.slice(0, 7) === nowYM)
  );
  const recurBanner = missing.length > 0
    ? `<div style="background:rgba(201,160,0,0.12);border:1px solid var(--accent);border-radius:var(--radius);
                   padding:12px 20px;margin-bottom:16px;font-family:var(--font);font-size:13px">
         <span style="color:var(--accent);font-weight:700">&#9888; ${missing.length} recurring expense${missing.length > 1 ? 's' : ''} not yet logged this month:</span>
         <span style="color:var(--muted)"> ${missing.map(r => esc(r.description)).join(', ')}</span>
         <button class="btn btn-ghost" style="margin-left:16px;font-size:11px;padding:4px 12px"
           onclick="toggleForm('expense-form')">Add Now &darr;</button>
       </div>`
    : '';

  document.getElementById('expenses').innerHTML = recurBanner + `
    <div class="section-header">
```

**Step 6: Verify**
- Mark an expense as "Recurring monthly", e.g., insurance
- Navigate away and back to Expenses — banner appears if no matching expense this month
- After adding the expense for this month — banner disappears

**Step 7: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: recurring expenses with monthly reminder banner"
```

---

### Task 8: Customer search

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add customer search state variable**

Find near the top of the customer section:
```js
let _customerView = null;
```
Replace with:
```js
let _customerView   = null;
let _customerSearch = '';
```

**Step 2: Add search input to renderCustomerList()**

Find in renderCustomerList() after the totals bar is appended:
```js
  section.appendChild(totals);

  // Table
```
Replace with:
```js
  section.appendChild(totals);

  // Search
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'margin-bottom:16px';
  const searchInput = document.createElement('input');
  searchInput.placeholder = 'Search by name, phone, or email\u2026';
  searchInput.value = _customerSearch;
  searchInput.style.cssText = 'background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:9px 12px;font-size:14px;font-family:var(--font);width:100%;max-width:360px;outline:none';
  searchInput.addEventListener('input', e => { _customerSearch = e.target.value; renderCustomerList(); });
  searchWrap.appendChild(searchInput);
  section.appendChild(searchWrap);

  // Table
```

**Step 3: Apply search filter to allCustomers before rendering rows**

Find in renderCustomerList() the line:
```js
  }).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
```
Replace with:
```js
  }).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

  const searchQ = _customerSearch.trim().toLowerCase();
  const displayCustomers = searchQ
    ? allCustomers.filter(c =>
        c.fullName.toLowerCase().includes(searchQ) ||
        (c.phone || '').includes(searchQ) ||
        (c.email || '').toLowerCase().includes(searchQ)
      )
    : allCustomers;
```

Then find where the table body loops over `allCustomers.forEach`:
```js
  if (allCustomers.length === 0) {
```
Replace with:
```js
  if (displayCustomers.length === 0) {
```

And:
```js
  } else {
    allCustomers.forEach(c => {
```
Replace with:
```js
  } else {
    displayCustomers.forEach(c => {
```

**Step 4: Verify**
- Type a customer name in the search box — list filters in real time
- Type a phone number — correct customer appears
- Clear search — all customers return

**Step 5: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add real-time search to customers list"
```

---

### Task 9: Email invoice button

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add sendInvoiceEmail() function**

Find:
```js
// ── Dashboard ─────────────────────────────────────────────────────────────────
```
Insert before it:
```js
// ── Email invoice ─────────────────────────────────────────────────────────────
function sendInvoiceEmail() {
  const jobs = DB.get('pp_jobs') || [];
  const job  = jobs.find(j => j.id === currentInvoiceJobId);
  if (!job) return;

  const customers = DB.get('pp_customers') || [];
  const customer  = job.customerId
    ? customers.find(c => c.id === job.customerId)
    : customers.find(c => (c.firstName + ' ' + c.lastName).trim() === job.customer.trim());
  const email = customer && customer.email ? customer.email.trim() : '';

  if (!email) {
    const notice = document.createElement('div');
    notice.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--card);border:1px solid var(--border);'
      + 'border-radius:var(--radius);padding:12px 18px;font-family:var(--font);font-size:12px;'
      + 'color:var(--muted);z-index:999;max-width:300px';
    notice.textContent = 'No email on file for ' + job.customer + '. Add one in Customers.';
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 5000);
    return;
  }

  const s      = getSettings();
  const jobs2  = DB.get('pp_jobs') || [];
  const jobNum = jobs2.indexOf(job) + 1;
  const invNum = 'PP-' + new Date().getFullYear() + '-' + String(jobNum).padStart(3, '0');
  const tax    = Number(job.tax || 0);
  const total  = (Number(job.labor) + Number(job.parts) + tax).toFixed(2);

  fsdb.collection('mail').add({
    to: email,
    message: {
      subject: 'Invoice ' + invNum + ' from ' + (s.businessName || 'Pixel Patcher'),
      text: 'Hi ' + job.customer + ',\n\n'
        + 'Please find your invoice below.\n\n'
        + 'Invoice #: ' + invNum + '\n'
        + 'Date: ' + today() + '\n\n'
        + (job.service ? 'Service: ' + job.service + '\n' : '')
        + (job.issue   ? 'Issue: '   + job.issue   + '\n' : '')
        + (Number(job.labor) > 0 ? 'Labor: $' + Number(job.labor).toFixed(2) + '\n' : '')
        + (Number(job.parts) > 0 ? 'Parts: $' + Number(job.parts).toFixed(2) + '\n' : '')
        + (tax > 0              ? 'Tax: $'   + tax.toFixed(2)               + '\n' : '')
        + '\nTOTAL DUE: $' + total + '\n\n'
        + 'Payment accepted: Cash \u00b7 Venmo \u00b7 CashApp \u00b7 Square\n'
        + 'Questions? Text or call ' + (s.phone || '') + '\n\n'
        + 'Thank you for choosing ' + (s.businessName || 'Pixel Patcher') + '!',
    },
  }).then(() => {
    const notice = document.createElement('div');
    notice.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--card);border:1px solid var(--accent);'
      + 'border-radius:var(--radius);padding:12px 18px;font-family:var(--font);font-size:12px;'
      + 'color:var(--accent);z-index:999;max-width:300px';
    notice.textContent = '\u2713 Invoice emailed to ' + email;
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 5000);
  }).catch(err => {
    console.warn('Invoice email failed:', err);
    alert('Failed to send email. Check console.');
  });
}

```

**Step 2: Add "Email to Customer" button on Invoice page**

Find in renderInvoice():
```html
        <button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
```
Replace with:
```html
        <button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
        <button class="btn btn-ghost" onclick="sendInvoiceEmail()">Email to Customer</button>
```

**Step 3: Verify**
- Open invoice for a job where the customer has an email on file
- Click "Email to Customer" — green toast appears "✓ Invoice emailed to …"
- Open invoice for customer without email — gray toast "No email on file…"

**Step 4: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: email invoice to customer from invoice page"
```

---

### Task 10: Revenue by service type on dashboard

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add service revenue card to renderDashboard()**

Find in renderDashboard() the closing of the monthly chart card:
```html
      <div style="display:flex;gap:16px;margin-top:12px;font-size:11px;color:var(--muted)">
        <span><span style="color:var(--positive)">&#9632;</span> Income</span>
        <span><span style="color:var(--negative)">&#9632;</span> Expenses</span>
      </div>
    </div>
  `;
```
Replace with:
```html
      <div style="display:flex;gap:16px;margin-top:12px;font-size:11px;color:var(--muted)">
        <span><span style="color:var(--positive)">&#9632;</span> Income</span>
        <span><span style="color:var(--negative)">&#9632;</span> Expenses</span>
      </div>
    </div>
    ${(() => {
      const paidJobs  = jobs.filter(j => j.paid && j.service);
      if (paidJobs.length === 0) return '';
      const byService = {};
      paidJobs.forEach(j => {
        const svc = j.service || 'Other';
        byService[svc] = (byService[svc] || 0) + Number(j.labor) + Number(j.parts);
      });
      const sorted  = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const maxSvc  = sorted[0][1] || 1;
      return '<div class="card" style="margin-top:20px">'
        + '<div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px">Revenue by Service</div>'
        + sorted.map(([svc, amt]) =>
            '<div style="margin-bottom:12px">'
            + '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">'
            + '<span>' + esc(svc) + '</span>'
            + '<span style="color:var(--positive)">' + fmt(amt) + '</span>'
            + '</div>'
            + '<div style="height:6px;background:var(--border);border-radius:3px">'
            + '<div style="height:6px;background:var(--positive);border-radius:3px;width:' + Math.round((amt/maxSvc)*100) + '%"></div>'
            + '</div></div>'
          ).join('')
        + '</div>';
    })()}
  `;
```

**Step 2: Verify**
- Dashboard shows "Revenue by Service" card below monthly chart
- Top services appear with horizontal bars proportional to revenue
- Card is absent if no paid jobs with service data

**Step 3: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add revenue by service type card to dashboard"
```

---

### Task 11: Parts line items on Job form

This is the most complex task. Use the python3 heredoc pattern for the large replacements.

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Replace Parts ($) in Add Job form with parts list UI**

Find in renderJobs() the Add Job form parts input:
```html
        <div class="form-group"><label>Parts ($)</label>
          <input type="number" step="0.01" id="j-parts" placeholder="0.00"></div>
```
Replace with:
```html
        <div class="form-group" style="grid-column:span 2">
          <label>Parts / Materials</label>
          <div id="j-parts-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:6px"></div>
          <button type="button" onclick="addPartRow('j-parts-list','j-parts-total')"
            style="background:var(--card);border:1px solid var(--border);color:var(--muted);
                   border-radius:var(--radius);padding:6px 14px;font-size:12px;cursor:pointer;
                   font-family:var(--font)">+ Add Part</button>
          <div id="j-parts-total" style="margin-top:6px;font-size:13px;color:var(--accent)"></div>
        </div>
```

**Step 2: Add addPartRow() and getPartsList() helper functions**

Find:
```js
// ── Jobs section ─────────────────────────────────────────────────────────────
```
Insert before it:
```js
// ── Parts list helpers ────────────────────────────────────────────────────────
function addPartRow(listId, totalId) {
  const list = document.getElementById(listId);
  if (!list) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:6px;align-items:center';
  const nameInput = document.createElement('input');
  nameInput.placeholder = 'Part name';
  nameInput.style.cssText = 'flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:7px 10px;font-size:13px;font-family:var(--font)';
  const costInput = document.createElement('input');
  costInput.type = 'number'; costInput.step = '0.01'; costInput.placeholder = '0.00';
  costInput.style.cssText = 'width:90px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:7px 10px;font-size:13px;font-family:var(--font)';
  costInput.addEventListener('input', () => updatePartsTotal(listId, totalId));
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button'; removeBtn.textContent = '\u2715';
  removeBtn.style.cssText = 'background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0 4px';
  removeBtn.addEventListener('click', () => { row.remove(); updatePartsTotal(listId, totalId); });
  row.appendChild(nameInput); row.appendChild(costInput); row.appendChild(removeBtn);
  list.appendChild(row);
  nameInput.focus();
}

function updatePartsTotal(listId, totalId) {
  const list  = document.getElementById(listId);
  const total = document.getElementById(totalId);
  if (!list || !total) return;
  const sum = Array.from(list.querySelectorAll('input[type=number]'))
    .reduce((s, inp) => s + (parseFloat(inp.value) || 0), 0);
  total.textContent = sum > 0 ? 'Parts total: ' + fmt(sum) : '';
}

function getPartsList(listId) {
  const list = document.getElementById(listId);
  if (!list) return [];
  const rows = list.querySelectorAll('div');
  const parts = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const name = inputs[0] ? inputs[0].value.trim() : '';
    const cost = inputs[1] ? parseFloat(inputs[1].value) || 0 : 0;
    if (name || cost > 0) parts.push({ name, cost });
  });
  return parts;
}

```

**Step 3: Update addJob() to read parts from line items**

Find in addJob():
```js
  const parts = parseFloat(document.getElementById('j-parts').value) || 0;
  const tax   = parts * (getSettings().taxRate || 0);
  DB.push('pp_jobs', {
```
Replace with:
```js
  const partsList = getPartsList('j-parts-list');
  const parts     = partsList.length > 0
    ? partsList.reduce((s, p) => s + p.cost, 0)
    : 0;
  const tax       = parts * (getSettings().taxRate || 0);
  DB.push('pp_jobs', {
```
And find in the DB.push object:
```js
    parts,
    tax,
```
Replace with:
```js
    parts,
    partsList: partsList.length > 0 ? partsList : undefined,
    tax,
```

**Step 4: Replace Parts field in Edit Job modal with parts list UI**

Find in editJob():
```html
      <div class="form-group"><label>Parts ($)</label>
        <input type="number" step="0.01" id="jm-parts" value="${esc(String(j.parts || 0))}"></div>
```
Replace with:
```html
      <div class="form-group" style="grid-column:span 2"><label>Parts / Materials</label>
        <div id="jm-parts-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:6px"></div>
        <button type="button" onclick="addPartRow('jm-parts-list','jm-parts-total')"
          style="background:var(--card);border:1px solid var(--border);color:var(--muted);
                 border-radius:var(--radius);padding:6px 14px;font-size:12px;cursor:pointer;
                 font-family:var(--font)">+ Add Part</button>
        <div id="jm-parts-total" style="margin-top:6px;font-size:13px;color:var(--accent)"></div>
      </div>
```

**Step 5: Populate existing parts into edit modal after rendering**

Find at the end of editJob(), after the modal is shown:
```js
  document.getElementById('edit-modal-save').onclick = () => saveEditJob(id);
  document.getElementById('edit-modal').style.display = 'flex';
}
```
Replace with:
```js
  document.getElementById('edit-modal-save').onclick = () => saveEditJob(id);
  document.getElementById('edit-modal').style.display = 'flex';
  // Pre-populate parts list
  if (j.partsList && j.partsList.length > 0) {
    j.partsList.forEach(p => {
      addPartRow('jm-parts-list', 'jm-parts-total');
      const list = document.getElementById('jm-parts-list');
      const rows = list.querySelectorAll('div');
      const lastRow = rows[rows.length - 1];
      const inputs  = lastRow.querySelectorAll('input');
      if (inputs[0]) inputs[0].value = p.name;
      if (inputs[1]) { inputs[1].value = p.cost; }
    });
    updatePartsTotal('jm-parts-list', 'jm-parts-total');
  } else if (j.parts > 0) {
    // Migrate existing single-value parts into a row
    addPartRow('jm-parts-list', 'jm-parts-total');
    const list = document.getElementById('jm-parts-list');
    const rows = list.querySelectorAll('div');
    const inputs = rows[0].querySelectorAll('input');
    if (inputs[0]) inputs[0].value = 'Parts & Materials';
    if (inputs[1]) inputs[1].value = j.parts;
    updatePartsTotal('jm-parts-list', 'jm-parts-total');
  }
}
```

**Step 6: Update saveEditJob() to read parts from line items**

Find in saveEditJob():
```js
  const parts    = parseFloat(document.getElementById('jm-parts').value) || 0;
```
Replace with:
```js
  const partsList = getPartsList('jm-parts-list');
  const parts     = partsList.length > 0
    ? partsList.reduce((s, p) => s + p.cost, 0)
    : (parseFloat(document.getElementById('jm-parts') ? document.getElementById('jm-parts').value : '0') || 0);
```
And in the DB.set update object, add partsList:
```js
    parts,
    tax,
    status:   document.getElementById('jm-status').value,
```
Replace with:
```js
    parts,
    partsList: partsList.length > 0 ? partsList : undefined,
    tax,
    status:   document.getElementById('jm-status').value,
```

**Step 7: Show parts line items on invoice**

Find in renderInvoice():
```js
          ${job.parts > 0 ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#555">Parts &amp; Materials</td>
              <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right">
                $${Number(job.parts).toFixed(2)}
              </td>
            </tr>` : ''}
```
Replace with:
```js
          ${job.partsList && job.partsList.length > 0
            ? job.partsList.map(p => `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#555">${esc(p.name || 'Part')}</td>
              <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right">
                $${Number(p.cost).toFixed(2)}
              </td>
            </tr>`).join('')
            : job.parts > 0 ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#555">Parts &amp; Materials</td>
              <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right">
                $${Number(job.parts).toFixed(2)}
              </td>
            </tr>` : ''}
```

**Step 8: Verify**
- Add a job — parts section shows empty list with "+ Add Part" button
- Add 2 parts: "Screen $45", "Adhesive $3" — total shows $48
- Save job — parts total shows $48 in jobs table
- Open invoice — shows two line items, not a single "Parts" row
- Edit an existing job that had a single parts $ — it pre-populates as "Parts & Materials" row

**Step 9: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: replace parts dollar field with parts line items on jobs"
```

---

### Task 12: Final deploy

**Step 1: Deploy to Firebase Hosting**
```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

**Step 2: Smoke-test live URL**
Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html and verify:
- Sign in works
- Dashboard loads with all KPI groups
- Jobs tab: filter bar, device column, photo button, aging shown
- Mark Paid: payment method modal appears
- Expenses: recurring checkbox present, banner works
- Customers: search input filters list
- Invoice: "Email to Customer" button present

