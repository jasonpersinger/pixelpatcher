# Customer Records — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a proper `pp_customers` store with full contact fields, autocomplete on the job form for returning customers, and a standalone Add Customer flow in the Customers tab.

**Architecture:** New `pp_customers` array in localStorage/Firestore (added to FS_KEYS). Jobs gain an optional `customerId` field. On job save, if customer name matches an existing record it links via `customerId`; if not, a new customer record is created from the job form data. Job form gets a datalist autocomplete — selecting a known customer auto-fills all contact fields. `renderCustomerList()` and `renderCustomerDetail()` rebuilt to use `pp_customers` as the source of truth, falling back to job-derived data for any unlinked records.

**Tech Stack:** Vanilla JS, localStorage, Firebase Firestore sync (automatic via existing DB.set). Output file: `/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html`.

---

## Task 1: Add `pp_customers` to FS_KEYS and Clear Test Data

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add key to sync array**

Find (line 223):
```js
const FS_KEYS = ['pp_settings','pp_income','pp_expenses','pp_mileage','pp_jobs','pp_seeded','pp_followups'];
```

Replace with:
```js
const FS_KEYS = ['pp_settings','pp_income','pp_expenses','pp_mileage','pp_jobs','pp_seeded','pp_followups','pp_customers'];
```

**Step 2: Clear test data in the live app**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html, go to Settings → scroll to bottom and use the existing "Clear All Data" or "Reset" option, OR open DevTools → Application → Local Storage → delete `pp_jobs`, `pp_customers`, `pp_seeded` keys manually.

**Step 3: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add pp_customers to Firestore sync keys"
```

---

## Task 2: Update Job Form — Split Name + Add Contact Fields + Autocomplete

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Replace job form fields**

The current job form (around line 1059 in `renderJobs()`) has these fields:
```html
        <div class="form-group"><label>Customer Name</label>
          <input id="j-customer" placeholder="Full name"></div>
        <div class="form-group"><label>Phone</label>
          <input id="j-phone" placeholder="555-000-0000"></div>
        <div class="form-group"><label>Address <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input id="j-address" placeholder="Street, City, State"></div>
```

Replace those three fields with:
```html
        <div class="form-group"><label>First Name</label>
          <input id="j-fname" placeholder="First name" oninput="autoFillCustomer()" list="customer-list" autocomplete="off"></div>
        <datalist id="customer-list"></datalist>
        <div class="form-group"><label>Last Name</label>
          <input id="j-lname" placeholder="Last name"></div>
        <div class="form-group"><label>Phone</label>
          <input id="j-phone" placeholder="555-000-0000"></div>
        <div class="form-group"><label>Email <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input id="j-email" type="email" placeholder="jane@example.com"></div>
        <div class="form-group"><label>Street <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input id="j-street" placeholder="123 Main St"></div>
        <div class="form-group"><label>City <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input id="j-city" placeholder="Springfield"></div>
        <div class="form-group"><label>State <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input id="j-state" placeholder="IL" style="max-width:80px"></div>
        <div class="form-group"><label>Zip <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input id="j-zip" placeholder="62701" style="max-width:120px"></div>
```

**Step 2: Populate datalist in renderJobs()**

Find at the top of `renderJobs()`:
```js
function renderJobs() {
  const jobs = DB.get('pp_jobs') || [];
```

Replace with:
```js
function renderJobs() {
  const jobs = DB.get('pp_jobs') || [];
  const customers = DB.get('pp_customers') || [];
```

Then find the end of `renderJobs()` — after the `document.getElementById('jobs').innerHTML = ...` template literal closes (look for the final backtick + semicolon), add:

```js
  // Populate customer autocomplete datalist
  const dl = document.getElementById('customer-list');
  if (dl) {
    dl.innerHTML = '';
    customers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.firstName + ' ' + c.lastName;
      opt.dataset.customerId = c.id;
      dl.appendChild(opt);
    });
  }
```

**Step 3: Add `autoFillCustomer()` function**

Find:
```js
function addJob() {
```

Insert immediately before it:
```js
function autoFillCustomer() {
  const input = document.getElementById('j-fname');
  if (!input) return;
  const typed = input.value.trim();
  const customers = DB.get('pp_customers') || [];
  // Match on "FirstName LastName" or just first name
  const match = customers.find(c =>
    (c.firstName + ' ' + c.lastName).toLowerCase() === typed.toLowerCase() ||
    c.firstName.toLowerCase() === typed.toLowerCase()
  );
  if (!match) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('j-fname',  match.firstName);
  set('j-lname',  match.lastName);
  set('j-phone',  match.phone);
  set('j-email',  match.email);
  set('j-street', match.street);
  set('j-city',   match.city);
  set('j-state',  match.state);
  set('j-zip',    match.zip);
  document.getElementById('j-fname').dataset.customerId = match.id;
}

```

**Step 4: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: update job form with split name, full contact fields, and customer autocomplete"
```

---

## Task 3: Update addJob() to Create/Link Customer Records

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Replace addJob()**

Find (line 1422):
```js
function addJob() {
  const customer = document.getElementById('j-customer').value.trim();
  if (!customer) { alert('Customer name is required.'); return; }
  const parts = parseFloat(document.getElementById('j-parts').value) || 0;
  const tax   = parts * (getSettings().taxRate || 0);
  DB.push('pp_jobs', {
    id: uid(), date: document.getElementById('j-date').value,
    customer, phone: document.getElementById('j-phone').value,
    address: document.getElementById('j-address').value,
    issue: document.getElementById('j-issue').value,
    service: document.getElementById('j-service').value,
    labor: parseFloat(document.getElementById('j-labor').value) || 0,
    parts,
    tax,
    status: document.getElementById('j-status').value,
    paid: false,
  });
  renderJobs();
}
```

Replace with:
```js
function addJob() {
  const fname = document.getElementById('j-fname').value.trim();
  const lname = document.getElementById('j-lname').value.trim();
  if (!fname) { alert('Customer first name is required.'); return; }
  const fullName = fname + (lname ? ' ' + lname : '');

  // Find or create customer record
  const customers = DB.get('pp_customers') || [];
  const fnameEl   = document.getElementById('j-fname');
  let customerId  = fnameEl.dataset.customerId || null;
  let customer    = customerId ? customers.find(c => c.id === customerId) : null;

  if (!customer) {
    // No linked record — check by name match
    customer = customers.find(c =>
      (c.firstName + ' ' + c.lastName).toLowerCase() === fullName.toLowerCase()
    );
  }

  const contactData = {
    firstName: fname,
    lastName:  lname,
    phone:     document.getElementById('j-phone').value,
    email:     document.getElementById('j-email').value,
    street:    document.getElementById('j-street').value,
    city:      document.getElementById('j-city').value,
    state:     document.getElementById('j-state').value,
    zip:       document.getElementById('j-zip').value,
  };

  if (customer) {
    // Update existing customer with any new info
    customerId = customer.id;
    DB.set('pp_customers', customers.map(c =>
      c.id === customerId ? Object.assign({}, c, contactData) : c
    ));
  } else {
    // Create new customer record
    customerId = uid();
    DB.push('pp_customers', Object.assign({ id: customerId, notes: '' }, contactData));
  }

  const parts = parseFloat(document.getElementById('j-parts').value) || 0;
  const tax   = parts * (getSettings().taxRate || 0);
  DB.push('pp_jobs', {
    id: uid(), date: document.getElementById('j-date').value,
    customer: fullName,
    customerId,
    phone:   contactData.phone,
    address: [contactData.street, contactData.city, contactData.state].filter(Boolean).join(', '),
    issue:   document.getElementById('j-issue').value,
    service: document.getElementById('j-service').value,
    labor:   parseFloat(document.getElementById('j-labor').value) || 0,
    parts,
    tax,
    status: document.getElementById('j-status').value,
    paid: false,
  });
  renderJobs();
}
```

**Step 2: Verify**

- [ ] Add a new job — check DevTools → Local Storage → `pp_customers` contains the new record
- [ ] Add a second job with the same name — `pp_customers` should still have one record, not two
- [ ] `pp_jobs` entry has both `customer` (full name string) and `customerId`

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: addJob creates or links customer record on save"
```

---

## Task 4: Rebuild renderCustomerList() Using pp_customers

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Replace renderCustomerList()**

Find (line 884):
```js
function renderCustomerList() {
  const jobs = DB.get('pp_jobs') || [];

  const byName = {};
  jobs.forEach(j => {
    if (!byName[j.customer]) byName[j.customer] = [];
    byName[j.customer].push(j);
  });

  const customers = Object.keys(byName).map(name => {
    const cjobs = byName[name].slice().sort((a, b) => b.date.localeCompare(a.date));
    const totalSpent = cjobs.filter(j => j.paid).reduce((s, j) => s + Number(j.labor) + Number(j.parts) + Number(j.tax || 0), 0);
    return { name, phone: cjobs[0].phone || '', jobs: cjobs.length, totalSpent, lastVisit: cjobs[0].date };
  }).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
```

Replace with:
```js
function renderCustomerList() {
  const jobs      = DB.get('pp_jobs') || [];
  const stored    = DB.get('pp_customers') || [];

  // Build display list — stored records first, then any job-only names not yet in pp_customers
  const seenNames = new Set(stored.map(c => (c.firstName + ' ' + c.lastName).toLowerCase()));
  const jobOnly   = [];
  const byName    = {};
  jobs.forEach(j => {
    if (!byName[j.customer]) byName[j.customer] = [];
    byName[j.customer].push(j);
    if (!seenNames.has(j.customer.toLowerCase())) {
      seenNames.add(j.customer.toLowerCase());
      jobOnly.push({ id: null, firstName: j.customer, lastName: '', phone: j.phone || '', email: '', city: '' });
    }
  });

  const allCustomers = [...stored, ...jobOnly].map(c => {
    const fullName = c.firstName + (c.lastName ? ' ' + c.lastName : '');
    const cjobs    = (byName[fullName] || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const totalSpent = cjobs.filter(j => j.paid).reduce((s, j) => s + Number(j.labor) + Number(j.parts) + Number(j.tax || 0), 0);
    return { ...c, fullName, jobs: cjobs.length, totalSpent, lastVisit: cjobs[0]?.date || '' };
  }).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
```

**Step 2: Update the rows template and section-header**

Find immediately after the block above:
```js
  const totalRevenue = jobs.filter(j => j.paid).reduce((s, j) => s + Number(j.labor) + Number(j.parts), 0);

  const rows = customers.length === 0
    ? '<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:24px">No customers yet</td></tr>'
    : customers.map(c =>
        '<tr>'
        + '<td><strong>' + esc(c.name) + '</strong></td>'
        + '<td style="color:var(--muted)">' + (esc(c.phone) || '&mdash;') + '</td>'
        + '<td>' + c.jobs + '</td>'
        + '<td style="color:var(--positive)">' + fmt(c.totalSpent) + '</td>'
        + '<td>' + esc(c.lastVisit) + '</td>'
        + '<td><button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" data-customer="' + esc(c.name) + '" onclick="showCustomer(this.dataset.customer)">View &rarr;</button></td>'
        + '</tr>'
      ).join('');

  document.getElementById('customers').innerHTML =
    '<div class="page-title">Customers</div>'
    + '<div class="totals-bar">'
    + '<div class="total-item"><label>Total Customers</label><span>' + customers.length + '</span></div>'
    + '<div class="total-item"><label>Total Revenue</label><span style="color:var(--positive)">' + fmt(totalRevenue) + '</span></div>'
    + '</div>'
    + '<div class="table-wrap"><table>'
    + '<thead><tr><th>Customer</th><th>Phone</th><th>Jobs</th><th>Total Spent</th><th>Last Visit</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>';
}
```

Replace with:
```js
  const totalRevenue = jobs.filter(j => j.paid).reduce((s, j) => s + Number(j.labor) + Number(j.parts), 0);

  const rows = allCustomers.length === 0
    ? '<tr><td colspan="7" style="color:var(--muted);text-align:center;padding:24px">No customers yet</td></tr>'
    : allCustomers.map(c =>
        '<tr>'
        + '<td><strong>' + esc(c.fullName) + '</strong></td>'
        + '<td style="color:var(--muted)">' + (esc(c.phone) || '&mdash;') + '</td>'
        + '<td style="color:var(--muted)">' + (esc(c.email) || '&mdash;') + '</td>'
        + '<td style="color:var(--muted)">' + (esc(c.city) || '&mdash;') + '</td>'
        + '<td>' + c.jobs + '</td>'
        + '<td style="color:var(--positive)">' + fmt(c.totalSpent) + '</td>'
        + '<td><button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" data-customer="' + esc(c.fullName) + '" onclick="showCustomer(this.dataset.customer)">View &rarr;</button></td>'
        + '</tr>'
      ).join('');

  document.getElementById('customers').innerHTML =
    '<div class="section-header">'
    + '<div class="page-title">Customers</div>'
    + '<button class="btn btn-primary" onclick="toggleForm(\'add-customer-form\')">+ Add Customer</button>'
    + '</div>'
    + '<div class="add-form" id="add-customer-form">'
    + renderAddCustomerFormHTML()
    + '</div>'
    + '<div class="totals-bar">'
    + '<div class="total-item"><label>Total Customers</label><span>' + allCustomers.length + '</span></div>'
    + '<div class="total-item"><label>Total Revenue</label><span style="color:var(--positive)">' + fmt(totalRevenue) + '</span></div>'
    + '</div>'
    + '<div class="table-wrap"><table>'
    + '<thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Jobs</th><th>Total Spent</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>';
}
```

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: rebuild customer list using pp_customers store"
```

---

## Task 5: Add Customer Form + addCustomer() Function

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add `renderAddCustomerFormHTML()` helper**

Find:
```js
function renderCustomerList() {
```

Insert immediately before it:
```js
function renderAddCustomerFormHTML(prefill) {
  const v = prefill || {};
  const field = (id, label, placeholder, type, extra) =>
    '<div class="form-group"><label>' + label + '</label>'
    + '<input id="ac-' + id + '" ' + (type ? 'type="' + type + '"' : '') + ' placeholder="' + placeholder + '" value="' + esc(v[id] || '') + '" ' + (extra || '') + '></div>';
  return '<div class="form-grid">'
    + field('fname',  'First Name',  'Jane',          '',       'required')
    + field('lname',  'Last Name',   'Smith',          '',       '')
    + field('phone',  'Phone',       '555-000-0000',   '',       '')
    + field('email',  'Email',       'jane@example.com','email', '')
    + field('street', 'Street',      '123 Main St',    '',       '')
    + field('city',   'City',        'Springfield',    '',       '')
    + field('state',  'State',       'IL',             '',       'style="max-width:80px"')
    + field('zip',    'Zip',         '62701',           '',       'style="max-width:120px"')
    + '<div class="form-group" style="grid-column:span 2"><label>Notes <span style="color:var(--muted);font-weight:400">(optional)</span></label>'
    + '<input id="ac-notes" placeholder="Anything to remember about this customer" value="' + esc(v.notes || '') + '"></div>'
    + '</div>'
    + '<button class="btn btn-primary" onclick="saveCustomerForm()">Save Customer</button>';
}

function saveCustomerForm(existingId) {
  const get = id => (document.getElementById('ac-' + id) || {}).value || '';
  const fname = get('fname').trim();
  if (!fname) { alert('First name is required.'); return; }
  const record = {
    firstName: fname,
    lastName:  get('lname').trim(),
    phone:     get('phone'),
    email:     get('email'),
    street:    get('street'),
    city:      get('city'),
    state:     get('state'),
    zip:       get('zip'),
    notes:     get('notes'),
  };
  if (existingId) {
    const customers = DB.get('pp_customers') || [];
    DB.set('pp_customers', customers.map(c => c.id === existingId ? Object.assign({}, c, record) : c));
  } else {
    DB.push('pp_customers', Object.assign({ id: uid() }, record));
  }
  renderCustomers();
}

```

**Step 2: Verify**

- [ ] Customers tab shows "+ Add Customer" button at top right
- [ ] Clicking opens an inline form with all fields
- [ ] Saving a customer adds it to the list
- [ ] Customer appears in the job form autocomplete datalist next time Jobs tab is opened

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add standalone Add Customer form and saveCustomerForm function"
```

---

## Task 6: Rebuild renderCustomerDetail() with Full Fields + Edit Button

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Update renderCustomerDetail() to use customer record**

Find (around line 990 after the parallel session additions):
```js
function renderCustomerDetail(name) {
  const jobs = (DB.get('pp_jobs') || []).filter(j => j.customer === name)
```

Replace the entire `renderCustomerDetail` function with:
```js
function renderCustomerDetail(name) {
  const customers = DB.get('pp_customers') || [];
  const rec       = customers.find(c => (c.firstName + ' ' + c.lastName).trim() === name.trim()) || {};
  const jobs      = (DB.get('pp_jobs') || []).filter(j => j.customer === name)
                                              .slice().sort((a, b) => b.date.localeCompare(a.date));
  const phone       = rec.phone   || (jobs[0] || {}).phone   || '';
  const totalSpent  = jobs.filter(j => j.paid).reduce((s, j) => s + Number(j.labor) + Number(j.parts) + Number(j.tax || 0), 0);
  const outstanding = jobs.filter(j => !j.paid && j.status !== 'Closed')
                          .reduce((s, j) => s + Number(j.labor) + Number(j.parts) + Number(j.tax || 0), 0);
  const dates      = jobs.map(j => j.date).sort();
  const firstVisit = dates[0] || '';
  const lastVisit  = dates[dates.length - 1] || '';

  const rows = jobs.map(j => {
    const total = Number(j.labor) + Number(j.parts) + Number(j.tax || 0);
    return '<tr>'
      + '<td>' + esc(j.date) + '</td>'
      + '<td>' + esc(j.issue) + '</td>'
      + '<td>' + esc(j.service) + '</td>'
      + '<td>' + fmt(j.labor) + '</td>'
      + '<td>' + fmt(j.parts) + '</td>'
      + '<td style="color:var(--positive)">' + fmt(total) + '</td>'
      + '<td>' + statusBadge(j.status) + '</td>'
      + '<td>' + (j.paid
          ? '<span style="color:var(--positive)">&#x2713; Paid</span>'
          : '<span style="color:var(--negative)">Unpaid</span>') + '</td>'
      + '</tr>';
  }).join('') || '<tr><td colspan="8" style="color:var(--muted);text-align:center;padding:24px">No jobs</td></tr>';

  const contactRows = [
    ['Phone',   rec.phone   || ''],
    ['Email',   rec.email   || ''],
    ['Street',  rec.street  || ''],
    ['City',    rec.city    || ''],
    ['State',   rec.state   || ''],
    ['Zip',     rec.zip     || ''],
    ['Notes',   rec.notes   || ''],
  ].filter(([, v]) => v).map(([label, val]) =>
    '<div><div style="font-size:11px;color:var(--muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:1px">' + label + '</div>'
    + '<div>' + esc(val) + '</div></div>'
  ).join('');

  document.getElementById('customers').innerHTML =
    '<div class="section-header">'
    + '<button class="btn btn-ghost" style="font-size:12px;padding:6px 14px" onclick="showCustomer(null)">&larr; All Customers</button>'
    + '<div class="page-title" style="margin-bottom:0">' + esc(name) + '</div>'
    + (rec.id ? '<button class="btn btn-ghost" style="font-size:12px;padding:6px 14px" onclick="editCustomer(\'' + esc(rec.id) + '\')">Edit</button>' : '')
    + '</div>'
    + '<div class="card" style="display:flex;gap:32px;flex-wrap:wrap;margin-bottom:20px">'
    + (contactRows || '<span style="color:var(--muted)">No contact info on file</span>')
    + '</div>'
    + '<div class="kpi-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:20px">'
    + '<div class="kpi-card"><div class="kpi-label">Total Spent</div><div class="kpi-value kpi-positive">' + fmt(totalSpent) + '</div></div>'
    + '<div class="kpi-card"><div class="kpi-label">Outstanding</div><div class="kpi-value kpi-negative">' + fmt(outstanding) + '</div></div>'
    + '<div class="kpi-card"><div class="kpi-label">Total Jobs</div><div class="kpi-value">' + jobs.length + '</div></div>'
    + '<div class="kpi-card"><div class="kpi-label">First Visit</div><div class="kpi-value kpi-accent" style="font-size:15px">' + (esc(firstVisit) || '&mdash;') + '</div></div>'
    + '<div class="kpi-card"><div class="kpi-label">Last Visit</div><div class="kpi-value kpi-accent" style="font-size:15px">' + (esc(lastVisit) || '&mdash;') + '</div></div>'
    + '</div>'
    + '<div class="table-wrap"><table>'
    + '<thead><tr><th>Date</th><th>Issue</th><th>Service</th><th>Labor</th><th>Parts</th><th>Total</th><th>Status</th><th>Paid</th></tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>';

  renderCustomerFollowups(name, phone);
}
```

**Step 2: Add `editCustomer()` function**

Find:
```js
function renderCustomerDetail(name) {
```

Insert immediately before it:
```js
function editCustomer(id) {
  const customers = DB.get('pp_customers') || [];
  const rec = customers.find(c => c.id === id);
  if (!rec) return;
  const fullName = rec.firstName + (rec.lastName ? ' ' + rec.lastName : '');
  const prefill = {
    fname: rec.firstName, lname: rec.lastName, phone: rec.phone,
    email: rec.email, street: rec.street, city: rec.city,
    state: rec.state, zip: rec.zip, notes: rec.notes,
  };
  document.getElementById('customers').innerHTML =
    '<div class="section-header">'
    + '<button class="btn btn-ghost" style="font-size:12px;padding:6px 14px" onclick="showCustomer(\'' + esc(fullName) + '\')">&larr; ' + esc(fullName) + '</button>'
    + '<div class="page-title" style="margin-bottom:0">Edit Customer</div>'
    + '</div>'
    + '<div class="card">'
    + renderAddCustomerFormHTML(prefill)
    + '</div>';
  // Override the Save button to update instead of create
  const btn = document.querySelector('#customers .btn-primary');
  if (btn) btn.setAttribute('onclick', 'saveCustomerForm(\'' + esc(id) + '\')');
}

```

**Step 3: Verify**

- [ ] Customer detail shows all contact fields (phone, email, city, etc.)
- [ ] "Edit" button appears on customer detail
- [ ] Editing and saving updates the customer record in pp_customers
- [ ] After save, detail view reflects updated info

**Step 4: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: rebuild customer detail with full contact fields and edit button"
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

- [ ] Customers tab shows "+ Add Customer" button, list has Name/Phone/Email/City columns
- [ ] Adding a customer via the form saves to pp_customers (check DevTools Local Storage)
- [ ] Jobs tab — Customer Name field shows autocomplete suggestions from pp_customers
- [ ] Selecting a known customer auto-fills all contact fields
- [ ] Adding a job with a new name creates a customer record automatically
- [ ] Customer detail page shows all contact fields + Edit button
- [ ] Editing a customer updates the record and re-renders detail
- [ ] Reload — all customer data persists (Firestore sync working)

---

## Final Checklist

- [ ] `pp_customers` in FS_KEYS — syncs to Firestore
- [ ] Job form has first name, last name, phone, email, street, city, state, zip
- [ ] Datalist autocomplete filters from pp_customers as you type
- [ ] Selecting known customer auto-fills all fields
- [ ] New name on job save creates a new customer record
- [ ] Returning customer on job save updates their record with any new info
- [ ] Standalone Add Customer button + form in Customers tab
- [ ] Customer list shows Name, Phone, Email, City, Jobs, Total Spent
- [ ] Customer detail shows all contact fields
- [ ] Edit button on customer detail works
- [ ] No existing functionality broken
