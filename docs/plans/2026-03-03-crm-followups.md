# CRM Follow-up Reminders — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-customer follow-up reminders with a daily 8am email listing what's due.

**Architecture:** New `pp_followups` array in localStorage/Firestore (auto-synced via existing DB.set). Follow-ups nav tab + inline form on customer detail + modal on job row. Firebase Cloud Functions scheduled cron reads today's followups from Firestore and writes to `mail/` collection. Firebase "Trigger Email from Firestore" extension sends the email.

**Tech Stack:** Vanilla JS, localStorage, Firebase Firestore sync, Firebase Cloud Functions v2 (Node 18), Firebase "Trigger Email from Firestore" extension, Gmail SMTP. Output file: `/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html`.

---

## Task 1: Add `pp_followups` to FS_KEYS

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add key to sync array**

Find (line 223):
```js
const FS_KEYS = ['pp_settings','pp_income','pp_expenses','pp_mileage','pp_jobs','pp_seeded'];
```

Replace with:
```js
const FS_KEYS = ['pp_settings','pp_income','pp_expenses','pp_mileage','pp_jobs','pp_seeded','pp_followups'];
```

**Step 2: Verify**

- [ ] `FS_KEYS` now includes `'pp_followups'`

**Step 3: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add pp_followups to Firestore sync keys"
```

---

## Task 2: Add Follow-ups Nav Button and Section Element

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add nav button between Customers and Jobs**

Find (line 178):
```html
      <button class="nav-btn" data-section="customers">Customers</button>
      <button class="nav-btn" data-section="jobs">Jobs</button>
```

Replace with:
```html
      <button class="nav-btn" data-section="customers">Customers</button>
      <button class="nav-btn" data-section="followups">Follow-ups</button>
      <button class="nav-btn" data-section="jobs">Jobs</button>
```

**Step 2: Add section element**

Find (line 198):
```html
    <section id="customers" class="section"></section>
    <section id="jobs"      class="section"></section>
```

Replace with:
```html
    <section id="customers"  class="section"></section>
    <section id="followups"  class="section"></section>
    <section id="jobs"       class="section"></section>
```

**Step 3: Verify**

- [ ] "Follow-ups" nav button appears between Customers and Jobs
- [ ] Clicking it shows an empty section (no errors in DevTools console)

**Step 4: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Follow-ups nav tab and section element"
```

---

## Task 3: Add renderFollowups() and markFollowupDone()

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Find insertion point**

Find (line 956):
```js
// ── Mileage section ──────────────────────────────────────────────────────────
function renderMileage() {
```

**Step 2: Insert two functions immediately before that comment**

```js
// ── Follow-ups section ────────────────────────────────────────────────────────
function renderFollowups() {
  const all      = DB.get('pp_followups') || [];
  const pending  = all.filter(f => !f.done).slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const todayStr = today();

  const rows = pending.map(f => {
    const overdue = f.dueDate < todayStr;
    return '<tr>'
      + '<td style="color:' + (overdue ? 'var(--negative)' : 'inherit') + ';font-weight:' + (overdue ? '700' : '400') + '">' + esc(f.dueDate) + (overdue ? ' <span style="font-size:10px">OVERDUE</span>' : '') + '</td>'
      + '<td><strong>' + esc(f.customerName) + '</strong></td>'
      + '<td style="color:var(--muted)">' + (esc(f.phone) || '&mdash;') + '</td>'
      + '<td>' + esc(f.note) + '</td>'
      + '<td><button class="btn btn-success" style="font-size:11px;padding:4px 10px" onclick="markFollowupDone(\'' + esc(f.id) + '\')">Done</button></td>'
      + '</tr>';
  }).join('') || '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:24px">No pending follow-ups</td></tr>';

  document.getElementById('followups').innerHTML =
    '<div class="section-header">'
    + '<div class="page-title">Follow-ups</div>'
    + '</div>'
    + '<div class="table-wrap"><table>'
    + '<thead><tr><th>Due Date</th><th>Customer</th><th>Phone</th><th>Note</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>';
}

function markFollowupDone(id) {
  const followups = DB.get('pp_followups') || [];
  DB.set('pp_followups', followups.map(f => f.id === id ? Object.assign({}, f, { done: true }) : f));
  renderFollowups();
}

```

**Step 3: Wire renderFollowups into the nav switch**

Find the nav click handler — search for `renderDashboard` or `case 'dashboard'` — the section is wired via a `switch` or `if/else` block that calls render functions per section.

Find:
```js
      case 'customers':   renderCustomers();   break;
```

Look for the full switch block and add after the `customers` case:
```js
      case 'followups':   renderFollowups();   break;
```

If the nav uses a different pattern (data-section matching), find:
```js
if (s === 'customers')   renderCustomers();
```
and add:
```js
if (s === 'followups')   renderFollowups();
```

**Step 4: Verify**

- [ ] Clicking Follow-ups nav renders the section with "No pending follow-ups" message
- [ ] No console errors

**Step 5: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add renderFollowups and markFollowupDone"
```

---

## Task 4: Add Follow-up Form to Customer Detail Page

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add `renderCustomerFollowups()` helper function**

Find (line 903):
```js
function renderCustomerDetail(name) {
```

Insert immediately before that line:
```js
function renderCustomerFollowups(name, phone) {
  const all = (DB.get('pp_followups') || [])
    .filter(f => f.customerName === name)
    .slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const d = new Date(); d.setDate(d.getDate() + 7);
  const defaultDate = d.toISOString().slice(0, 10);
  const todayStr = today();

  const fuRows = all.map(f =>
    '<tr style="opacity:' + (f.done ? '0.5' : '1') + '">'
    + '<td style="color:' + (!f.done && f.dueDate < todayStr ? 'var(--negative)' : f.done ? 'var(--muted)' : 'inherit') + '">' + esc(f.dueDate) + '</td>'
    + '<td>' + esc(f.note) + '</td>'
    + '<td>' + (f.done
        ? '<span style="color:var(--muted);font-size:11px">Done</span>'
        : '<button class="btn btn-success" style="font-size:11px;padding:4px 10px" onclick="markFollowupDoneFromCustomer(\'' + esc(f.id) + '\',\'' + esc(name) + '\')">Done</button>') + '</td>'
    + '</tr>'
  ).join('') || '<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:12px">No follow-ups yet</td></tr>';

  return '<div style="margin-top:28px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
    + '<div style="font-weight:700;font-family:var(--font)">Follow-ups</div>'
    + '<button class="btn btn-primary" style="font-size:12px;padding:6px 14px" onclick="toggleForm(\'fu-inline\')">+ Follow-up</button>'
    + '</div>'
    + '<div class="add-form" id="fu-inline">'
    + '<div class="form-grid">'
    + '<div class="form-group"><label>Due Date</label><input type="date" id="fu-date" value="' + defaultDate + '"></div>'
    + '<div class="form-group" style="grid-column:span 2"><label>Note</label>'
    + '<textarea id="fu-note" rows="2" placeholder="What to follow up about?" style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:8px;color:var(--text);font-family:var(--font);font-size:13px;resize:vertical"></textarea></div>'
    + '</div>'
    + '<button class="btn btn-primary" onclick="addFollowup(\'' + esc(name) + '\',\'' + esc(phone) + '\')">Save Follow-up</button>'
    + '</div>'
    + '<div class="table-wrap" style="margin-top:8px"><table>'
    + '<thead><tr><th>Due Date</th><th>Note</th><th></th></tr></thead>'
    + '<tbody>' + fuRows + '</tbody>'
    + '</table></div>'
    + '</div>';
}

```

**Step 2: Append follow-up section at end of renderCustomerDetail()**

Find the last two lines of `renderCustomerDetail()`:
```js
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>';
}
```

Replace with:
```js
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + renderCustomerFollowups(name, phone);
}
```

**Step 3: Add helper functions after `renderCustomerFollowups`**

Find:
```js
function renderCustomerDetail(name) {
```

Insert these two functions immediately before it (right after `renderCustomerFollowups`):
```js
function addFollowup(customerName, phone) {
  const note    = (document.getElementById('fu-note')    || {}).value || '';
  const dueDate = (document.getElementById('fu-date')    || {}).value || '';
  if (!note.trim() || !dueDate) { alert('Please add a note and due date.'); return; }
  DB.push('pp_followups', { id: uid(), customerName, phone, note: note.trim(), dueDate, done: false });
  renderCustomerDetail(customerName);
}

function markFollowupDoneFromCustomer(id, name) {
  const followups = DB.get('pp_followups') || [];
  DB.set('pp_followups', followups.map(f => f.id === id ? Object.assign({}, f, { done: true }) : f));
  renderCustomerDetail(name);
}

```

**Step 4: Verify**

- [ ] Customer detail page shows "Follow-ups" section below job history
- [ ] "+ Follow-up" button expands an inline form
- [ ] Saving a follow-up adds it to the list and re-renders
- [ ] "Done" button marks it done (row goes muted/struck)
- [ ] Follow-ups tab also shows the new follow-up

**Step 5: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add follow-up form and list to customer detail page"
```

---

## Task 5: Add Follow-up Modal + Job Row Button

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add modal HTML**

Find:
```html
<div id="receipt-modal"
```

Insert immediately before it:
```html
<div id="fu-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85);
     z-index:999; align-items:center; justify-content:center; flex-direction:column;">
  <div style="background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
              padding:32px; width:340px;">
    <div style="font-weight:700; font-family:var(--font); margin-bottom:4px; color:var(--text);">Add Follow-up</div>
    <div id="fu-modal-customer" style="color:var(--muted); font-size:13px; font-family:var(--font); margin-bottom:20px;"></div>
    <div class="form-group"><label>Due Date</label>
      <input type="date" id="fu-modal-date"></div>
    <div class="form-group"><label>Note</label>
      <textarea id="fu-modal-note" rows="3" placeholder="What to follow up about?"
        style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);
               border-radius:var(--radius);padding:8px;color:var(--text);font-family:var(--font);
               font-size:13px;resize:vertical"></textarea></div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn btn-primary" onclick="saveFollowupModal()">Save</button>
      <button class="btn btn-ghost" onclick="closeFollowupModal()">Cancel</button>
    </div>
  </div>
</div>

```

**Step 2: Add three JS functions after `markFollowupDoneFromCustomer`**

Find:
```js
function renderCustomerFollowups(name, phone) {
```

Insert these three functions immediately before it:
```js
// ── Follow-up modal (from job row) ────────────────────────────────────────────
let _fuCustomer = '';
let _fuPhone    = '';

function openFollowupModal(customerName, phone) {
  _fuCustomer = customerName;
  _fuPhone    = phone || '';
  document.getElementById('fu-modal-customer').textContent = customerName;
  const d = new Date(); d.setDate(d.getDate() + 7);
  document.getElementById('fu-modal-date').value = d.toISOString().slice(0, 10);
  document.getElementById('fu-modal-note').value = '';
  document.getElementById('fu-modal').style.display = 'flex';
}

function closeFollowupModal() {
  document.getElementById('fu-modal').style.display = 'none';
}

function saveFollowupModal() {
  const note    = (document.getElementById('fu-modal-note') || {}).value || '';
  const dueDate = (document.getElementById('fu-modal-date') || {}).value || '';
  if (!note.trim() || !dueDate) { alert('Please add a note and due date.'); return; }
  DB.push('pp_followups', { id: uid(), customerName: _fuCustomer, phone: _fuPhone, note: note.trim(), dueDate, done: false });
  closeFollowupModal();
}

```

**Step 3: Add Follow-up button to job row Actions column**

Find in `renderJobs()` (around line 1115):
```js
                <td style="display:flex;gap:6px;align-items:center">
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openInvoice('${esc(j.id)}')">Invoice</button>
                  <button class="btn btn-danger" onclick="deleteJob('${esc(j.id)}')">&#x2715;</button>
                </td>
```

Replace with:
```js
                <td style="display:flex;gap:6px;align-items:center">
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openInvoice('${esc(j.id)}')">Invoice</button>
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openFollowupModal('${esc(j.customer)}','${esc(j.phone)}')">Follow-up</button>
                  <button class="btn btn-danger" onclick="deleteJob('${esc(j.id)}')">&#x2715;</button>
                </td>
```

**Step 4: Verify**

- [ ] Each job row has a "Follow-up" button in the Actions column
- [ ] Clicking it opens the modal pre-filled with customer name
- [ ] Saving the modal adds a record to pp_followups (check localStorage in DevTools)
- [ ] The Follow-ups tab shows the new entry

**Step 5: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add follow-up modal and job row button"
```

---

## Task 6: Install Firebase Trigger Email Extension (Manual Step)

This task requires clicking through the Firebase Console — no code changes.

**Step 1: Open extension page**

Go to: https://console.firebase.google.com/u/0/project/pixelpatcher-accounting/extensions

**Step 2: Find and install extension**

1. Click "Explore Extensions"
2. Search for "Trigger Email"
3. Click "Trigger Email from Firestore" → Install

**Step 3: Configure extension**

Fill in the configuration form:
- **SMTP connection URI:** `smtps://jason.persinger@gmail.com:APP_PASSWORD@smtp.gmail.com:465`
  - Replace `APP_PASSWORD` with a Gmail App Password (Settings → Security → 2-Step Verification → App passwords → create one for "Pixel Patcher")
- **Email documents collection:** `mail`
- **Default FROM address:** `jason.persinger@gmail.com`
- Click **Install extension** — takes 3-5 minutes

**Step 4: Verify**

You can test the extension by creating a document in Firestore `mail/` collection manually:
```json
{
  "to": "jason.persinger@gmail.com",
  "message": {
    "subject": "Test from Pixel Patcher",
    "text": "Extension is working!"
  }
}
```
Check that email arrives in inbox.

---

## Task 7: Create and Deploy Cloud Function

**Files to create:**
- `Accounting/functions/index.js`
- `Accounting/functions/package.json`

**Also modify:** `Accounting/firebase.json`

**Step 1: Create functions directory**

```bash
mkdir -p /home/jason/Desktop/PIXELPATCHER/Accounting/functions
```

**Step 2: Create `Accounting/functions/package.json`**

```json
{
  "name": "pixelpatcher-functions",
  "version": "1.0.0",
  "description": "Pixel Patcher Cloud Functions",
  "engines": { "node": "18" },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.0.0"
  }
}
```

**Step 3: Create `Accounting/functions/index.js`**

```js
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const RECIPIENT = 'jason.persinger@gmail.com';

exports.dailyFollowupEmail = functions.pubsub
  .schedule('0 13 * * *')          // 8:00 AM Eastern (UTC-5 = 13:00 UTC)
  .timeZone('America/New_York')
  .onRun(async () => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const usersSnap = await db.collection('users').get();
    let dueFollowups = [];

    for (const userDoc of usersSnap.docs) {
      const fuDoc = await db
        .collection('users').doc(userDoc.id)
        .collection('data').doc('pp_followups')
        .get();
      if (!fuDoc.exists) continue;
      const followups = fuDoc.data().value || [];
      const due = followups.filter(f => f.dueDate === today && !f.done);
      dueFollowups = dueFollowups.concat(due);
    }

    if (dueFollowups.length === 0) {
      console.log('No follow-ups due today.');
      return null;
    }

    const count = dueFollowups.length;
    const list  = dueFollowups.map(f =>
      `• ${f.customerName} — ${f.phone || 'no phone'}\n  ${f.note}`
    ).join('\n\n');

    await db.collection('mail').add({
      to: RECIPIENT,
      message: {
        subject: `Pixel Patcher — ${count} follow-up${count > 1 ? 's' : ''} due today`,
        text:    `Good morning! You have ${count} follow-up${count > 1 ? 's' : ''} due today:\n\n${list}\n\n— Pixel Patcher`,
      },
    });

    console.log(`Sent follow-up email for ${count} item(s).`);
    return null;
  });
```

**Step 4: Update `Accounting/firebase.json` to include functions**

Find:
```json
{
  "firestore": {
```

Replace the entire file with:
```json
{
  "firestore": {
    "database": "(default)",
    "location": "us-east1",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": {
    "source": "functions"
  },
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "functions/**"
    ]
  }
}
```

**Step 5: Install function dependencies**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting/functions
npm install
```

**Step 6: Deploy Cloud Functions**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only functions
```

Expected output: `✔  functions[dailyFollowupEmail(us-central1)]: Successful deploy`

**Step 7: Also deploy updated hosting**

```bash
npx firebase-tools@latest deploy --only hosting
```

**Step 8: Verify**

- [ ] Firebase Console → Functions → `dailyFollowupEmail` shows as active
- [ ] Firebase Console → Functions → click function → Logs → no errors on startup
- [ ] To test immediately: Firebase Console → Functions → Test function → trigger manually (or temporarily change schedule to `* * * * *` for 1 min, deploy, wait, check email, change back)

**Step 9: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/functions/ Accounting/firebase.json
git commit -m "feat: add dailyFollowupEmail Cloud Function with Trigger Email integration"
```

---

## Final Checklist

- [ ] `pp_followups` added to `FS_KEYS` — syncs to Firestore automatically
- [ ] Follow-ups nav tab appears and renders pending follow-ups
- [ ] Overdue follow-ups shown in red with "OVERDUE" label
- [ ] "Done" button on Follow-ups tab marks done and re-renders
- [ ] Customer detail page shows Follow-up section below job history
- [ ] "+ Follow-up" expands inline form with date + note
- [ ] Saving from customer detail form saves and re-renders
- [ ] "Done" on customer detail re-renders customer view
- [ ] Job row has "Follow-up" button in Actions column
- [ ] Follow-up modal opens pre-filled with customer name, defaulting to +7 days
- [ ] Firebase Trigger Email extension installed and verified
- [ ] Cloud Function `dailyFollowupEmail` deployed and active
- [ ] Email arrives at jason.persinger@gmail.com with correct format
- [ ] Follow-ups persist after page reload (Firestore sync working)
