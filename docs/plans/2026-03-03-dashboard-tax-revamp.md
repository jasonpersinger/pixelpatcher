# Dashboard Revamp + Tax Tab — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize dashboard KPIs into three labeled groups (P&L, Operations, Set Aside) and add a Tax tab with quarterly estimated tax breakdowns and IRS due dates.

**Architecture:** Dashboard reorganization is a pure HTML restructuring of the existing `renderDashboard()` function — no logic changes, just grouping the kpi-grid into three labeled sub-grids. The Tax tab adds a new nav button, section element, `renderSection` case, and `renderTax()` function that computes quarterly net profit from existing `pp_income` and `pp_expenses` data.

**Tech Stack:** Vanilla JS, existing `DB` helpers, existing `pp_income`/`pp_expenses`/`pp_settings` data. Output file: `/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html`.

---

## Task 1: Reorganize Dashboard KPI Groups

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Replace the single flat kpi-grid with three labeled groups**

Find:
```
    <div class="kpi-grid">
      ${kpi('Total Income',   fmt(revenue),   revenue > 0 ? 'kpi-positive' : '', 'Year to Date')}
      ${kpi('Total Expenses', fmt(totalExp),  'kpi-negative', 'Year to Date')}
      ${kpi('Net Profit',     fmt(netProfit), netProfit >= 0 ? 'kpi-positive' : 'kpi-negative', 'Year to Date')}
      ${kpi('Jobs Completed', jobsDone,       'kpi-accent',   'Year to Date')}
      ${kpi('Avg Job Value',  fmt(avgJob),    avgJob > 0 ? 'kpi-positive' : '', 'Per Completed Job')}
      ${kpi('Miles Driven',   totalMiles.toFixed(1), 'kpi-accent', 'Total YTD')}
      ${kpi('Mileage Deduction', fmt(mileDed), 'kpi-positive', 'IRS $' + settings.irsRate + '/mile')}
      ${kpi('Tax Reserve (' + Math.round(settings.taxReserve * 100) + '%)',
            fmt(taxReserve), 'kpi-warning', 'Set This Aside')}
      ${kpi('Sales Tax Collected', fmt(salesTaxCollected), 'kpi-warning', 'Set Aside')}
    </div>
```

Replace with:
```
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;
                  letter-spacing:1px;margin-bottom:12px">P&amp;L &mdash; Year to Date</div>
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
        ${kpi('Total Income',   fmt(revenue),   revenue > 0 ? 'kpi-positive' : '', 'Year to Date')}
        ${kpi('Total Expenses', fmt(totalExp),  'kpi-negative', 'Year to Date')}
        ${kpi('Net Profit',     fmt(netProfit), netProfit >= 0 ? 'kpi-positive' : 'kpi-negative', 'Year to Date')}
      </div>
    </div>
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;
                  letter-spacing:1px;margin-bottom:12px">Operations</div>
      <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr)">
        ${kpi('Jobs Completed', jobsDone,    'kpi-accent', 'Year to Date')}
        ${kpi('Avg Job Value',  fmt(avgJob), avgJob > 0 ? 'kpi-positive' : '', 'Per Completed Job')}
      </div>
    </div>
    <div style="margin-bottom:28px">
      <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;
                  letter-spacing:1px;margin-bottom:12px">Set Aside</div>
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
        ${kpi('Tax Reserve (' + Math.round(settings.taxReserve * 100) + '%)',
              fmt(taxReserve), 'kpi-warning', 'Set This Aside')}
        ${kpi('Sales Tax Collected', fmt(salesTaxCollected), 'kpi-warning', 'Set Aside')}
        ${kpi('Mileage Deduction', fmt(mileDed), 'kpi-positive', 'IRS $' + settings.irsRate + '/mile')}
      </div>
    </div>
```

**Step 2: Verify**

Open app → Dashboard:
- [ ] Three labeled sections: "P&L — YEAR TO DATE", "OPERATIONS", "SET ASIDE"
- [ ] P&L: 3 cards across (Income, Expenses, Net Profit)
- [ ] Operations: 2 cards (Jobs Completed, Avg Job Value)
- [ ] Set Aside: 3 cards (Tax Reserve, Sales Tax Collected, Mileage Deduction)
- [ ] Monthly chart still appears below

**Step 3: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "style: reorganize dashboard KPIs into labeled groups"
```

---

## Task 2: Add Tax Nav Button and Section

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add nav button between Mileage and Settings**

Find:
```
      <button class="nav-btn" data-section="mileage">Mileage</button>
      <button class="nav-btn" data-section="settings">Settings</button>
```

Replace with:
```
      <button class="nav-btn" data-section="mileage">Mileage</button>
      <button class="nav-btn" data-section="tax">Tax</button>
      <button class="nav-btn" data-section="settings">Settings</button>
```

**Step 2: Add section element**

Find:
```
    <section id="mileage"   class="section"></section>
    <section id="settings"  class="section"></section>
```

Replace with:
```
    <section id="mileage"   class="section"></section>
    <section id="tax"       class="section"></section>
    <section id="settings"  class="section"></section>
```

**Step 3: Add renderSection case**

Find:
```
  else if (name === 'mileage')  renderMileage();
  else if (name === 'settings') renderSettings();
```

Replace with:
```
  else if (name === 'mileage')  renderMileage();
  else if (name === 'tax')      renderTax();
  else if (name === 'settings') renderSettings();
```

**Step 4: Verify**

- [ ] "Tax" nav button appears between Mileage and Settings
- [ ] Clicking it activates the section without errors

**Step 5: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Tax nav tab and section"
```

---

## Task 3: Add renderTax() Function

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

Add `renderTax()` immediately after the closing `}` of `renderSettings()`.

Find the end of renderSettings — it ends with a line containing just `}` after the `renderSettings()` call inside it. Add the following block after it:

```
// ── Tax tab ───────────────────────────────────────────────────────────────────
function renderTax() {
  const settings  = getSettings();
  const rate      = settings.taxReserve || 0.25;
  const allIncome = (DB.get('pp_income') || []).filter(i => i.type !== 'Owner Contribution');
  const allExp    = DB.get('pp_expenses') || [];
  const year      = 2026;

  function qData(startMonth, endMonth) {
    const inc = allIncome.filter(i => {
      const d = new Date(i.date);
      return d.getFullYear() === year && d.getMonth() >= startMonth && d.getMonth() <= endMonth;
    }).reduce((s, i) => s + Number(i.amount), 0);
    const exp = allExp.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() >= startMonth && d.getMonth() <= endMonth;
    }).reduce((s, e) => s + Number(e.amount), 0);
    const net = inc - exp;
    return { inc, exp, net, tax: Math.max(0, net * rate) };
  }

  const quarters = [
    { label: 'Q1', range: 'Jan \u2013 Mar', months: [0, 2],  due: 'April 15, 2026' },
    { label: 'Q2', range: 'Apr \u2013 Jun', months: [3, 5],  due: 'June 15, 2026' },
    { label: 'Q3', range: 'Jul \u2013 Sep', months: [6, 8],  due: 'Sept 15, 2026' },
    { label: 'Q4', range: 'Oct \u2013 Dec', months: [9, 11], due: 'Jan 15, 2027' },
  ].map(q => Object.assign({}, q, qData(q.months[0], q.months[1])));

  const curMonth = new Date().getMonth();
  const curQ     = curMonth < 3 ? 0 : curMonth < 6 ? 1 : curMonth < 9 ? 2 : 3;

  const annualNet = quarters.reduce((s, q) => s + q.net, 0);
  const annualTax = Math.max(0, annualNet * rate);

  function qCard(q, isCurrent) {
    if (isCurrent) {
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--card);border:2px solid var(--accent);border-radius:var(--radius);padding:28px;margin-bottom:16px';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px';

      const titleBlock = document.createElement('div');
      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px';
      titleEl.textContent = q.label + ' \u2014 Current Quarter';
      const rangeEl = document.createElement('div');
      rangeEl.style.cssText = 'font-size:12px;color:var(--muted);margin-top:2px';
      rangeEl.textContent = q.range;
      titleBlock.appendChild(titleEl);
      titleBlock.appendChild(rangeEl);

      const dueBadge = document.createElement('div');
      dueBadge.style.cssText = 'background:var(--accent);color:#000;font-size:11px;font-weight:700;padding:4px 12px;border-radius:12px';
      dueBadge.textContent = 'DUE ' + q.due.toUpperCase();

      header.appendChild(titleBlock);
      header.appendChild(dueBadge);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:8px';

      [
        { label: 'Income',   value: fmt(q.inc), color: 'var(--positive)' },
        { label: 'Expenses', value: fmt(q.exp), color: 'var(--negative)' },
        { label: 'Net Profit', value: fmt(q.net), color: q.net >= 0 ? 'var(--positive)' : 'var(--negative)' },
      ].forEach(({ label, value, color }) => {
        const cell = document.createElement('div');
        const lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px';
        lbl.textContent = label;
        const val = document.createElement('div');
        val.style.cssText = 'font-size:22px;font-weight:700;color:' + color;
        val.textContent = value;
        cell.appendChild(lbl);
        cell.appendChild(val);
        grid.appendChild(cell);
      });

      const taxBlock = document.createElement('div');
      taxBlock.style.cssText = 'border-top:1px solid var(--border);padding-top:16px;margin-top:8px';
      const taxLbl = document.createElement('div');
      taxLbl.style.cssText = 'font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px';
      taxLbl.textContent = 'Estimated Tax to Set Aside';
      const taxVal = document.createElement('div');
      taxVal.style.cssText = 'font-size:32px;font-weight:700;color:var(--warning)';
      taxVal.textContent = fmt(q.tax);
      taxBlock.appendChild(taxLbl);
      taxBlock.appendChild(taxVal);

      card.appendChild(header);
      card.appendChild(grid);
      card.appendChild(taxBlock);
      return card;
    } else {
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:12px;opacity:0.75';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';
      const labelEl = document.createElement('div');
      const qLabel = document.createElement('span');
      qLabel.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px';
      qLabel.textContent = q.label;
      const qRange = document.createElement('span');
      qRange.style.cssText = 'font-size:11px;color:var(--muted);margin-left:8px';
      qRange.textContent = q.range;
      labelEl.appendChild(qLabel);
      labelEl.appendChild(qRange);
      const dueEl = document.createElement('span');
      dueEl.style.cssText = 'font-size:11px;color:var(--muted)';
      dueEl.textContent = 'Due ' + q.due;
      header.appendChild(labelEl);
      header.appendChild(dueEl);

      const stats = document.createElement('div');
      stats.style.cssText = 'display:flex;gap:32px';
      [
        { label: 'Net Profit', value: fmt(q.net), color: q.net >= 0 ? 'var(--positive)' : 'var(--negative)' },
        { label: 'Est. Tax',   value: fmt(q.tax), color: 'var(--warning)' },
      ].forEach(({ label, value, color }) => {
        const cell = document.createElement('div');
        const lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:10px;color:var(--muted);margin-bottom:2px';
        lbl.textContent = label;
        const val = document.createElement('div');
        val.style.cssText = 'font-size:16px;font-weight:700;color:' + color;
        val.textContent = value;
        cell.appendChild(lbl);
        cell.appendChild(val);
        stats.appendChild(cell);
      });

      card.appendChild(header);
      card.appendChild(stats);
      return card;
    }
  }

  const section = document.getElementById('tax');
  section.textContent = '';

  const title = document.createElement('div');
  title.className = 'page-title';
  title.textContent = 'Tax Estimates \u2014 ' + year;
  section.appendChild(title);

  // Annual summary card
  const annualCard = document.createElement('div');
  annualCard.className = 'card';
  annualCard.style.marginBottom = '24px';
  const annualLabel = document.createElement('div');
  annualLabel.style.cssText = 'font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px';
  annualLabel.textContent = 'Annual Summary';
  const annualGrid = document.createElement('div');
  annualGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:16px';
  [
    { label: 'Net Profit YTD', value: fmt(annualNet), color: annualNet >= 0 ? 'var(--positive)' : 'var(--negative)' },
    { label: 'Total Est. Tax', value: fmt(annualTax), color: 'var(--warning)' },
    { label: 'Reserve Rate',   value: Math.round(rate * 100) + '%', color: 'var(--accent)', sub: 'Adjust in Settings' },
  ].forEach(({ label, value, color, sub }) => {
    const cell = document.createElement('div');
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px';
    lbl.textContent = label;
    const val = document.createElement('div');
    val.style.cssText = 'font-size:26px;font-weight:700;color:' + color;
    val.textContent = value;
    cell.appendChild(lbl);
    cell.appendChild(val);
    if (sub) {
      const subEl = document.createElement('div');
      subEl.style.cssText = 'font-size:11px;color:var(--muted);margin-top:2px';
      subEl.textContent = sub;
      cell.appendChild(subEl);
    }
    annualGrid.appendChild(cell);
  });
  annualCard.appendChild(annualLabel);
  annualCard.appendChild(annualGrid);
  section.appendChild(annualCard);

  // Quarter cards
  quarters.forEach((q, i) => section.appendChild(qCard(q, i === curQ)));

  // Disclaimer
  const note = document.createElement('div');
  note.style.cssText = 'font-size:11px;color:var(--muted);text-align:center;margin-top:8px;padding:16px';
  note.textContent = 'Estimates based on your ' + Math.round(rate * 100) + '% tax reserve rate \u2014 actual liability may vary. Consult a tax professional.';
  section.appendChild(note);
}
```

Note: This implementation uses DOM methods instead of innerHTML to avoid XSS issues, since the security hook flags innerHTML usage.

**Step 2: Verify**

- [ ] Click "Tax" → page renders without errors
- [ ] Annual summary shows correct net profit, estimated tax, and rate
- [ ] Current quarter (Q1 in March) has gold border and is larger
- [ ] Other 3 quarters are muted and compact
- [ ] IRS due dates correct: Q1=Apr 15, Q2=Jun 15, Q3=Sep 15, Q4=Jan 15 2027
- [ ] Disclaimer visible at bottom

**Step 3: Commit**

```bash
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add quarterly tax estimate tab"
```

---

## Task 4: Deploy

**Step 1: Deploy to Firebase Hosting**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

**Step 2: Verify at live URL**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html

- [ ] Dashboard shows three labeled KPI groups
- [ ] Tax tab shows annual summary + 4 quarter cards with current highlighted
- [ ] Numbers are consistent with Income and Expenses sections

---

## Final Checklist

- [ ] Dashboard P&L group: Income, Expenses, Net Profit (3 across)
- [ ] Dashboard Operations group: Jobs Completed, Avg Job Value (2 across)
- [ ] Dashboard Set Aside group: Tax Reserve, Sales Tax Collected, Mileage Deduction (3 across)
- [ ] Tax tab accessible from sidebar nav
- [ ] Current quarter highlighted with gold accent border
- [ ] Other quarters muted and compact
- [ ] Annual summary card at top with net profit, tax estimate, and rate
- [ ] Disclaimer at bottom
