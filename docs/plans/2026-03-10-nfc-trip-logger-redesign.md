# NFC Trip Logger Redesign — Design Doc

**Goal:** Rebuild `trip.html` with odometer-based mileage tracking, purpose quick-picks, and a monthly total on the saved screen.

**Date:** 2026-03-10

---

## Flow (Two-Tap NFC)

**Tap 1 — Start Trip screen:**
- Date (auto-filled to today)
- From (text, starting location)
- Odometer Start (number input)
- Purpose (quick-pick buttons: Client Visit / Supply Run / Bank/Post Office / Other)
  - If "Other" selected: text input appears for custom description
- "Start Trip" button → saves to localStorage `pp_active_trip`

**Tap 2 — End Trip screen:**
- Shows saved trip info: From, Purpose, Odometer Start
- To (text, destination)
- Odometer End (number input)
- Notes (optional text)
- "Review Entry" button → calculates miles = odomEnd − odomStart, validates result > 0

**Confirm screen:**
- Summary: Date, From, To, Purpose, Odometer Start, Odometer End, Miles (calculated), Est. Deduction
- "Save to Mileage Log" → writes to Firestore pp_mileage

**Saved screen:**
- "X miles logged."
- Fetches Firestore pp_mileage, sums miles where date starts with current YYYY-MM → "Y miles logged this month"
- Link to accounting app
- "Log Another Trip" button

---

## Data

**localStorage key:** `pp_active_trip`
```json
{ "date": "2026-03-10", "from": "Home", "purpose": "Client Visit", "odomStart": 45210 }
```

**Firestore entry (pp_mileage array):**
```json
{ "id": "...", "date": "2026-03-10", "from": "Home", "to": "Customer", "purpose": "Client Visit", "miles": 12.3, "odomStart": 45210, "odomEnd": 45222, "deduction": 8.61, "notes": "" }
```

Miles = odomEnd − odomStart (validated > 0, max 500 as sanity check)
Deduction = miles × IRS rate (fetched from pp_settings, default $0.70)

---

## Changes from Current `trip.html`

| Current | New |
|---------|-----|
| "From" + "Purpose" text inputs on start | "From" + Odometer Start + Purpose quick-picks |
| "Miles" number input on end | Odometer End number input (miles auto-calculated) |
| Manual miles shown on confirm | Calculated miles + both odometer readings on confirm |
| No monthly total | Monthly total fetched from Firestore on saved screen |

---

## Unchanged

- Firebase Auth (Google Sign-In popup, allowlist: jason.persinger@gmail.com)
- Firestore write pattern (read array → push → write back)
- All existing CSS variables and card/button styles
- States: loading, signin, start, end, confirm, saved
- Netlify deploy via git push
