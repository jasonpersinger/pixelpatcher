# Pixel Patcher Master Accounting App — Design Doc
**Date:** 2026-03-02
**Status:** Approved

## Context

Three spreadsheet iterations existed (`.xls`, `.xlsx`, `.ods`) with overlapping structure and no single authoritative version. The business has zero jobs completed — currently in setup/launch phase. The goal is a single daily-driver tool that replaces all three.

## Decision: Self-Contained HTML App

- Single file: `PIXELPATCHER-Accounting.html`
- Data stored in browser `localStorage`
- CSV export + import as the backup/accountant handoff mechanism
- No server, no account, no subscription, works offline

## Layout: Sidebar Navigation

```
┌─────────────────────────────────────────────────┐
│  ◼ PIXEL PATCHER          [Export CSV] [Import] │
├──────────┬──────────────────────────────────────┤
│ Dashboard│                                      │
│ Jobs     │         Main Content Area            │
│ Invoice  │                                      │
│ Expenses │                                      │
│ Mileage  │                                      │
│ Settings │                                      │
└──────────┴──────────────────────────────────────┘
```

Dark theme. Pixel Patcher brand colors. Positive numbers green, negative red.

## Sections

### Dashboard
- 8 KPI cards: Total Income, Total Expenses, Net Profit, Jobs Completed, Avg Job Value, Miles Driven, Mileage Deduction, Tax Reserve (25%)
- Monthly bar chart: income vs expenses, all 12 months, current month highlighted
- All values calculated live from localStorage data

### Jobs
- Table: #, Date, Customer, Phone, Issue, Service, Status badge, Total, Paid?, [Generate Invoice]
- Status options: Pending | In Progress | Complete | Awaiting Parts | Closed
- "New Job" button opens inline form
- Completing a job and marking paid auto-creates an Income entry

### Invoice
- Triggered from a job row via "Generate Invoice"
- Print-ready layout with Pixel Patcher header (pre-filled from Settings)
- Line items: Labor + Parts
- Payment methods footer: Cash, Venmo, CashApp, Square
- 30-day labor warranty note
- Browser print dialog

### Expenses
- Quick-entry form: Date, Category (dropdown), Description, Vendor, Amount, Payment Method (dropdown), Notes
- Categories: Tools & Equipment | Marketing | Licenses & Permits | Software | Insurance | Vehicle | Parts (resale) | Misc
- Table of all entries, sortable by date

### Mileage
- Quick-entry form: Date, From, To, Purpose, Miles
- Deduction auto-calculated from IRS rate in Settings
- Table of all entries
- YTD totals shown at top

### Settings
- Business Name, Phone, Website, Address
- IRS Mileage Rate (default: $0.70)
- Tax Reserve % (default: 25%)
- These values pre-populate invoices and dashboard calculations

## Data Model (localStorage keys)

```
pp_jobs       → array of job objects
pp_income     → array of income entries
pp_expenses   → array of expense entries
pp_mileage    → array of mileage entries
pp_settings   → object with business info + rates
```

## Seed Data (from existing spreadsheets)

- Expense: 2026-02-26, Licenses & Permits, City of Roanoke business license, $50
- Expense: 2026-02-26, Insurance, Next Insurance GL, $31.25/mo
- Income: 2026-02-26, Owner Contribution, $200

## Out of Scope (for now)

- Parts Tracker (log parts cost in Expenses)
- Client Roster (names live in Job Log)
- Quarterly summaries (not enough data yet)
- Multi-device sync

## Output File

`/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html`
