# Square Payment Links — Design

**Date:** 2026-03-08

## Goal

When Jason opens an invoice in the accounting app, a Square payment link is automatically generated for the exact invoice total and displayed on the invoice, in the email, and as a copy button — so customers can pay online.

## Architecture

**Cloud Function (`Accounting/functions/index.js`)**
A new HTTPS callable function `createSquarePaymentLink` is added alongside the existing functions. It:
- Receives `{ amount, invoiceNum, customerName }` from the authenticated app
- Calls Square's Payment Links API (`POST https://connect.squareup.com/v2/online-checkout/payment-links`)
- Returns `{ url }` to the app

Square access token stored as a Firebase Functions config variable (`square.access_token`) — never in the browser.

**Caching on job record**
Generated URL is saved to `job.squarePaymentLink` via `DB.set('pp_jobs', ...)`. On subsequent invoice opens, the cached URL is used if the job total hasn't changed. If total changes, a new link is generated.

**Invoice UI (3 touchpoints)**
1. Printable invoice area — "Pay Online:" line below the total showing the Square URL
2. Action bar — "Copy Link" button (copies URL to clipboard)
3. Email to Customer — payment link included in the email body

## Out of Scope

- No Square webhook for payment confirmation
- No automatic job status change when paid via Square
- No Square sandbox/test mode toggle (use production from the start)
