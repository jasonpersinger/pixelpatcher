# Edit Functionality — Design

**Date:** 2026-03-04
**Feature:** Modal-based inline editing for all data tables (expenses, mileage, income, jobs)

---

## Goal

Allow all data entries to be edited (not just deleted). Customers already have edit functionality. This extends editing to jobs, expenses, mileage, and income via modal dialogs.

---

## UI Changes

Each table row gains a pencil button (✎) next to the existing ✕ delete button. Same button style, neutral color (not danger red). No other visual changes to tables.

---

## Modal Pattern

A single shared modal div (reusing the existing follow-up modal pattern). Dynamically populated per entity type when edit is triggered.

Modal structure: title, scrollable form body, Save + Cancel buttons.

---

## Per-Entity Edit Forms

| Entity | Store | Fields |
|--------|-------|--------|
| Expenses | pp_expenses | Date, Category, Description, Vendor, Amount, Payment Method, Notes, Link to Job |
| Mileage | pp_mileage | Date, From, To, Miles, Purpose, Round Trip |
| Income | pp_income | Date, Description, Source, Amount, Payment Method |
| Jobs | pp_jobs | Customer, Device, Issue, Date, Status, Labor, Parts, Tax, Notes |

---

## Save Behavior

`saveEdit(type, id)` reads modal fields, finds record in array by `id`, replaces it in-place, calls `DB.set(key, newArray)` — auto-syncs to Firestore via existing write-through cache. Closes modal, re-renders table.

No data migration needed. Existing records unchanged until edited.

---

## Out of Scope (v1)

- Editing paid status on a job (use existing Mark Paid flow)
- Bulk edit
- Edit history / audit log
