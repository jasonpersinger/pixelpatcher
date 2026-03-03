# Customer History — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Customers tab with a customer list (summary stats per customer) and a drill-in detail view (contact info, lifetime stats, full job history) derived entirely from existing pp_jobs data.

**Architecture:** No new data store. All customer data is derived from pp_jobs at render time by grouping on job.customer (name string). A module-level _customerView variable (null = list view, string = customer name = detail view) drives which view renders inside the single #customers section. Address is added as an optional field to jobs so it surfaces in customer detail.

**Tech Stack:** Vanilla JS, single HTML file. Output file: /home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html.

---

## Task 1: Add Customers Nav Button and Section Element

**File:** Modify Accounting/PIXELPATCHER-Accounting.html

**Step 1: Add Customers nav button between Income and Jobs**

Use the Edit tool. old_string:
      <button class="nav-btn" data-section="income">Income</button>
      <button class="nav-btn" data-section="jobs">Jobs</button>

new_string:
      <button class="nav-btn" data-section="income">Income</button>
      <button class="nav-btn" data-section="customers">Customers</button>
      <button class="nav-btn" data-section="jobs">Jobs</button>

**Step 2: Add customers section element between income and jobs**

Use the Edit tool. old_string:
    <section id="income"    class="section"></section>
    <section id="jobs"      class="section"></section>

new_string:
    <section id="income"    class="section"></section>
    <section id="customers" class="section"></section>
    <section id="jobs"      class="section"></section>

**Step 3: Verify**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html — "Customers" should appear in the sidebar between Income and Jobs. Clicking it shows a blank area (expected, no render function yet).

**Step 4: Commit**

  cd /home/jason/Desktop/PIXELPATCHER
  git add Accounting/PIXELPATCHER-Accounting.html
  git commit -m "feat: add customers nav button and section element"

---

## Task 2: Wire renderSection for Customers

**File:** Modify Accounting/PIXELPATCHER-Accounting.html

**Step 1: Add customers case to renderSection**

Use the Edit tool. old_string:
  else if (name === 'income')   renderIncome();
  else if (name === 'jobs')     renderJobs();

new_string:
  else if (name === 'income')   renderIncome();
  else if (name === 'customers') renderCustomers();
  else if (name === 'jobs')     renderJobs();

**Step 2: Commit**

  cd /home/jason/Desktop/PIXELPATCHER
  git add Accounting/PIXELPATCHER-Accounting.html
  git commit -m "feat: wire customers section in renderSection"

---

## Task 3: Add renderCustomers Functions

All new code goes after deleteIncome and before the Mileage section comment.

**File:** Modify Accounting/PIXELPATCHER-Accounting.html

**Step 1: Insert customers functions block**

Use the Edit tool. old_string:
// ── Mileage section ──────────────────────────────────────────────────────────
function renderMileage() {

new_string:
// ── Customers section ────────────────────────────────────────────────────────
let _customerView = null;

function showCustomer(name) {
  _customerView = name;
  renderCustomers();
}

function renderCustomers() {
  if (_customerView) renderCustomerDetail(_customerView);
  else renderCustomerList();
}

function renderCustomerList() {
  const jobs = DB.get('pp_jobs') || [];

  const byName = {};
  jobs.forEach(j => {
    if (!byName[j.customer]) byName[j.customer] = [];
    byName[j.customer].push(j);
  });

  const customers = Object.keys(byName).map(name => {
    const cjobs = byName[name].slice().sort((a, b) => b.date.localeCompare(a.date));
    const totalSpent = cjobs.filter(j => j.paid).reduce((s, j) => s + Number(j.labor) + Number(j.parts), 0);
    return { name, phone: cjobs[0].phone || '', jobs: cjobs.length, totalSpent, lastVisit: cjobs[0].date };
  }).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

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
        + '<td><button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="showCustomer(\'' + esc(c.name) + '\')">View &rarr;</button></td>'
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

function renderCustomerDetail(name) {
  const jobs = (DB.get('pp_jobs') || []).filter(j => j.customer === name)
                                         .slice().sort((a, b) => b.date.localeCompare(a.date));
  const recent      = jobs[0] || {};
  const phone       = recent.phone   || '';
  const address     = recent.address || '';
  const totalSpent  = jobs.filter(j => j.paid).reduce((s, j) => s + Number(j.labor) + Number(j.parts), 0);
  const outstanding = jobs.filter(j => !j.paid && j.status !== 'Closed')
                          .reduce((s, j) => s + Number(j.labor) + Number(j.parts), 0);
  const dates       = jobs.map(j => j.date).sort();
  const firstVisit  = dates[0] || '';
  const lastVisit   = dates[dates.length - 1] || '';

  const rows = jobs.map(j => {
    const total = Number(j.labor) + Number(j.parts);
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

  document.getElementById('customers').innerHTML =
    '<div class="section-header">'
    + '<button class="btn btn-ghost" style="font-size:12px;padding:6px 14px" onclick="showCustomer(null)">&larr; All Customers</button>'
    + '<div class="page-title" style="margin-bottom:0">' + esc(name) + '</div>'
    + '</div>'
    + '<div class="card" style="display:flex;gap:32px;margin-bottom:20px">'
    + '<div><div style="font-size:11px;color:var(--muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:1px">Phone</div>'
    + '<div>' + (esc(phone) || '&mdash;') + '</div></div>'
    + '<div><div style="font-size:11px;color:var(--muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:1px">Address</div>'
    + '<div>' + (esc(address) || '&mdash;') + '</div></div>'
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
}

// ── Mileage section ──────────────────────────────────────────────────────────
function renderMileage() {

**Step 2: Verify in browser**

- Customers tab shows list with seed data (if any jobs exist) or "No customers yet"
- List shows Total Customers and Total Revenue in totals bar
- "View" button on a customer row opens detail view
- Detail view shows phone, address (blank = dashes), 5 stat cards, jobs table
- Back button returns to list
- Stats are correct: seed job shows correct total

**Step 3: Commit**

  cd /home/jason/Desktop/PIXELPATCHER
  git add Accounting/PIXELPATCHER-Accounting.html
  git commit -m "feat: add customer list and detail views"

---

## Task 4: Add Address Field to Job Form

**File:** Modify Accounting/PIXELPATCHER-Accounting.html

**Step 1: Add address input to job form**

Use the Edit tool. old_string:
        <div class="form-group"><label>Phone</label>
          <input id="j-phone" placeholder="555-000-0000"></div>
        <div class="form-group"><label>Issue Description</label>

new_string:
        <div class="form-group"><label>Phone</label>
          <input id="j-phone" placeholder="555-000-0000"></div>
        <div class="form-group"><label>Address <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input id="j-address" placeholder="Street, City, State"></div>
        <div class="form-group"><label>Issue Description</label>

**Step 2: Capture address in addJob**

Use the Edit tool. old_string:
    customer, phone: document.getElementById('j-phone').value,

new_string:
    customer, phone: document.getElementById('j-phone').value,
    address: document.getElementById('j-address').value,

**Step 3: Verify**

Open Jobs, click "+ New Job" — Address field appears after Phone, marked optional. Submit a job with an address. Navigate to Customers, click the customer row — address appears in the contact block.

**Step 4: Commit**

  cd /home/jason/Desktop/PIXELPATCHER
  git add Accounting/PIXELPATCHER-Accounting.html
  git commit -m "feat: add optional address field to job form"

---

## Task 5: Deploy and Final Verification

**Step 1: Deploy to Firebase Hosting**

  cd /home/jason/Desktop/PIXELPATCHER/Accounting
  npx firebase-tools@latest deploy --only hosting

**Step 2: Verify at live URL**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html

- [ ] Customers nav item visible between Income and Jobs
- [ ] Customer list shows all customers with correct stats
- [ ] View button drills into detail view
- [ ] Detail view: 5 stat cards correct, jobs table correct
- [ ] Back button returns to list
- [ ] New job with address -> customer detail shows address
- [ ] Jobs and Income sections unaffected (regression check)

---

## Final Checklist

- [ ] Customers nav button between Income and Jobs
- [ ] Section element #customers in HTML
- [ ] renderSection dispatches to renderCustomers
- [ ] _customerView state drives list vs detail rendering
- [ ] renderCustomerList groups pp_jobs by name, shows summary table
- [ ] renderCustomerDetail shows contact block, 5 stat cards, full jobs table
- [ ] showCustomer(name) and showCustomer(null) navigate between views
- [ ] Address field in job form (optional), stored on job record
- [ ] Deployed to Firebase Hosting
