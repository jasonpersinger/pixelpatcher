# Customer Records — Design

**Date:** 2026-03-03
**Feature:** Proper customer records with full contact info, autocomplete on job form, standalone add customer flow

---

## Goal

Replace the implicit customer-from-job-name pattern with a proper `pp_customers` store. Full contact fields, autocomplete on the job form for returning customers, standalone Add Customer button in the Customers tab.

---

## Data Structure

New `pp_customers` key in localStorage/Firestore (added to FS_KEYS).

```js
{
  id: "abc123",
  firstName: "Jane",
  lastName: "Smith",
  phone: "555-000-0000",
  email: "jane@example.com",
  street: "123 Main St",
  city: "Springfield",
  state: "IL",
  zip: "62701",
  notes: ""
}
```

Jobs gain an optional `customerId` field linking to the customer record. The existing `customer` string field (full name) stays on jobs for display and backwards compatibility.

---

## Migration

No migration needed — existing test customer will be deleted manually. Clean slate.

---

## UI Changes

### Customers Tab

- **Add Customer** button at top creates a standalone customer record (walk-ins, pre-entry)
- Customer list columns: Name, Phone, Email, City, Jobs, Last Visit
- Customer detail shows all fields with an **Edit** button to update them
- Edit opens an inline form pre-filled with current values
- Job history and follow-ups sections remain below (unchanged)

### Job Form — Autocomplete

- Customer Name field becomes a text input with a `<datalist>` populated from `pp_customers`
- Options formatted as "FirstName LastName" 
- On selection (exact match found): auto-fill phone, email, street, city, state, zip from customer record; store `customerId` on job
- On no match (new name typed): create a new customer record on job save using the job's contact fields; store `customerId` on job
- Job form gains the full customer field set: First Name, Last Name, Phone, Email, Street, City, State, Zip (email is new; address split into components)

### Follow-ups

`pp_followups` records currently store `customerName` as a single string. Update to store `customerId` as well (optional, for linking). Display name built from customer record when available, fallback to stored string.

---

## Backwards Compatibility

- Existing jobs with `customer` string but no `customerId` display as-is
- `renderCustomers()` and `renderCustomerDetail()` use customer records from `pp_customers` when available, fall back to deriving from jobs for any unlinked records

---

## Out of Scope (v1)

- Merging duplicate customer records
- Customer-level notes history / timeline
- Import customers from CSV
- Photo / avatar per customer
