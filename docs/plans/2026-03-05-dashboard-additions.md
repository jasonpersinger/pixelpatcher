# Dashboard Additions — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Right Now" KPI group (Outstanding Balance, Active Pipeline, This Month vs Last) to the top of the dashboard, and fix the hardcoded 2026 year throughout.

**Architecture:** All changes are inside `renderDashboard()` in the single HTML file. Task 1 adds computed values before the `kpi` helper. Task 2 inserts the new HTML group and fixes hardcoded year strings. No new data stores — everything computes from existing `pp_jobs` and `pp_income`.

**Tech Stack:** Vanilla JS, single HTML file at `Accounting/PIXELPATCHER-Accounting.html`. Use **Edit tool only** — the pre-commit hook blocks the Write tool on .html files.

---

## Task 1: Add Right Now Computed Values

**File:** `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Insert computed values block before the `kpi` helper function**

Find (line ~2302):
```js
  const kpi = (label, value, cls, sub) => `
    <div class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value ${cls}">${value}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;
```

Replace with:
```js
  // ── Right Now computations ────────────────────────────────────────────────
  const curYear     = new Date().getFullYear();
  const prevMonIdx  = curMon === 0 ? 11 : curMon - 1;
  const prevMonYear = curMon === 0 ? curYear - 1 : curYear;

  const outstanding    = jobs.filter(j => !j.paid && j.status !== 'Closed')
                             .reduce((s, j) => s + Number(j.labor) + Number(j.parts) + Number(j.tax || 0), 0);
  const unpaidCount    = jobs.filter(j => !j.paid && j.status !== 'Closed').length;
  const outstandingSub = unpaidCount > 0
    ? unpaidCount + ' unpaid job' + (unpaidCount > 1 ? 's' : '')
    : 'All clear';

  const pipeJobs    = jobs.filter(j => ['Pending','In Progress','Awaiting Parts'].includes(j.status));
  const pipeCount   = pipeJobs.length;
  const pipePending = pipeJobs.filter(j => j.status === 'Pending').length;
  const pipeInProg  = pipeJobs.filter(j => j.status === 'In Progress').length;
  const pipeAwaiting= pipeJobs.filter(j => j.status === 'Awaiting Parts').length;
  const pipeSub     = pipeCount > 0
    ? [pipePending  > 0 ? pipePending  + ' pending'        : '',
       pipeInProg   > 0 ? pipeInProg   + ' in progress'    : '',
       pipeAwaiting > 0 ? pipeAwaiting + ' awaiting parts' : '']
       .filter(Boolean).join(' \xB7 ')
    : 'No active jobs';

  const curMonRev  = income.filter(i => i.type !== 'Owner Contribution').filter(i => {
    const d = new Date(i.date); return d.getFullYear() === curYear && d.getMonth() === curMon;
  }).reduce((s, i) => s + Number(i.amount), 0);
  const prevMonRev = income.filter(i => i.type !== 'Owner Contribution').filter(i => {
    const d = new Date(i.date); return d.getFullYear() === prevMonYear && d.getMonth() === prevMonIdx;
  }).reduce((s, i) => s + Number(i.amount), 0);
  const momPct     = prevMonRev > 0
    ? Math.round(((curMonRev - prevMonRev) / prevMonRev) * 100)
    : null;
  const momSub     = momPct === null ? 'No data last month'
    : (momPct >= 0 ? '\u2191' : '\u2193') + ' ' + Math.abs(momPct) + '% vs ' + months[prevMonIdx];
  const momCls     = momPct === null ? '' : momPct >= 0 ? 'kpi-positive' : 'kpi-negative';

  const kpi = (label, value, cls, sub) => `
    <div class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value ${cls}">${value}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;
```

**Step 2: Verify**

- [ ] Open app. Dashboard loads without JS errors in DevTools console.
- [ ] In console: `renderDashboard()` runs without errors.

**Step 3: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Right Now computed values to dashboard"
```

---

## Task 2: Insert "Right Now" Group + Fix Hardcoded Year

**File:** `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Fix hardcoded 2026 in chart data filters**

Find:
```js
    if (d.getFullYear() === 2026) mInc[d.getMonth()] += Number(i.amount);
```

Replace with:
```js
    if (d.getFullYear() === new Date().getFullYear()) mInc[d.getMonth()] += Number(i.amount);
```

Find:
```js
    if (d.getFullYear() === 2026) mExp[d.getMonth()] += Number(e.amount);
```

Replace with:
```js
    if (d.getFullYear() === new Date().getFullYear()) mExp[d.getMonth()] += Number(e.amount);
```

**Step 2: Insert Right Now group and fix dashboard title**

Find:
```js
  document.getElementById('dashboard').innerHTML = `
    ${inquiryBanner}
    <div class="page-title">Dashboard &mdash; 2026</div>
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;
                  letter-spacing:1px;margin-bottom:12px">P&amp;L &mdash; Year to Date</div>
```

Replace with:
```js
  document.getElementById('dashboard').innerHTML = `
    ${inquiryBanner}
    <div class="page-title">Dashboard &mdash; ${curYear}</div>
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;
                  letter-spacing:1px;margin-bottom:12px">Right Now</div>
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
        ${kpi('Outstanding Balance', fmt(outstanding), outstanding > 0 ? 'kpi-accent' : 'kpi-positive', outstandingSub)}
        ${kpi('Active Pipeline', pipeCount, pipeCount > 0 ? 'kpi-accent' : '', pipeSub)}
        ${kpi('This Month', fmt(curMonRev), momCls || (curMonRev > 0 ? 'kpi-positive' : ''), momSub)}
      </div>
    </div>
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;
                  letter-spacing:1px;margin-bottom:12px">P&amp;L &mdash; Year to Date</div>
```

**Step 3: Fix hardcoded year in chart title**

Find:
```
        Monthly Breakdown &mdash; 2026
```

Replace with:
```
        Monthly Breakdown &mdash; ${curYear}
```

**Step 4: Verify**

- [ ] Dashboard shows "Right Now" as the first KPI group with 3 cards
- [ ] "Outstanding Balance" shows gold value if unpaid jobs exist, sub shows count ("2 unpaid jobs")
- [ ] "Active Pipeline" shows count and breakdown ("2 pending · 1 in progress")
- [ ] "This Month" shows current month revenue with ↑/↓ % vs last month
- [ ] Dashboard title reads "Dashboard — 2026" (correct current year)
- [ ] Chart title reads "Monthly Breakdown — 2026"
- [ ] Zero state: Outstanding Balance shows "All clear", Pipeline shows "No active jobs"

**Step 5: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Right Now KPI group, fix hardcoded year"
```

---

## Task 3: Deploy

**Step 1:**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

**Step 2: Verify at live URL**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html

- [ ] "Right Now" group appears at top of dashboard with all 3 cards
- [ ] Values reflect real data (check against Jobs tab for outstanding/pipeline counts)
- [ ] No JS errors in console
