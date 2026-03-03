# CRM Follow-up Reminders — Design

**Date:** 2026-03-03
**Feature:** Per-customer follow-up reminders with daily email via Firebase Cloud Functions + Trigger Email extension

---

## Goal

Allow follow-up reminders to be set from the customer detail page or a job row. A daily 8am email lists all follow-ups due that day with customer name, phone, and note. A Follow-ups section in the app shows all pending reminders sorted by due date.

---

## Data Structure

New `pp_followups` key added to localStorage/Firestore via existing DB sync infrastructure. Added to `FS_KEYS`.

```js
// Follow-up record
{
  id: "abc123",          // uid()
  customerName: "Jane Smith",
  phone: "555-000-0000",
  note: "Check in about laptop repair",
  dueDate: "2026-03-15", // YYYY-MM-DD
  done: false
}
```

---

## App UI

### Follow-ups Nav Tab
New "Follow-ups" nav button between Customers and Jobs. Shows all pending (done: false) follow-ups sorted by dueDate ascending. Overdue entries (dueDate < today) highlighted in red. Each row has: due date, customer name, phone, note, and a "Done" button that sets done: true and re-renders.

### Customer Detail Page
"+ Follow-up" button added below the job history. Expands inline form: date picker (default: today + 7 days), note textarea, Save button. Below the form, existing follow-ups for this customer are listed (pending and done, done ones muted/struck through).

### Job Row Actions
Small "Follow-up" button added to the Actions column alongside Invoice and delete. Opens a modal pre-filled with customerName and phone from the job. User enters date and note, saves.

---

## Email Delivery

**Firebase Extension:** "Trigger Email from Firestore" — watches `mail/` collection in Firestore and sends email when a document is created. Configured with Gmail SMTP via app password.

**Cloud Function:** `dailyFollowupEmail` — scheduled cron `0 13 * * *` (8am Eastern = 1pm UTC). Queries all users' followups for today's date where done === false. Writes to `mail/` collection to trigger send.

**Email format:**
```
Subject: Pixel Patcher — X follow-up(s) due today

Good morning! You have X follow-up(s) due today:

• Jane Smith — 555-000-0000
  Check in about laptop repair

• Mike Johnson — 555-111-2222
  Quote for screen replacement
```

**Recipient:** jason.persinger@gmail.com (hardcoded in Cloud Function — single user app)

---

## Firebase Setup

1. Install "Trigger Email from Firestore" extension via Firebase Console
2. Configure with Gmail SMTP + app password
3. Deploy Cloud Function from `Accounting/functions/` directory
4. Blaze plan already active — no billing changes needed

---

## Out of Scope (v1)

- Recurring follow-ups
- SMS notifications
- Follow-up templates
- Snooze / reschedule UI
- Multiple email recipients
