# Sales Tax — Design Doc

**Date:** 2026-03-03
**Status:** Approved

## Problem

Pixel Patcher operates in Virginia and is required to collect and remit sales tax on parts sold during repair jobs. The app currently tracks no sales tax, so there is no way to know how much has been collected or needs to be set aside for remittance.

## Virginia Rules

- Sales tax applies to **parts only** — labor for repair services is exempt
- Rate varies by locality: 5.3% statewide base, 6–7% in certain metro areas
- Returns due monthly or quarterly on the 20th of the following month

## Approach

Store a `tax` field on each job record at save time (snapshot of `taxRate × parts`). Tax is never counted as revenue — it is a liability held for the state. The Settings panel holds the user-configurable rate.

This snapshot approach ensures historical invoices always reflect the tax rate that was actually charged, even if the rate changes in the future.

## Data Model

**Settings** (existing `pp_settings` object):
```
taxRate: 0.053   // new field, default 5.3% Virginia base rate
```

**Job record** (existing `pp_jobs` entries):
```
tax: Number   // new field, computed as taxRate × parts at save time
              // zero for jobs saved before this feature (no migration needed)
```

## Component Changes

### Settings
- New input: "Sales Tax Rate (%)" — stored as decimal (e.g. `5.3` input → `0.053` stored)
- Placed alongside existing IRS rate and income tax reserve fields

### addJob()
- Reads `settings.taxRate` at save time
- Stores `tax: settings.taxRate * parts` on the job record
- No user input — fully automatic

### Invoice
New line item between Parts and Total:
```
Labor:         $X.XX
Parts:         $X.XX
Sales Tax X.X%: $X.XX
─────────────────────
Total:         $X.XX
```
Invoice total = `labor + parts + tax`

### Jobs section
- Total column: `labor + parts + tax`

### Dashboard
- New KPI card: **Sales Tax Collected** — sum of `job.tax` for paid jobs YTD
- Style: amber / "kpi-warning" with label "Set Aside"
- Revenue KPI unchanged: `labor + parts` only (tax is not income)

### Customer views
- Total Spent and Outstanding include tax (reflects actual amount charged/owed)

### Income entries
- No change — income recorded as `labor + parts` when job is marked paid
- Sales tax is never added to income

## Backward Compatibility

Existing job records have no `tax` field. All reads treat a missing `tax` as `0`. No data migration required. Invoices for old jobs display no tax line (correct — tax was not charged).
