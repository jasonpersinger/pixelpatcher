# Customer History — Design Doc

**Date:** 2026-03-03
**Status:** Approved

---

## Goal

Add a dedicated Customers tab that groups all jobs by customer name, showing a list view with summary stats and a drill-in detail view with full job history, contact info, and lifetime value metrics.

---

## Architecture

No new data store. Everything derives from `pp_jobs`. Customers are identified by `job.customer` (name string). A module-level `_customerView` variable (null = list, string = customer name) controls which view renders inside the single `#customers` section. Navigation is handled by re-rendering the same section.

---

## Job Form Change

Add one optional field to the existing Add Job form:

- **Address** (text input, placeholder "Street, City, State", not required)
- Stored as `address` on the job record alongside `customer` and `phone`
- Displayed in customer detail from the most recent job for that customer

---

## Components

### 1. Sidebar Nav Entry

Add "Customers" between Income and Jobs in the sidebar nav.

### 2. View 1 — Customer List

**Stats bar:** Total Customers | Total Revenue (sum of labor+parts on paid jobs, all customers)

**Table (sorted by most recent job date, descending):**

| Customer | Phone | Jobs | Total Spent | Last Visit | (view button) |

- Total Spent = sum of labor+parts on paid=true jobs for that customer
- Phone = from most recent job
- View button calls showCustomer(name) to drill into detail

### 3. View 2 — Customer Detail

**Header:** Back button + customer name as page title

**Contact block:** Phone and Address from most recent job (show "—" if not on record)

**Stat cards (5):**
- Total Spent (paid jobs)
- Outstanding (labor+parts on unpaid, non-Closed jobs)
- Total Jobs (all jobs)
- First Visit (earliest job.date)
- Last Visit (most recent job.date)

**Jobs table:**
| Date | Issue | Service | Labor | Parts | Total | Status | Paid |

- Total = labor + parts per row
- Status shown as colored badge (existing badge classes)
- Paid shown as green "Paid" or red "Unpaid" badge

### 4. Navigation State

```js
let _customerView = null; // null = list, string = customer name

function showCustomer(name) {
  _customerView = name;
  renderCustomers();
}
```

`renderCustomers()` checks `_customerView` and renders list or detail accordingly.

---

## Data Derivation

```js
// Group jobs by customer name
const byCustomer = {};
jobs.forEach(j => {
  if (!byCustomer[j.customer]) byCustomer[j.customer] = [];
  byCustomer[j.customer].push(j);
});

// Per-customer stats
const totalSpent   = jobs.filter(j => j.paid).reduce((s, j) => s + j.labor + j.parts, 0);
const outstanding  = jobs.filter(j => !j.paid && j.status !== 'Closed')
                         .reduce((s, j) => s + j.labor + j.parts, 0);
const firstVisit   = jobs.map(j => j.date).sort()[0];
const lastVisit    = jobs.map(j => j.date).sort().reverse()[0];
const phone        = jobs.slice().sort((a,b) => b.date.localeCompare(a.date))[0].phone;
const address      = jobs.slice().sort((a,b) => b.date.localeCompare(a.date))[0].address || '';
```

---

## What Is Not Included

- Editing customer contact info directly (update by logging a new job)
- Customer notes or tags
- Email field (can be added later)
- Merging duplicate customer names
