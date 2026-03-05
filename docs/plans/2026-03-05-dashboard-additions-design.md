# Dashboard Additions — Design

**Date:** 2026-03-05
**Feature:** "Right Now" KPI group with Outstanding Balance, Active Pipeline, and Month-over-Month revenue

---

## Goal

Add three live operational KPIs at the top of the dashboard so Jason sees the current state of the business at a glance, above the existing YTD accounting numbers.

---

## New "Right Now" Group

Placed above the P&L section. Three cards in a 3-column grid.

### Card 1 — Outstanding Balance
- Value: sum of `labor + parts + tax` for all jobs where `!j.paid && j.status !== 'Closed'`
- Color: gold (`kpi-accent`)
- Sub-label: "X unpaid job(s)"
- If zero: sub-label "All clear" in muted

### Card 2 — Active Pipeline
- Value: count of jobs with status `Pending`, `In Progress`, or `Awaiting Parts`
- Color: accent
- Sub-label: breakdown string e.g. `2 pending · 1 in progress · 1 awaiting parts` (omits zero counts)
- If zero: "No active jobs"

### Card 3 — This Month vs Last
- Value: this month's revenue (from `pp_income`, excluding Owner Contribution)
- Color: positive if ≥ last month, negative if less
- Sub-label: `↑ 23% vs Feb` or `↓ 8% vs Feb` or `New month` if last month was zero
- Uses `new Date()` to determine current and previous month dynamically (no hardcoded year)

---

## Also Fix: Hardcoded Year in Monthly Chart

The chart currently filters income/expenses with `d.getFullYear() === 2026`. Replace with `new Date().getFullYear()` so it works in future years.

---

## Data

No new data stores. All three cards compute from existing `pp_jobs` and `pp_income`.

---

## Out of Scope

- Clicking Outstanding Balance to navigate to Jobs (nice-to-have, not v1)
- Sparkline trend charts inside KPI cards
- Week-over-week comparisons
