# Dashboard Revamp + Tax Tab — Design

**Date:** 2026-03-03
**Feature:** Reorganize dashboard KPIs into logical groups + add quarterly tax estimate tab

---

## Goal

Make the dashboard visually organized by grouping KPI cards into labeled sections. Add a dedicated Tax tab with quarterly estimates and IRS due dates, with the current quarter highlighted.

---

## Dashboard Reorganization

### Current State
9 KPI cards in an uneven blob: 4+4+1. "Sales Tax Collected" is orphaned alone in the bottom row. No visual hierarchy or grouping.

### New Structure
Same cards, same size — organized into three labeled groups with section headers:

**Group 1 — P&L**
- Total Income | Total Expenses | Net Profit

**Group 2 — Operations**
- Jobs Completed | Avg Job Value

**Group 3 — Set Aside**
- Tax Reserve (25%) | Sales Tax Collected | Mileage Deduction

Each group has a small uppercase label above it (like "P&L — YEAR TO DATE"). Groups separated by spacing, not dividers. Monthly chart stays below unchanged.

---

## Tax Tab

### Nav
New "Tax" button in sidebar nav between Mileage and Settings.
New `<section id="tax" class="section"></section>` in HTML.

### Annual Summary Card
At top: full-width card showing:
- Total net profit YTD
- Total estimated tax owed (net profit × taxReserve rate)
- Tax rate shown (e.g. "Based on 25% reserve rate — adjust in Settings")

### Quarter Cards
Four cards below, one per quarter:

| Quarter | Months | IRS Due Date |
|---------|--------|-------------|
| Q1 | Jan – Mar | April 15 |
| Q2 | Apr – Jun | June 15 |
| Q3 | Jul – Sep | September 15 |
| Q4 | Oct – Dec | January 15 (next year) |

**Current quarter card:** Full width or larger, gold (`--accent`) border, estimated amount in large text, "DUE [date]" badge.

**Other quarter cards:** Smaller, muted border, compact display — date range, net profit, estimated tax, due date.

### Per-Quarter Calculation
```
quarterNetProfit = quarterIncome - quarterExpenses
quarterTaxEstimate = max(0, quarterNetProfit × settings.taxReserve)
```

Income and expenses are filtered by date range for each quarter. Uses existing `pp_income` and `pp_expenses` data — no new data stores needed.

### Footer Note
Small muted text: "Estimates based on your tax reserve rate. Consult a tax professional for exact amounts."

---

## Data
No new data structures. Uses existing `pp_income`, `pp_expenses`, and `pp_settings` (taxReserve field).

---

## Out of Scope (v1)
- Tracking actual payments made to IRS
- State tax estimates
- Prior year comparisons
- Exporting tax summary to PDF
