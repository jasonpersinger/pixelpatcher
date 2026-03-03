# Job Ready Email — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a job is marked as paid/complete, automatically email the customer that their device is ready for pickup.

**Architecture:** `markPaid()` already fires when a job is marked complete. It's updated to look up the customer's email from `pp_customers` using `job.customerId`. If an email is found, a document is written to the Firestore `mail/` collection — the existing Trigger Email extension delivers it. If no email is on file, a brief on-screen notice tells Jason so he can follow up manually.

**Tech Stack:** Vanilla JS, Firestore `mail/` collection, Firebase Trigger Email extension. Output file: `/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html`.

---

## Task 1: Add `sendJobReadyEmail()` Helper Function

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Find `markPaid()`**

Find (line 1803):
```js
function markPaid(id) {
  const jobs = DB.get('pp_jobs') || [];
  const job  = jobs.find(j => j.id === id);
  if (!job) return;
  job.paid = true; job.status = 'Complete';
  DB.set('pp_jobs', jobs);
  DB.push('pp_income', {
    id: uid(), date: today(), type: 'Service', category: 'Repair',
    description: 'Job: ' + job.issue + ' \u2014 ' + job.customer,
    amount: Number(job.labor) + Number(job.parts),
    paymentMethod: 'Cash', notes: 'Job ID ' + id,
  });
  renderJobs();
}
```

**Step 2: Insert `sendJobReadyEmail()` immediately before `markPaid()`**

```js
function sendJobReadyEmail(job) {
  const user = fsauth.currentUser;
  if (!user) return;

  // Look up customer email
  const customers  = DB.get('pp_customers') || [];
  const customer   = job.customerId
    ? customers.find(c => c.id === job.customerId)
    : customers.find(c => (c.firstName + ' ' + c.lastName).trim() === job.customer.trim());
  const email = customer && customer.email ? customer.email.trim() : '';

  if (!email) {
    // No email on file — show a brief notice
    const notice = document.createElement('div');
    notice.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--card);border:1px solid var(--border);'
      + 'border-radius:var(--radius);padding:12px 18px;font-family:var(--font);font-size:12px;'
      + 'color:var(--muted);z-index:999;max-width:300px';
    notice.textContent = 'Job marked complete — no email on file for ' + job.customer + '.';
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 5000);
    return;
  }

  const settings = getSettings();
  const total    = (Number(job.labor) + Number(job.parts) + Number(job.tax || 0)).toFixed(2);

  fsdb.collection('mail').add({
    to: email,
    message: {
      subject: 'Your device is ready — ' + (settings.businessName || 'Pixel Patcher'),
      text: 'Hi ' + job.customer + ',\n\n'
        + 'Great news — your device is ready for pickup!\n\n'
        + 'Job: ' + job.issue + '\n'
        + (job.service ? 'Service: ' + job.service + '\n' : '')
        + 'Total: $' + total + '\n\n'
        + 'Payment accepted: Cash · Venmo · CashApp · Square\n\n'
        + 'Questions? Text or call ' + (settings.phone || '540-300-2577') + '.\n\n'
        + 'Thanks for choosing ' + (settings.businessName || 'Pixel Patcher') + '!',
    },
  }).catch(err => console.warn('Failed to send job ready email:', err));
}

```

**Step 3: Call `sendJobReadyEmail()` from `markPaid()`**

Find:
```js
  job.paid = true; job.status = 'Complete';
  DB.set('pp_jobs', jobs);
  DB.push('pp_income', {
```

Replace with:
```js
  job.paid = true; job.status = 'Complete';
  DB.set('pp_jobs', jobs);
  sendJobReadyEmail(job);
  DB.push('pp_income', {
```

**Step 4: Verify**

- Add a test job with a customer who has an email in `pp_customers`
- Click "Mark Paid" on that job
- Check Firestore → `mail/` collection — a new document should appear with `to: customer@email.com`
- Check that email arrives in the customer's inbox
- Test with a customer who has NO email — confirm the 5-second toast notice appears at bottom-right instead

**Step 5: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: send job ready email to customer on markPaid"
```

---

## Task 2: Deploy

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

**Verify at live URL:**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html

- [ ] Mark a job paid for a customer with email → email arrives
- [ ] Mark a job paid for a customer without email → toast notice appears, no errors
- [ ] Email subject, body, and total amount are correct

---

## Final Checklist

- [ ] `sendJobReadyEmail()` function added before `markPaid()`
- [ ] `markPaid()` calls `sendJobReadyEmail(job)` after setting paid/complete
- [ ] Customer email looked up from `pp_customers` by `customerId` or name
- [ ] Email includes job description, service, total, payment methods, phone
- [ ] No-email case shows 5-second toast notice (no crash, no silent failure)
- [ ] Deployed and verified on live site
