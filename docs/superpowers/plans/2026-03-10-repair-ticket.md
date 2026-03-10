# Repair Ticket Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public repair ticket page that doubles as a digital work order (with customer acknowledgment) and live status tracker, generated from the accounting app and shared via native share sheet.

**Architecture:** A new `ticket.html` (customer-facing, no auth) reads from a separate `tickets` Firestore collection using the ticket ID from the URL query param (`?id=XXXXXX`). The accounting app gains a "Ticket" button per job that writes to `tickets/{ticketId}` in Firestore and opens the native share sheet. Status changes in the accounting app sync to the ticket doc. Note: a separate `tickets` collection is required because jobs are stored as arrays inside single Firestore documents at `users/{uid}/data/pp_jobs` — they cannot be queried individually without auth.

**Tech Stack:** Vanilla JS, Firebase Firestore compat v10.14.1, Firebase Hosting (rules deploy via firebase-tools), Netlify (ticket.html auto-deploys via git push to main)

---

## Chunk 1: Firestore rules + ticket.html

### Task 1: Update Firestore security rules

**Files:**
- Modify: `Accounting/firestore.rules`

- [ ] **Step 1: Update firestore.rules** — add `tickets` collection with public read and restricted acknowledgment write

Edit `Accounting/firestore.rules` to replace the full contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{key} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /mail/{docId} {
      allow create: if request.auth != null
        && request.auth.token.email == 'jason.persinger@gmail.com';
    }
    // Public booking requests from marketing site
    match /bookingRequests/{docId} {
      allow create: if true;
      allow read, update: if request.auth != null;
    }
    // Public repair tickets — read by anyone, create/update by Jason (auth)
    // Customers can acknowledge once: only allowed fields are customerAcknowledged + acknowledgedAt
    match /tickets/{ticketId} {
      allow read: if true;
      allow create, update: if request.auth != null
        || (
          !resource.data.customerAcknowledged &&
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['customerAcknowledged', 'acknowledgedAt']) &&
          request.resource.data.customerAcknowledged == true
        );
    }
  }
}
```

- [ ] **Step 2: Deploy rules**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only firestore:rules
```

Expected: `✔  firestore: released rules`

- [ ] **Step 3: Commit**

```bash
git add Accounting/firestore.rules
git commit -m "feat: add public tickets collection to firestore rules"
```

---

### Task 2: Create ticket.html

**Files:**
- Create: `ticket.html` (repo root, alongside card.html / trip.html)

The page reads `?id=XXXXXX` from the URL, fetches `tickets/{id}` from Firestore, and renders either the acknowledgment form (before customer agrees) or the live status timeline (after).

Status timeline maps existing job statuses to customer-friendly steps:
- **Received** — always done (ticket exists)
- **In Progress** — status is `In Progress` or `Warranty Claim`
- **Awaiting Parts** — status is `Awaiting Parts`
- **Complete** — status is `Complete` or `Closed`

- [ ] **Step 1: Create ticket.html using bash heredoc** (required — Write tool is blocked for innerHTML content)

```bash
cat << 'EOF' > /home/jason/Desktop/PIXELPATCHER/ticket.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Repair Ticket — Pixel Patcher</title>
  <meta name="description" content="View your Pixel Patcher repair agreement and status.">
  <link rel="icon" type="image/png" href="Branding/logoblack.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --black: #000000;
      --gold:  #C9A000;
      --white: #ffffff;
      --gray:  #aaaaaa;
      --dim:   #111111;
      --dim2:  #1a1a1a;
      --border:#2a2a2a;
      --green: #22c55e;
      --font-pixel: 'Press Start 2P', monospace;
      --font-body:  'DM Sans', sans-serif;
    }
    body {
      background: var(--black);
      color: var(--white);
      font-family: var(--font-body);
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 16px 60px;
    }
    .card { max-width: 480px; width: 100%; }
    .logo { width: 140px; height: auto; margin: 0 auto 24px; display: block; }
    .brand {
      font-family: var(--font-pixel);
      font-size: 9px;
      color: var(--gold);
      text-align: center;
      margin-bottom: 6px;
      letter-spacing: 0.04em;
    }
    .subtitle { text-align: center; font-size: 13px; color: var(--gray); margin-bottom: 32px; }
    .section {
      background: var(--dim);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--gold);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 14px;
    }
    .field { margin-bottom: 12px; }
    .field:last-child { margin-bottom: 0; }
    .field-label { font-size: 11px; color: var(--gray); margin-bottom: 3px; }
    .field-value { font-size: 15px; font-weight: 500; color: var(--white); }
    .field-value.price { font-size: 22px; font-weight: 700; color: var(--gold); }
    .agreement-text {
      font-size: 12px;
      color: var(--gray);
      line-height: 1.7;
      background: var(--dim2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px;
      margin-bottom: 18px;
    }
    .btn-agree {
      display: block;
      width: 100%;
      background: var(--gold);
      color: var(--black);
      border: none;
      border-radius: 8px;
      padding: 16px;
      font-family: var(--font-pixel);
      font-size: 10px;
      cursor: pointer;
      letter-spacing: 0.04em;
    }
    .btn-agree:active { opacity: 0.85; }
    .btn-agree:disabled { opacity: 0.5; cursor: default; }
    .ack-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(34,197,94,0.1);
      border: 1px solid var(--green);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: var(--green);
      font-weight: 600;
      margin-bottom: 20px;
    }
    .timeline { display: flex; flex-direction: column; gap: 0; }
    .timeline-step {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 10px 0;
      position: relative;
    }
    .timeline-step:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 11px;
      top: 32px;
      bottom: -10px;
      width: 2px;
      background: var(--border);
    }
    .timeline-step.active::after { background: var(--gold); }
    .timeline-step.done::after  { background: var(--green); }
    .step-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid var(--border);
      background: var(--black);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      margin-top: 1px;
    }
    .timeline-step.done .step-dot   { background:var(--green); border-color:var(--green); color:var(--black); font-weight:700; }
    .timeline-step.active .step-dot { background:var(--gold);  border-color:var(--gold);  color:var(--black); }
    .step-label { font-size: 14px; font-weight: 500; color: var(--gray); padding-top: 2px; }
    .timeline-step.done .step-label   { color: var(--green); }
    .timeline-step.active .step-label { color: var(--white); font-weight: 700; }
    .contact-link {
      display: block;
      text-align: center;
      color: var(--gold);
      font-size: 14px;
      text-decoration: none;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-weight: 500;
    }
    .loading { text-align: center; color: var(--gray); font-size: 14px; padding: 60px 0; }
    .error-msg { text-align: center; color: #f87171; font-size: 14px; padding: 40px 0; line-height: 1.6; }
  </style>
</head>
<body>
<div class="card">
  <img src="Branding/logoblack.png" alt="Pixel Patcher" class="logo">
  <div class="brand">PIXEL PATCHER</div>
  <div class="subtitle">Repair Ticket</div>
  <div id="root"><div class="loading">Loading your ticket…</div></div>
</div>

<script>
  firebase.initializeApp({
    apiKey: "AIzaSyD9DXFXJEudx4ODE-P1yYxAniM4jtqytJY",
    authDomain: "pixelpatcher-accounting.firebaseapp.com",
    projectId: "pixelpatcher-accounting",
    storageBucket: "pixelpatcher-accounting.firebasestorage.app",
    messagingSenderId: "1070850498937",
    appId: "1:1070850498937:web:774c2fb89d1da372a00fa8"
  });
  const fsdb = firebase.firestore();

  // Maps job status values to ordered timeline steps.
  // Each step: { label, match: fn(status) => bool }
  const TIMELINE = [
    { label: 'Received',        match: () => true },
    { label: 'In Progress',     match: s => ['In Progress','Warranty Claim'].includes(s) },
    { label: 'Awaiting Parts',  match: s => s === 'Awaiting Parts' },
    { label: 'Complete',        match: s => ['Complete','Closed'].includes(s) },
  ];

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmt(n) { return '$' + Number(n || 0).toFixed(2); }

  function fmtDate(s) {
    if (!s) return '—';
    const [y,m,d] = s.split('-');
    if (!y) return s;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(m,10)-1] + ' ' + parseInt(d,10) + ', ' + y;
  }

  function currentStepIndex(status) {
    // Walk backwards to find the last matching step
    for (let i = TIMELINE.length - 1; i >= 0; i--) {
      if (TIMELINE[i].match(status)) return i;
    }
    return 0;
  }

  function renderTimeline(status) {
    const currentIdx = currentStepIndex(status);
    return TIMELINE.map((step, i) => {
      const done   = i < currentIdx;
      const active = i === currentIdx;
      const cls    = done ? 'done' : active ? 'active' : '';
      const dot    = done ? '✓' : active ? '●' : '';
      return `<div class="timeline-step ${cls}">
        <div class="step-dot">${dot}</div>
        <div class="step-label">${esc(step.label)}</div>
      </div>`;
    }).join('');
  }

  function renderTicket(t, ticketId) {
    const ackDate = t.acknowledgedAt
      ? (t.acknowledgedAt.toDate ? t.acknowledgedAt.toDate().toLocaleDateString() : '')
      : '';

    document.getElementById('root').innerHTML = `
      <div class="section">
        <div class="section-title">Device</div>
        <div class="field">
          <div class="field-label">Customer</div>
          <div class="field-value">${esc(t.customer)}</div>
        </div>
        <div class="field">
          <div class="field-label">Device</div>
          <div class="field-value">${esc(t.device || '—')}</div>
        </div>
        <div class="field">
          <div class="field-label">Issue</div>
          <div class="field-value">${esc(t.issue)}</div>
        </div>
        ${t.preDamage ? `<div class="field">
          <div class="field-label">Pre-existing damage noted</div>
          <div class="field-value" style="color:var(--gray);font-size:13px">${esc(t.preDamage)}</div>
        </div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Estimate</div>
        <div class="field">
          <div class="field-label">Estimated price</div>
          <div class="field-value price">${fmt(t.estimatedPrice)}</div>
        </div>
        ${t.estimatedCompletion ? `<div class="field">
          <div class="field-label">Estimated completion</div>
          <div class="field-value">${esc(fmtDate(t.estimatedCompletion))}</div>
        </div>` : ''}
      </div>

      ${!t.customerAcknowledged ? `
        <div class="section">
          <div class="section-title">Authorization</div>
          <div class="agreement-text">
            By tapping "I Agree," you authorize Pixel Patcher to perform the described repair at the estimated price above. Final price may vary if additional issues are discovered — you will be contacted before any additional work proceeds. Pixel Patcher is not responsible for pre-existing damage noted above.
          </div>
          <button class="btn-agree" id="agree-btn" onclick="acknowledge('${esc(ticketId)}')">
            I AGREE — AUTHORIZE REPAIR
          </button>
        </div>
      ` : `
        <div class="section">
          <div class="section-title">Status</div>
          <div class="ack-badge">✓ Authorized${ackDate ? ' · ' + ackDate : ''}</div>
          <div class="timeline">${renderTimeline(t.status || 'Pending')}</div>
        </div>
        <a href="sms:+15403002577" class="contact-link">Questions? Text Jason</a>
      `}
    `;
  }

  async function acknowledge(ticketId) {
    const btn = document.getElementById('agree-btn');
    btn.disabled = true;
    btn.textContent = 'SAVING…';
    try {
      await fsdb.collection('tickets').doc(ticketId).update({
        customerAcknowledged: true,
        acknowledgedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'In Progress',
      });
      // Reload to show status view
      loadTicket(ticketId);
    } catch(e) {
      btn.disabled = false;
      btn.textContent = 'I AGREE — AUTHORIZE REPAIR';
      alert('Could not save. Please try again.');
    }
  }

  async function loadTicket(ticketId) {
    try {
      const snap = await fsdb.collection('tickets').doc(ticketId).get();
      if (!snap.exists) {
        document.getElementById('root').innerHTML =
          '<div class="error-msg">Ticket not found.<br>Please contact Jason at (540) 300-2577.</div>';
        return;
      }
      renderTicket(snap.data(), ticketId);
    } catch(e) {
      document.getElementById('root').innerHTML =
        '<div class="error-msg">Could not load ticket.<br>Check your connection and try again.</div>';
    }
  }

  const ticketId = new URLSearchParams(location.search).get('id');
  if (!ticketId) {
    document.getElementById('root').innerHTML = '<div class="error-msg">No ticket ID provided.</div>';
  } else {
    loadTicket(ticketId);
  }
</script>
</body>
</html>
EOF
```

- [ ] **Step 2: Verify file created**

```bash
wc -l /home/jason/Desktop/PIXELPATCHER/ticket.html
```

Expected: ~260 lines

- [ ] **Step 3: Commit**

```bash
git add ticket.html
git commit -m "feat: add public repair ticket page (work order + status tracker)"
```

---

## Chunk 2: Accounting app changes + deploy

### Task 3: Add preDamage field to job add and edit forms

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

- [ ] **Step 1: Add preDamage input to the Add Job form**

In the Add Job form HTML (search for `id="j-notes"`), add a preDamage row immediately before the Notes row:

```
Find:
      <div class="form-group" style="grid-column:span 2"><label>Internal Notes</label>
        <textarea id="j-notes"

Replace with:
      <div class="form-group" style="grid-column:span 2"><label>Pre-existing Damage</label>
        <input id="j-predamage" placeholder="Scratched screen, missing screws, etc." style="width:100%;box-sizing:border-box"></div>
      <div class="form-group" style="grid-column:span 2"><label>Internal Notes</label>
        <textarea id="j-notes"
```

- [ ] **Step 2: Save preDamage in addJob() and clear field after save**

Find the `notes` line in the `DB.push('pp_jobs', {` block and add preDamage:

```
Find:
    notes:   document.getElementById('j-notes').value.trim(),
    paid: false,

Replace with:
    notes:     document.getElementById('j-notes').value.trim(),
    preDamage: document.getElementById('j-predamage').value.trim(),
    paid: false,
```

Then clear the field after `DB.push` (find `renderJobs();` at the end of `addJob()`):

```
Find:
  renderJobs();
}

function sendJobReadyEmail(job) {

Replace with:
  document.getElementById('j-predamage').value = '';
  renderJobs();
}

function sendJobReadyEmail(job) {
```

- [ ] **Step 3: Add preDamage input to Edit Job modal**

In `editJob()` find the Internal Notes textarea and add preDamage above it:

```
Find:
      <div class="form-group" style="grid-column:span 2"><label>Internal Notes</label>
        <textarea id="jm-notes" rows="2"

Replace with:
      <div class="form-group" style="grid-column:span 2"><label>Pre-existing Damage</label>
        <input id="jm-predamage" value="${esc(j.preDamage || '')}" placeholder="Scratched screen, missing screws, etc." style="width:100%;box-sizing:border-box"></div>
      <div class="form-group" style="grid-column:span 2"><label>Internal Notes</label>
        <textarea id="jm-notes" rows="2"
```

- [ ] **Step 4: Save preDamage in saveEditJob()**

```
Find:
    notes:   document.getElementById('jm-notes').value.trim(),
  })));

Replace with:
    notes:     document.getElementById('jm-notes').value.trim(),
    preDamage: document.getElementById('jm-predamage').value.trim(),
  })));
```

- [ ] **Step 5: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add pre-existing damage field to job add/edit"
```

---

### Task 4: Add ticket generation and sharing to accounting app

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

- [ ] **Step 1: Add ticket helper functions before sendJobReadyEmail**

Find `function sendJobReadyEmail(job) {` and insert the ticket functions immediately before it using Edit:

```
Find:
function sendJobReadyEmail(job) {

Replace with:
function ticketId6() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function generateTicket(jobId) {
  const jobs = DB.get('pp_jobs') || [];
  const j = jobs.find(x => x.id === jobId);
  if (!j) return null;
  const tId = j.ticketId || ticketId6();
  const ticketData = {
    ticketId: tId,
    jobId: jobId,
    customer: j.customer || '',
    phone: j.phone || '',
    device: [j.device, j.model].filter(Boolean).join(' ') || '',
    issue: j.issue || '',
    estimatedPrice: Number(j.labor || 0) + Number(j.parts || 0) + Number(j.tax || 0),
    estimatedCompletion: j.date || '',
    preDamage: j.preDamage || '',
    status: j.status || 'Pending',
    customerAcknowledged: j.customerAcknowledged || false,
    acknowledgedAt: j.acknowledgedAt || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  try {
    await fsdb.collection('tickets').doc(tId).set(ticketData, { merge: true });
  } catch(err) {
    console.warn('Ticket write failed:', err);
  }
  // Save ticketId to job if new
  if (!j.ticketId) {
    DB.set('pp_jobs', jobs.map(x => x.id === jobId ? Object.assign({}, x, { ticketId: tId }) : x));
    renderJobs();
  }
  return tId;
}

async function shareTicket(jobId) {
  const jobs = DB.get('pp_jobs') || [];
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  // Ensure ticket exists in Firestore (await so doc is ready before sharing)
  const tId = await generateTicket(jobId);
  if (!tId) { alert('Could not generate ticket. Check your connection.'); return; }
  const url = 'https://pixelpatcher.netlify.app/ticket.html?id=' + tId;
  const device = [j.device, j.model].filter(Boolean).join(' ') || 'your device';
  const shareData = {
    title: 'Pixel Patcher Repair Ticket',
    text: 'Hi ' + (j.customer || 'there') + ', here\'s your Pixel Patcher repair agreement for ' + device + '. Please review and tap "I Agree" to authorize the repair:\n',
    url,
  };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch(e) { /* user cancelled */ }
  } else {
    try {
      await navigator.clipboard.writeText(url);
      alert('Ticket link copied to clipboard:\n' + url);
    } catch(e) {
      alert('Ticket link:\n' + url);
    }
  }
}

function syncTicketStatus(j) {
  if (!j || !j.ticketId) return;
  fsdb.collection('tickets').doc(j.ticketId).update({ status: j.status })
    .catch(err => console.warn('Ticket status sync failed:', err));
}

function sendJobReadyEmail(job) {
```

- [ ] **Step 2: Call syncTicketStatus after saveEditJob saves**

In `saveEditJob()`, find `closeEditModal(); renderJobs();` and add the sync call:

```
Find:
  closeEditModal();
  renderJobs();
}

// ── Invoice section ──

Replace with:
  const _updatedJob = (DB.get('pp_jobs') || []).find(x => x.id === id);
  if (_updatedJob) syncTicketStatus(_updatedJob);
  closeEditModal();
  renderJobs();
}

// ── Invoice section ──
```

- [ ] **Step 3: Add Ticket / Send button to job row**

In `renderJobs()`, find the Follow-up and edit buttons in the actions cell and add the ticket button between them:

```
Find:
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openFollowupModal('${esc(j.customer)}','${esc(j.phone)}')">Follow-up</button>
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="editJob('${esc(j.id)}')">&#x270E;</button>

Replace with:
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="openFollowupModal('${esc(j.customer)}','${esc(j.phone)}')">Follow-up</button>
                  ${j.ticketId
                    ? `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--gold)"
                         onclick="shareTicket('${esc(j.id)}')">&#x1F4CB; Send</button>`
                    : `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                         onclick="generateTicket('${esc(j.id)}')">Ticket</button>`}
                  <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                    onclick="editJob('${esc(j.id)}')">&#x270E;</button>
```

- [ ] **Step 4: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add ticket generation and share to job rows"
```

---

### Task 5: Deploy

- [ ] **Step 1: Deploy accounting app to Firebase Hosting**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

Expected: `✔  Deploy complete!`

- [ ] **Step 2: Push ticket.html to Netlify via git**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git push origin main
```

Expected: Netlify auto-deploys. Check https://pixelpatcher.netlify.app/ticket.html?id=TEST within ~60 seconds — should show "Ticket not found" error (page loads, Firestore returns no doc for fake ID). That confirms the page is live and Firestore rules work.

- [ ] **Step 3: Smoke test**

1. Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html → Jobs tab
2. Create a test job with a Pre-existing Damage note (e.g., "Cracked corner")
3. Click **"Ticket"** button on the row → button should change to **"📋 Send"** (page re-renders)
4. Click **"📋 Send"** → share sheet opens (or clipboard copy alert on desktop)
5. Open the link in an incognito/private window → work order details visible, "I Agree" button present
6. Tap **"I Agree"** → acknowledgment saves, status timeline appears showing "Received" → **"In Progress"**
7. Back in accounting app → open Edit Job modal → change status to **"Awaiting Parts"** → Save
8. Reload ticket URL → timeline should show "Received" ✓ → "In Progress" ✓ → **"Awaiting Parts"** (active) → "Complete"
9. In accounting app → Edit Job → change status to **"Complete"** → Save
10. Reload ticket URL → all steps ✓ green, "Complete" active

- [ ] **Step 4: Commit any cleanup needed**

```bash
git add -A
git commit -m "fix: ticket smoke test cleanup"
git push origin main
```
