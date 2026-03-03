# Pixel Patcher Accounting — Claude Project Memory

## What This Is
Single-file accounting app for Pixel Patcher (phone/computer repair shop). One HTML file, vanilla JS, localStorage + Firebase Firestore sync. Deployed to Firebase Hosting.

**Live URL:** https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html
**Main file:** `PIXELPATCHER-Accounting.html`

## Stack
- Vanilla JS, no framework, no build step
- localStorage (primary) + Firestore (write-through sync via `DB.set`)
- Firebase JS SDK v10 compat (app, firestore, auth, storage)
- Firebase Hosting (production), Firebase Auth (Google Sign-In), Firebase Storage (receipts)
- Firebase Cloud Functions (scheduled email reminders)

## Firebase Project
- Project ID: `pixelpatcher-accounting`
- Auth domain: `pixelpatcher-accounting.firebaseapp.com`
- Storage bucket: `pixelpatcher-accounting.firebasestorage.app`
- Firestore path: `users/{uid}/data/{key}` — each key stores `{ value: [...] }`

## Data Stores (localStorage + Firestore via FS_KEYS)
- `pp_settings` — tax rate, mileage rate, biz name, etc.
- `pp_income` — income records
- `pp_expenses` — expense records (have optional `jobId` and `receiptUrl` fields)
- `pp_mileage` — mileage log
- `pp_jobs` — job records (customer, issue, service, labor, parts, status, paid, phone, address)
- `pp_followups` — CRM follow-up reminders `{id, customerName, phone, note, dueDate, done}`
- `pp_seeded` — flag for demo data seed

## Key Patterns
- `DB.get(key)` / `DB.set(key, v)` / `DB.push(key, obj)` / `DB.del(key, id)` — all storage ops
- `DB.set` automatically mirrors to Firestore (fire-and-forget) for keys in `FS_KEYS`
- `uid()` generates IDs, `today()` returns YYYY-MM-DD, `fmt(n)` formats currency, `esc(s)` escapes HTML
- Render functions set `document.getElementById(sectionId).innerHTML = ...` for each section
- Nav switching triggers render: `showSection(s)` calls `renderX()` per section

## Security Hook
**IMPORTANT:** A `PreToolUse:Write` hook blocks the Write tool when content contains `innerHTML`. 
- For `.html` file edits: always use the `Edit` tool (find/replace)
- For writing new `.md` plan docs: use `Bash` with `cat << 'PLANEOF' > file.md` heredoc

## Sections / Nav Order
dashboard → income → customers → followups → jobs → invoice → expenses → mileage → tax → settings

## Brand Colors (CSS vars)
- `--accent`: gold/yellow (primary brand)
- `--warning`: purple (used for receipt attachment buttons)
- `--positive`: green, `--negative`: red, `--muted`: gray

## Plans
All feature design docs + implementation plans live in `../docs/plans/YYYY-MM-DD-*.md`.
Completed: firestore-sync, receipt-upload, job-expense-linking, dashboard-tax-revamp.
In progress: crm-followups (plan at `../docs/plans/2026-03-03-crm-followups.md`).

## Deploy Command
```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only hosting
# or: --only hosting,functions  (after functions/ exists)
```

## Owner
Jason Persinger — jason.persinger@gmail.com
