# Square Payment Links — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-generate a Square payment link for each invoice total and show it on the printable invoice, as a Copy Link button, and in the customer email.

**Architecture:** A new Firebase Cloud Function `createSquarePaymentLink` (HTTPS callable, v1) holds the Square secret and calls Square's `quick_pay` Payment Links API. The accounting app loads the Firebase Functions SDK, calls the function when an invoice loads, caches the URL on the job record, and renders it in three places.

**Tech Stack:** Firebase Functions v1 (Node 22), Square Payment Links API (`quick_pay`), Firebase JS SDK 10 compat, vanilla JS/HTML.

---

## Prerequisites (Jason must do these manually before implementation)

1. Go to https://developer.squareup.com/apps → select your app (or create one)
2. Under **Production** credentials, copy your **Access Token**
3. Go to https://squareup.com/dashboard/locations → copy your **Location ID**
4. Run in terminal from `Accounting/`:
   ```bash
   npx firebase-tools@latest functions:config:set \
     square.access_token="YOUR_PRODUCTION_ACCESS_TOKEN" \
     square.location_id="YOUR_LOCATION_ID"
   ```
5. Verify: `npx firebase-tools@latest functions:config:get`
   Expected output includes `{ "square": { "access_token": "...", "location_id": "..." } }`

---

### Task 1: Add `createSquarePaymentLink` Cloud Function

**Files:**
- Modify: `Accounting/functions/index.js`

**Step 1: Add the function at the bottom of `Accounting/functions/index.js`**

```js
// ── Square Payment Link ────────────────────────────────────────────────────
exports.createSquarePaymentLink = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { amount, invoiceNum, customerName } = data;
  if (!amount || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid amount.');
  }

  const token      = functions.config().square.access_token;
  const locationId = functions.config().square.location_id;

  const resp = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${token}`,
      'Content-Type':   'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify({
      idempotency_key: `${invoiceNum}-${Date.now()}`,
      quick_pay: {
        name:         `${invoiceNum} — ${customerName}`,
        price_money:  { amount: Math.round(amount * 100), currency: 'USD' },
        location_id:  locationId,
      },
    }),
  });

  const result = await resp.json();
  if (!resp.ok) {
    console.error('Square API error:', JSON.stringify(result));
    throw new functions.https.HttpsError('internal', 'Square API error — check function logs.');
  }

  return { url: result.payment_link.url };
});
```

Note: Node 22 has native `fetch` — no extra dependencies needed.

**Step 2: Deploy the function**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only functions
```

Expected output: `✔ functions[createSquarePaymentLink(us-central1)]: Successful create operation.`

**Step 3: Verify in Firebase console**

Go to https://console.firebase.google.com → your project → Functions. Confirm `createSquarePaymentLink` appears.

**Step 4: Commit**

```bash
git add Accounting/functions/index.js
git commit -m "feat: add createSquarePaymentLink Cloud Function"
```

---

### Task 2: Load Firebase Functions SDK in the accounting app

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html:29` (after the storage script tag)

**Step 1: Add the Functions compat SDK script tag**

Find this line (~line 29):
```html
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-storage-compat.js"></script>
```

Add immediately after:
```html
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-functions-compat.js"></script>
```

**Step 2: Initialize `fsfunctions` after the existing Firebase init (~line 363)**

Find:
```js
const fsstorage = firebase.storage();
```

Add immediately after:
```js
const fsfunctions = firebase.functions();
```

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: load Firebase Functions SDK in accounting app"
```

---

### Task 3: Generate and cache the payment link when an invoice loads

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html` — add `generateSquareLink` function near `renderInvoice` (~line 2530)

**Step 1: Add the `generateSquareLink` async function**

Find the line:
```js
function openInvoice(jobId) {
```

Insert immediately before it:

```js
// ── Square payment link generation ────────────────────────────────────────
async function generateSquareLink(job, total, invNum) {
  // Use cached link if total hasn't changed
  if (job.squarePaymentLink && job.squarePaymentLinkTotal === total) {
    applySquareLinkToInvoice(job.squarePaymentLink);
    return;
  }

  const linkEl = document.getElementById('sq-pay-link');
  const copyBtn = document.getElementById('sq-copy-btn');
  if (linkEl) linkEl.textContent = 'Generating link…';

  try {
    const fn = fsfunctions.httpsCallable('createSquarePaymentLink');
    const result = await fn({ amount: total, invoiceNum: invNum, customerName: job.customer });
    const url = result.data.url;

    // Cache on job record
    const jobs = DB.get('pp_jobs') || [];
    const idx  = jobs.findIndex(j => j.id === job.id);
    if (idx !== -1) {
      jobs[idx].squarePaymentLink      = url;
      jobs[idx].squarePaymentLinkTotal = total;
      DB.set('pp_jobs', jobs);
    }

    applySquareLinkToInvoice(url);
  } catch (err) {
    console.warn('Square link generation failed:', err);
    if (linkEl) linkEl.textContent = 'Payment link unavailable';
  }
}

function applySquareLinkToInvoice(url) {
  const linkEl  = document.getElementById('sq-pay-link');
  const copyBtn = document.getElementById('sq-copy-btn');
  if (linkEl)  linkEl.textContent = url;
  if (copyBtn) { copyBtn.style.display = ''; copyBtn.onclick = () => {
    navigator.clipboard.writeText(url);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = 'Copy Link', 2000);
  }; }
}
```

**Step 2: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add generateSquareLink helper function"
```

---

### Task 4: Add payment link row to the printable invoice and Copy Link button to action bar

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html:2580-2688` (the `renderInvoice` innerHTML block and action bar)

**Step 1: Add Copy Link button to the action bar**

Find in `renderInvoice` (~line 2583):
```html
        <button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
        <button class="btn btn-ghost" onclick="sendInvoiceEmail()">Email to Customer</button>
```

Replace with:
```html
        <button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
        <button id="sq-copy-btn" class="btn btn-ghost" style="display:none">Copy Link</button>
        <button class="btn btn-ghost" onclick="sendInvoiceEmail()">Email to Customer</button>
```

**Step 2: Add payment link row below the TOTAL DUE block on the printable invoice**

Find (~line 2675):
```html
      <div style="border-top:1px solid #eee;padding-top:20px;font-size:12px;color:#888;line-height:1.8">
        Payment due upon completion.<br>
        Accepted: Cash &middot; Venmo &middot; CashApp &middot; Square<br>
```

Replace with:
```html
      <div style="border-top:1px solid #eee;padding-top:20px;font-size:12px;color:#888;line-height:1.8">
        Payment due upon completion.<br>
        <strong style="color:#111">Pay online:</strong>
        <span id="sq-pay-link" style="color:#1a6fa8">Generating link…</span><br>
        Accepted: Cash &middot; Venmo &middot; CashApp &middot; Square<br>
```

**Step 3: Fire `generateSquareLink` at end of `renderInvoice`**

Find near the end of `renderInvoice` just before the closing `}` of the function (~line 2689):
```js
}
```

The line immediately before that closing brace is the closing of the template literal assignment. After the `document.getElementById('invoice').innerHTML = \`...\`;` line, add:

```js
  // Fire async link generation (updates DOM in place)
  if (total > 0) generateSquareLink(job, total, invNum);
```

**Step 4: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: render Square payment link on invoice and add Copy Link button"
```

---

### Task 5: Include payment link in the customer email

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html:2721-2738` (`sendInvoiceEmail` email body)

**Step 1: Read the payment link from the job record and add to email**

Find in `sendInvoiceEmail` (~line 2734):
```js
        + '\nTOTAL DUE: $' + total + '\n\n'
        + 'Payment accepted: Cash \u00b7 Venmo \u00b7 CashApp \u00b7 Square\n'
```

Replace with:
```js
        + '\nTOTAL DUE: $' + total + '\n\n'
        + (job.squarePaymentLink ? 'Pay online: ' + job.squarePaymentLink + '\n\n' : '')
        + 'Payment accepted: Cash \u00b7 Venmo \u00b7 CashApp \u00b7 Square\n'
```

**Step 2: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: include Square payment link in invoice email"
```

---

### Task 6: Deploy and end-to-end test

**Step 1: Deploy accounting app**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

**Step 2: End-to-end test checklist**

- [ ] Open a job with labor > $0, navigate to Invoice
- [ ] "Generating link…" appears briefly, then a real Square URL appears in the invoice
- [ ] "Copy Link" button appears — clicking it copies the URL and shows "Copied!" for 2s
- [ ] Opening the same invoice again reuses the cached URL (no new Square API call — check Network tab)
- [ ] Click "Email to Customer" — check the email contains the Square payment link
- [ ] Print the invoice — the "Pay online:" line with the URL appears in the PDF

**Step 3: Final commit + push**

```bash
git add -A
git commit -m "feat: Square payment links on invoices (link, copy, email)"
git push origin main
```
