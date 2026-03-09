# Booking Service Type Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Drop off / Come to me" toggle to the booking form, capture address for on-site visits, and surface that info in the accounting app when the booking is imported as a job.

**Architecture:** Two-file change. `index.html` gains a radio toggle + conditional address field and saves `serviceType`/`address` to the Firestore bookingRequest doc. `Accounting/PIXELPATCHER-Accounting.html` reads those fields during import and prepends them to the job notes.

**Tech Stack:** Vanilla JS, Firestore JS SDK v9 compat, single-file HTML, no build step.

---

### Task 1: Update booking form in `index.html`

**Files:**
- Modify: `index.html:861-866` (after the "What's wrong?" textarea, before the date field)

**Step 1: Add the service type toggle and conditional address field**

After the `<div>` containing `bk-issue` (around line 860), insert:

```html
      <div>
        <label style="font-size:12px;color:#7a6a50;display:block;margin-bottom:8px">Service Type *</label>
        <div style="display:flex;gap:12px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:#EDE8DC;font-family:'DM Sans',sans-serif">
            <input type="radio" name="bk-service-type" id="bk-type-dropoff" value="dropoff" checked
              style="accent-color:#C9A000">
            Drop off at shop
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:#EDE8DC;font-family:'DM Sans',sans-serif">
            <input type="radio" name="bk-service-type" id="bk-type-onsite" value="onsite"
              style="accent-color:#C9A000">
            Come to me (on-site)
          </label>
        </div>
      </div>
      <div id="bk-address-wrap" style="display:none">
        <label style="font-size:12px;color:#7a6a50;display:block;margin-bottom:5px">Your Address *</label>
        <input id="bk-address" placeholder="123 Main St, Pittsburgh PA 15201"
          style="width:100%;background:#000;border:1px solid #2a1a3a;color:#EDE8DC;
                 border-radius:8px;padding:10px 14px;font-size:14px;font-family:'DM Sans',sans-serif;box-sizing:border-box">
      </div>
```

**Step 2: Wire show/hide for the address field**

In the `<script>` block (after the `_bkDb` line, before the submit listener), add:

```js
document.querySelectorAll('input[name="bk-service-type"]').forEach(function(r) {
  r.addEventListener('change', function() {
    document.getElementById('bk-address-wrap').style.display =
      this.value === 'onsite' ? '' : 'none';
  });
});
```

**Step 3: Update the submit handler to read and validate the new fields**

In the submit handler, after `const issue = ...` line, add:

```js
const serviceType = document.querySelector('input[name="bk-service-type"]:checked').value;
const address    = document.getElementById('bk-address').value.trim();
```

And add address validation after the existing required-field check:

```js
if (serviceType === 'onsite' && !address) {
  status.style.color = '#ef4444';
  status.textContent = 'Please enter your address for on-site service.';
  return;
}
```

**Step 4: Save the new fields to Firestore**

In the `_bkDb.collection('bookingRequests').doc(id).set({...})` call, add:

```js
serviceType,
address,
```

**Step 5: Also update the date label to be generic**

Change the label text from `Preferred Drop-off Date` to `Preferred Date`.

**Step 6: Manual test**

Open `index.html` via local server or the live URL. Verify:
- "Drop off at shop" selected by default, address field hidden
- Selecting "Come to me" shows address field
- Submitting without address while "Come to me" selected shows error
- Successful submit writes `serviceType` and `address` to Firestore (check Firebase console)

**Step 7: Commit**

```bash
git add index.html
git commit -m "feat: add service type toggle and address field to booking form"
```

---

### Task 2: Update job import in `Accounting/PIXELPATCHER-Accounting.html`

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html:2825` (the `notes:` line inside `importBookingRequests`)

**Step 1: Update the notes line to include service type and address**

Find this line (~line 2825):
```js
notes: 'Booked via website' + (r.email ? ' · ' + r.email : ''),
```

Replace with:
```js
notes: (r.serviceType === 'onsite'
  ? '[On-site] ' + (r.address || '') + ' — '
  : '[Drop-off] — ')
  + 'Booked via website' + (r.email ? ' · ' + r.email : ''),
```

**Step 2: Manual test**

- Submit a test booking on the marketing site with "Come to me" selected and an address
- Log into the accounting app at https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html
- Click "Import as Pending Jobs" on the dashboard banner
- Open the imported job and verify notes show `[On-site] 123 Main St — Booked via website`

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: include service type and address in imported job notes"
```

---

### Task 3: Deploy

**Step 1: Deploy marketing site**

```bash
git push origin main
```
Netlify auto-deploys. Verify at https://pixelpatcher.netlify.app/#booking.

**Step 2: Deploy accounting app**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

Expected output includes: `Hosting URL: https://pixelpatcher-accounting.web.app`

**Step 3: Smoke test on live URLs**

- Booking form at pixelpatcher.com/#booking — test both service types
- Accounting app import banner still appears and imports correctly
