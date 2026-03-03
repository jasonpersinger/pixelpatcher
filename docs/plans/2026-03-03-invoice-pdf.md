# Invoice PDF with Logo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the Pixel Patcher logo to the invoice and ensure clean PDF output via browser print.

**Architecture:** The invoice already renders to a `#printable` div with white background and has `@media print` CSS that hides the app sidebar. The logo file gets copied to the Accounting hosting folder so it's accessible at `/pixelpatcherLOGO.png`. The invoice header is updated to show the logo alongside the business name. The button label is already "Print / Save PDF" which is correct.

**Tech Stack:** Vanilla JS, CSS, browser `window.print()`. Output file: `/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html`.

---

## Task 1: Copy Logo to Accounting Folder

**Step 1: Copy the file**

```bash
cp /home/jason/Desktop/PIXELPATCHER/Branding/pixelpatcherLOGO.png \
   /home/jason/Desktop/PIXELPATCHER/Accounting/pixelpatcherLOGO.png
```

**Step 2: Verify**

```bash
ls /home/jason/Desktop/PIXELPATCHER/Accounting/pixelpatcherLOGO.png
```

Expected: file exists.

**Step 3: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/pixelpatcherLOGO.png
git commit -m "feat: add logo file to Accounting hosting folder"
```

---

## Task 2: Add Logo to Invoice Header

**File:** Modify `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Find the invoice business name header**

Find (around line 1885):
```js
        <div>
          <div style="font-size:22px;font-weight:800;letter-spacing:1px">
            &#9632; ${esc(s.businessName.toUpperCase())}
          </div>
          <div style="font-size:11px;color:#666;margin-top:4px;letter-spacing:2px">
            FROM PIXELS TO PROCESSORS
          </div>
          <div style="margin-top:12px;font-size:13px;color:#555;line-height:1.8">
            ${esc(s.phone)}<br>${esc(s.website)}
            ${s.address ? '<br>' + esc(s.address) : ''}
          </div>
        </div>
```

Replace with:
```js
        <div style="display:flex;align-items:flex-start;gap:16px">
          <img src="/pixelpatcherLOGO.png" alt="Pixel Patcher"
               style="height:56px;width:auto;object-fit:contain">
          <div>
            <div style="font-size:22px;font-weight:800;letter-spacing:1px">
              ${esc(s.businessName.toUpperCase())}
            </div>
            <div style="font-size:11px;color:#666;margin-top:4px;letter-spacing:2px">
              FROM PIXELS TO PROCESSORS
            </div>
            <div style="margin-top:12px;font-size:13px;color:#555;line-height:1.8">
              ${esc(s.phone)}<br>${esc(s.website)}
              ${s.address ? '<br>' + esc(s.address) : ''}
            </div>
          </div>
        </div>
```

**Step 2: Verify locally**

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
python3 -m http.server 8080
```

Open http://localhost:8080/PIXELPATCHER-Accounting.html → sign in → Jobs → Invoice on any job. The logo should appear in the top-left of the invoice. Click "Print / Save PDF" → choose "Save as PDF" → confirm logo appears in the saved PDF.

- [ ] Logo appears in invoice header
- [ ] Business name and contact info still display correctly
- [ ] Sidebar hidden in print preview
- [ ] PDF looks clean and professional

**Step 3: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add logo to invoice header"
```

---

## Task 3: Deploy

```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
```

**Verify at live URL:**

Open https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html → invoice → confirm logo loads and PDF saves correctly.

- [ ] Logo visible on live site invoice
- [ ] Print / Save PDF produces clean output with logo

---

## Final Checklist

- [ ] `pixelpatcherLOGO.png` copied to `Accounting/` folder
- [ ] Logo appears in invoice `#printable` header
- [ ] Print CSS hides sidebar and app chrome
- [ ] Saved PDF looks professional
