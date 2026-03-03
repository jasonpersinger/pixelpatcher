# Income Section — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated Income tab that shows all pp_income entries with a totals bar, add form, delete, and receipt dots.

**Architecture:** The pp_income data key already exists in DB (localStorage + Firestore mirror). This plan adds: (1) a nav button and section element, (2) a generalized receipt modal that works for both expenses and income, (3) a renderIncome function modeled on renderExpenses, (4) addIncome and deleteIncome helpers. No new data structures or Firebase config needed.

**Tech Stack:** Vanilla JS, Firebase JS SDK v10 (compat), single HTML file. Output file: /home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html.

---

## Task 1: Add Nav Button and Section Element

**File:** Modify Accounting/PIXELPATCHER-Accounting.html

**Step 1: Add Income nav button**

Find (line ~176):
      button class nav-btn active data-section dashboard  Dashboard
      button class nav-btn data-section jobs  Jobs

Use the Edit tool. old_string:
      <button class="nav-btn active" data-section="dashboard">Dashboard</button>
      <button class="nav-btn" data-section="jobs">Jobs</button>

new_string:
      <button class="nav-btn active" data-section="dashboard">Dashboard</button>
      <button class="nav-btn" data-section="income">Income</button>
      <button class="nav-btn" data-section="jobs">Jobs</button>

**Step 2: Add income section element**

Use the Edit tool. old_string:
    <section id="dashboard" class="section active"></section>
    <section id="jobs"      class="section"></section>

new_string:
    <section id="dashboard" class="section active"></section>
    <section id="income"    class="section"></section>
    <section id="jobs"      class="section"></section>

**Step 3: Verify**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html — Income should appear in the sidebar between Dashboard and Jobs. Clicking it shows a blank area (expected).

**Step 4: Commit**

  cd /home/jason/Desktop/PIXELPATCHER
  git add Accounting/PIXELPATCHER-Accounting.html
  git commit -m "feat: add income nav button and section element"

---

## Task 2: Wire renderSection and Add INCOME_TYPES Constant

**File:** Modify Accounting/PIXELPATCHER-Accounting.html

**Step 1: Wire income in renderSection**

Use the Edit tool. old_string:
function renderSection(name) {
  if (name === 'dashboard') renderDashboard();
  else if (name === 'jobs')     renderJobs();

new_string:
function renderSection(name) {
  if (name === 'dashboard') renderDashboard();
  else if (name === 'income')   renderIncome();
  else if (name === 'jobs')     renderJobs();

**Step 2: Add INCOME_TYPES constant after PAY_METHODS**

Use the Edit tool. old_string:
const PAY_METHODS  = ['Cash','Venmo','CashApp','Square','Check','Card','Transfer'];

new_string:
const PAY_METHODS  = ['Cash','Venmo','CashApp','Square','Check','Card','Transfer'];
const INCOME_TYPES = ['Service','Owner Contribution','Other'];

**Step 3: Commit**

  cd /home/jason/Desktop/PIXELPATCHER
  git add Accounting/PIXELPATCHER-Accounting.html
  git commit -m "feat: wire income section in renderSection, add INCOME_TYPES constant"

---

## Task 3: Generalize Receipt Modal for Income

handleReceiptFile is currently hardcoded to update pp_expenses and call renderExpenses. Add _receiptKey and _receiptRenderFn module-level variables so the same upload handler works for income too.

**File:** Modify Accounting/PIXELPATCHER-Accounting.html

**Step 1: Replace the receipt upload variable and openReceiptModal**

Use the Edit tool. old_string:
let _receiptExpenseId = null;

function openReceiptModal(expenseId) {
  _receiptExpenseId = expenseId;

new_string:
let _receiptExpenseId = null;
let _receiptKey       = 'pp_expenses';
let _receiptRenderFn  = null;

function openReceiptModal(id, key, renderFn) {
  _receiptExpenseId = id;
  _receiptKey       = key      || 'pp_expenses';
  _receiptRenderFn  = renderFn || renderExpenses;

**Step 2: Replace the hardcoded write in handleReceiptFile**

Use the Edit tool. old_string:
  ref.put(file).then(snapshot => snapshot.ref.getDownloadURL()).then(url => {
    const expenses = DB.get('pp_expenses') || [];
    DB.set('pp_expenses', expenses.map(e =>
      e.id === _receiptExpenseId ? Object.assign({}, e, { receiptUrl: url }) : e
    ));
    closeReceiptModal();
    renderExpenses();

new_string:
  ref.put(file).then(snapshot => snapshot.ref.getDownloadURL()).then(url => {
    const items = DB.get(_receiptKey) || [];
    DB.set(_receiptKey, items.map(e =>
      e.id === _receiptExpenseId ? Object.assign({}, e, { receiptUrl: url }) : e
    ));
    closeReceiptModal();
    _receiptRenderFn();

**Step 3: Verify expenses receipts still work**

Open app, go to Expenses, click a red dot — upload modal opens, upload an image, dot turns green. No regression.

**Step 4: Commit**

  cd /home/jason/Desktop/PIXELPATCHER
  git add Accounting/PIXELPATCHER-Accounting.html
  git commit -m "feat: generalize receipt modal to work with any DB collection"

---

## Task 4: Add renderIncome, addIncome, and deleteIncome Functions

**File:** Modify Accounting/PIXELPATCHER-Accounting.html

**Step 1: Insert income functions after deleteExpense**

Use the Edit tool. old_string:
function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  DB.del('pp_expenses', id);
  renderExpenses();
}

// ── Mileage section

new_string:
function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  DB.del('pp_expenses', id);
  renderExpenses();
}

// ── Income section ────────────────────────────────────────────────────────────
function renderIncome() {
  const income  = DB.get('pp_income') || [];
  const revenue = income.filter(i => i.type !== 'Owner Contribution')
                        .reduce((s, i) => s + Number(i.amount), 0);
  const totalIn = income.reduce((s, i) => s + Number(i.amount), 0);
  const rows = income.length === 0
    ? '<tr><td colspan="8" style="color:var(--muted);text-align:center;padding:24px">No income yet</td></tr>'
    : income.slice().reverse().map(i => {
        const dot = i.receiptUrl
          ? '<button class="btn" title="View receipt" onclick="viewReceipt(\'' + esc(i.receiptUrl) + '\')" style="color:var(--positive);background:none;border:none;font-size:22px;cursor:pointer;padding:0 4px">&#x25CF;</button>'
          : '<button class="btn" title="Attach receipt" onclick="openReceiptModal(\'' + esc(i.id) + '\',\'pp_income\',renderIncome)" style="color:var(--negative);background:none;border:none;font-size:22px;cursor:pointer;padding:0 4px">&#x25CF;</button>';
        const badge = i.type === 'Owner Contribution' ? 'badge-awaiting' : 'badge-complete';
        return '<tr>'
          + '<td>' + esc(i.date) + '</td>'
          + '<td><span class="badge ' + badge + '">' + esc(i.type) + '</span></td>'
          + '<td>' + esc(i.description) + '</td>'
          + '<td style="color:var(--positive)">' + fmt(i.amount) + '</td>'
          + '<td>' + esc(i.paymentMethod) + '</td>'
          + '<td style="color:var(--muted)">' + esc(i.notes) + '</td>'
          + '<td>' + dot + '</td>'
          + '<td><button class="btn btn-danger" onclick="deleteIncome(\'' + esc(i.id) + '\')">&#x2715;</button></td>'
          + '</tr>';
      }).join('');

  document.getElementById('income').innerHTML =
    '<div class="section-header">'
    + '<div class="page-title">Income</div>'
    + '<button class="btn btn-primary" onclick="toggleForm(\'income-form\')">+ Add Income</button>'
    + '</div>'
    + '<div class="add-form" id="income-form">'
    + '<div class="form-grid">'
    + '<div class="form-group"><label>Date</label><input type="date" id="i-date" value="' + today() + '"></div>'
    + '<div class="form-group"><label>Type</label><select id="i-type">' + optionsHTML(INCOME_TYPES) + '</select></div>'
    + '<div class="form-group"><label>Description</label><input id="i-desc" placeholder="Job or payment description"></div>'
    + '<div class="form-group"><label>Amount ($)</label><input type="number" step="0.01" id="i-amt" placeholder="0.00"></div>'
    + '<div class="form-group"><label>Payment Method</label><select id="i-pay">' + optionsHTML(PAY_METHODS) + '</select></div>'
    + '<div class="form-group"><label>Notes</label><input id="i-notes" placeholder="Optional"></div>'
    + '</div>'
    + '<button class="btn btn-primary" onclick="addIncome()">Add Income</button>'
    + '</div>'
    + '<div class="totals-bar">'
    + '<div class="total-item"><label>Total Revenue</label><span style="color:var(--positive)">' + fmt(revenue) + '</span></div>'
    + '<div class="total-item"><label>Total In (incl. contributions)</label><span style="color:var(--accent)">' + fmt(totalIn) + '</span></div>'
    + '</div>'
    + '<div class="table-wrap"><table>'
    + '<thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Method</th><th>Notes</th><th>Receipt</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>';
}

function addIncome() {
  const amt = parseFloat(document.getElementById('i-amt').value);
  if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }
  DB.push('pp_income', {
    id:            uid(),
    date:          document.getElementById('i-date').value,
    type:          document.getElementById('i-type').value,
    description:   document.getElementById('i-desc').value,
    amount:        amt,
    paymentMethod: document.getElementById('i-pay').value,
    notes:         document.getElementById('i-notes').value,
  });
  renderIncome();
}

function deleteIncome(id) {
  if (!confirm('Delete this income entry?')) return;
  DB.del('pp_income', id);
  renderIncome();
}

// ── Mileage section

**Step 2: Verify in browser**

- Income tab in sidebar between Dashboard and Jobs
- Seed "Owner Contribution" appears with grey badge; Total Revenue = $0.00, Total In = $200.00
- Click "+ Add Income" -> form expands; submit a $75 Cash Service entry -> row appears instantly
- Red receipt dot -> upload modal opens -> upload -> dot turns green
- Delete entry -> confirm -> gone
- Reload -> data persists
- Expenses tab -> receipt dots still work (regression check)

**Step 3: Commit**

  cd /home/jason/Desktop/PIXELPATCHER
  git add Accounting/PIXELPATCHER-Accounting.html
  git commit -m "feat: add income section with totals, add/delete form, and receipt dots"

---

## Task 5: Deploy and Final Verification

**Step 1: Deploy to Firebase Hosting**

  cd /home/jason/Desktop/PIXELPATCHER/Accounting
  npx firebase-tools@latest deploy --only hosting

**Step 2: Verify at live URL**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html

- Income nav item visible between Dashboard and Jobs
- Seed Owner Contribution visible with awaiting badge
- Add a cash job -> row appears instantly, syncs to Firestore
- Receipt dot upload works end-to-end
- Dashboard numbers unaffected
- Expenses receipt dots still work

---

## Final Checklist

- [ ] Income nav button between Dashboard and Jobs
- [ ] Section element #income in HTML
- [ ] renderSection dispatches to renderIncome
- [ ] INCOME_TYPES constant defined after PAY_METHODS
- [ ] Receipt modal generalized (works for both expenses and income)
- [ ] renderIncome renders totals bar + table with receipt column
- [ ] addIncome pushes to pp_income and re-renders
- [ ] deleteIncome removes from pp_income with confirm
- [ ] Deployed to Firebase Hosting
