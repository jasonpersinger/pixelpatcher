# Intake Form → Job Creation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When someone submits the contact form on pixelpatcher.com, a "Pending" job is automatically created in the accounting app and Jason receives an email notification.

**Architecture:** The website's Netlify contact form already collects name, phone, message. Netlify's outgoing webhook POSTs that data to a new Firebase Cloud Function HTTP endpoint. The Cloud Function validates the data, appends a new Pending job to the user's `pp_jobs` array in Firestore, and writes to the `mail/` collection to trigger an email notification. A shared secret in the webhook URL prevents unauthorized calls. Jason's UID is hardcoded (single-user app).

**Tech Stack:** Netlify Forms webhook, Firebase Cloud Functions v1 (HTTP), Firebase Admin SDK, Firebase Trigger Email extension. Output files: `Accounting/functions/index.js`, `Accounting/firebase.json`.

---

## Task 1: Find Your Firebase UID (Manual)

**Step 1: Open Firebase Auth console**

Go to: https://console.firebase.google.com/u/0/project/pixelpatcher-accounting/authentication/users

**Step 2: Copy your UID**

You'll see one user (your Google account). Copy the UID — it's a long string like `abc123XYZdef456`.

**Step 3: Note it**

```
OWNER_UID = <paste your UID here>
```

You'll paste this into the Cloud Function in Task 2.

---

## Task 2: Add `createJobFromIntake` Cloud Function

**File:** Modify `Accounting/functions/index.js`

**Step 1: Find the end of the existing Cloud Function file**

The file currently has one export: `dailyFollowupEmail`. Add a second export after it.

Find the end of `Accounting/functions/index.js` and append:

```js
// ── Intake form → job creation ─────────────────────────────────────────────
const OWNER_UID   = 'REPLACE_WITH_YOUR_UID';   // paste from Task 1
const INTAKE_SECRET = 'REPLACE_WITH_A_SECRET'; // make up any random string e.g. 'pp-intake-2026'

exports.createJobFromIntake = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST')   { res.status(405).send('Method Not Allowed'); return; }

  // Verify shared secret
  if (req.query.secret !== INTAKE_SECRET) {
    res.status(403).send('Forbidden');
    return;
  }

  // Netlify sends form data under req.body.data
  const data    = req.body.data || req.body || {};
  const name    = (data.name    || '').trim();
  const phone   = (data.phone   || '').trim();
  const message = (data.message || '').trim();

  if (!name || !phone) {
    res.status(400).json({ error: 'Missing name or phone' });
    return;
  }

  // Generate a simple unique ID
  const newId = db.collection('tmp').doc().id;
  const today = new Date().toISOString().slice(0, 10);

  // Read existing jobs
  const jobsRef = db.collection('users').doc(OWNER_UID).collection('data').doc('pp_jobs');
  const jobsDoc = await jobsRef.get();
  const jobs    = (jobsDoc.exists ? jobsDoc.data().value : null) || [];

  // Append new pending job
  jobs.push({
    id: newId, date: today,
    customer: name, customerId: null,
    phone, address: '', issue: message,
    service: '', labor: 0, parts: 0, tax: 0,
    status: 'Pending', paid: false,
  });

  await jobsRef.set({ value: jobs });

  // Send notification email
  await db.collection('mail').add({
    to: RECIPIENT,
    message: {
      subject: `Pixel Patcher — New website inquiry from ${name}`,
      text: `New repair request from your website:\n\nName: ${name}\nPhone: ${phone}\n\nMessage:\n${message}\n\nThis job has been added to your accounting app as "Pending".\n\nOpen app: https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html\n\n— Pixel Patcher`,
    },
  });

  res.json({ success: true });
});
```

**Step 2: Fill in your values**

- Replace `'REPLACE_WITH_YOUR_UID'` with your UID from Task 1
- Replace `'REPLACE_WITH_A_SECRET'` with any random string you'll remember (e.g. `'pp-intake-2026'`)

**Step 3: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/functions/index.js
git commit -m "feat: add createJobFromIntake Cloud Function"
```

---

## Task 3: Deploy Cloud Function

**Step 1: Deploy**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only functions
```

Expected: `✔ functions[createJobFromIntake(us-central1)]: Successful deploy`

**Step 2: Get the function URL**

After deploy, the URL will be shown in the output. It looks like:
```
https://us-central1-pixelpatcher-accounting.cloudfunctions.net/createJobFromIntake
```

Copy it and add your secret:
```
https://us-central1-pixelpatcher-accounting.cloudfunctions.net/createJobFromIntake?secret=pp-intake-2026
```

Note this full URL — you'll paste it into Netlify in the next task.

---

## Task 4: Configure Netlify Webhook (Manual)

**Step 1: Open Netlify dashboard**

Go to: https://app.netlify.com → your Pixel Patcher site → **Forms**

**Step 2: Find the contact form**

Click on the `contact` form (it collects submissions from index.html).

**Step 3: Add outgoing webhook**

Click **Settings** (or **Form notifications**) → **Add notification** → **Outgoing webhook**

- **Event to listen for:** `New form submission`
- **URL to notify:** paste your full function URL with `?secret=...`
- Save

**Step 4: Test**

Submit the contact form on https://www.pixelpatcher.com with test data:
- Name: `Test Customer`
- Phone: `555-000-0000`
- Message: `Testing intake form integration`

Then verify:
- [ ] Email notification arrives at jason.persinger@gmail.com
- [ ] Job appears in accounting app under Jobs with status "Pending"
- [ ] Job has customer name, phone, and issue from the form

---

## Task 5: Add "New Inquiries" Badge to Dashboard

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

This gives Jason a quick visual when new pending jobs from the website are waiting.

**Step 1: Find `renderDashboard()` in the file**

The function starts around line 1971. Find where it builds the section header — look for:
```js
  document.getElementById('dashboard').innerHTML =
```

**Step 2: Add pending inquiry count at the top of the dashboard**

Find the very start of the innerHTML assignment. Add this snippet at the top of the dashboard content (before the KPI groups):

```js
  const pendingInquiries = (DB.get('pp_jobs') || []).filter(j => j.status === 'Pending' && !j.service);
  const inquiryBanner = pendingInquiries.length > 0
    ? `<div style="background:rgba(201,160,0,0.12);border:1px solid var(--accent);border-radius:var(--radius);
                   padding:12px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
         <span style="font-family:var(--font);font-size:12px;color:var(--accent)">
           &#9733; ${pendingInquiries.length} new website inquir${pendingInquiries.length > 1 ? 'ies' : 'y'} waiting
         </span>
         <button class="btn btn-ghost" style="font-size:11px;padding:4px 12px"
           onclick="showSection('jobs')">View Jobs &rarr;</button>
       </div>`
    : '';
```

Then prepend `inquiryBanner` to the dashboard innerHTML (add it right after the opening of the innerHTML string, before the first KPI group div).

**Step 3: Verify**

Manually set a job's status to "Pending" and service to "" in DevTools localStorage, reload the dashboard. The gold banner should appear.

**Step 4: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add new website inquiry banner to dashboard"
```

---

## Task 6: Deploy Hosting

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

---

## Final Checklist

- [ ] `createJobFromIntake` function deployed and URL noted
- [ ] Netlify webhook configured pointing to function URL with secret
- [ ] Test form submission creates job and sends email
- [ ] Dashboard shows gold banner when pending inquiries exist
- [ ] Clicking banner navigates to Jobs tab
