# Repair Ticket — Design Spec
**Date:** 2026-03-10

## Overview

A public repair ticket page that serves as both a digital work order (with customer acknowledgment) and a live status tracker. Generated from the accounting app, shared via native share sheet, accessible to customers without login.

## Problem

Currently, when a customer hands over a device, the hand-off is verbal. No written record of what was agreed, no price confirmation, no status visibility. For a mobile repair shop with no storefront, this creates legal exposure and a perception of informality.

## Solution

A unified `ticket.html` page that:
1. Presents the repair agreement to the customer
2. Captures their acknowledgment (tap "I Agree" + timestamp)
3. Shows live repair status as Jason updates it from the accounting app

## User Flow

1. Jason creates or opens a job in the accounting app
2. Taps **"Generate Ticket"** → short alphanumeric ticket ID is created and saved to Firestore
3. Taps **"Send to Customer"** → native share sheet opens with pre-composed message + link (`pixelpatcher.netlify.app/ticket/XXXXXX`)
4. Customer taps link on their phone → sees work order details + agreement text
5. Customer taps **"I Agree"** → acknowledgment timestamp recorded in Firestore, button replaced with confirmation
6. Jason updates job status from accounting app as work progresses
7. Customer can return to the same link at any time to check current status

## Ticket Page (`ticket.html`)

**Before acknowledgment:**
- Pixel Patcher logo + header
- Device (make/model)
- Issue description
- Estimated price
- Estimated completion date
- Pre-existing damage notes (if any)
- Agreement blurb: "By tapping I Agree, you authorize Pixel Patcher to perform the described repair at the estimated price. Final price may vary if additional issues are found — you will be contacted before proceeding."
- **"I Agree"** button (prominent, full-width)

**After acknowledgment:**
- Same details, read-only
- Live status indicator with current status highlighted
- "Questions? Contact Jason" link (tel: or sms:)

**Status values:**
- `pending` — Awaiting customer acknowledgment
- `acknowledged` — Agreement signed, repair not yet started
- `in_progress` — Repair underway
- `awaiting_parts` — Waiting on parts order
- `ready` — Ready for pickup / Jason en route
- `complete` — Repair finished and returned

## Accounting App Changes

**Job creation/edit modal additions:**
- Status dropdown (maps to ticket statuses above)
- "Generate Ticket" button → creates `ticketId` (6-char alphanumeric), saves to job document
- "Send to Customer" button → `navigator.share({ title, text, url })` with fallback copy-to-clipboard
- Display ticket link once generated (read-only field)

**Firestore job document additions:**
- `ticketId`: string (6-char random, e.g., "A4K9MZ")
- `ticketStatus`: string (one of the status values above)
- `customerAcknowledged`: boolean
- `acknowledgedAt`: timestamp | null

## Data Architecture

Tickets use a **separate `tickets` Firestore collection** at the root level (not under `users/{uid}`). This is required because jobs are stored as arrays inside single Firestore documents at `users/{uid}/data/pp_jobs` — they are not individually queryable documents. A separate `tickets` collection allows public unauthenticated reads without exposing any of Jason's private financial data.

When Jason generates a ticket from a job, the accounting app writes a snapshot of the relevant job fields to `tickets/{ticketId}`. When job status changes, the app syncs the new status to `tickets/{ticketId}`. The `ticket.html` page reads `tickets/{ticketId}` directly by document ID — no query needed.

**Ticket document fields:** `ticketId`, `jobId`, `customer`, `phone`, `device`, `issue`, `estimatedPrice`, `estimatedCompletion`, `preDamage`, `status`, `customerAcknowledged`, `acknowledgedAt`, `createdAt`

## Share Message

```
Hi [Customer Name], here's your Pixel Patcher repair agreement for your [Device].
Please review and tap "I Agree" to authorize the repair:
https://pixelpatcher.netlify.app/ticket/XXXXXX
```

## Firestore Security Rules

Ticket documents are publicly readable (no auth) when queried by `ticketId`. Write access (acknowledgment) is limited to setting `customerAcknowledged: true` and `acknowledgedAt` when not already acknowledged. All other writes require auth.

## Out of Scope

- Customer login or portal
- Photo upload at ticket creation (handled separately via existing receipt upload)
- Payment collection via ticket page (Square links handle this)
- Parts tracking
