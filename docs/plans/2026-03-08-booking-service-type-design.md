# Booking Form — Service Type & Address

**Date:** 2026-03-08

## Goal

Let customers indicate whether they will drop off their device at the shop or want an on-site visit, and capture their address if on-site. Surface this info in the accounting app when the booking is imported as a job.

## Marketing Site Changes (`index.html`)

- Add a radio toggle to the booking form: "Drop off at shop" / "Come to me (on-site)"
- If "Come to me" is selected, slide in an address input field (required)
- Save `serviceType` ("dropoff" | "onsite") and `address` (string, empty for dropoff) to the `bookingRequests` Firestore document on submit

## Accounting App Changes (`Accounting/PIXELPATCHER-Accounting.html`)

- When importing a bookingRequest as a pending job, prepend service type and address to the job notes field
- Format: `[On-site] 123 Main St, Pittsburgh PA — <original description>` or `[Drop-off] — <original description>`

## Out of Scope

- No Calendly integration
- No scheduling / time slots
- No address validation
