# PWA + Templates + Booking + Analytics Design — 2026-03-08

## Feature 1: PWA — Accounting App

### Files
- `Accounting/manifest.json` — new
- `Accounting/sw.js` — new service worker
- `Accounting/icon-192.png` — resized from logoblack_gold.png
- `Accounting/icon-512.png` — resized from logoblack_gold.png
- `Accounting/PIXELPATCHER-Accounting.html` — add manifest link, theme-color meta, SW registration

### manifest.json shape
```json
{
  "name": "Pixel Patcher Accounting",
  "short_name": "PP Accounting",
  "start_url": "/PIXELPATCHER-Accounting.html",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#4B2A8C",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker strategy
- Cache name: `pp-shell-v1`
- On install: cache `PIXELPATCHER-Accounting.html`, `manifest.json`, `logoblack_gold.png`, `pixelpatcher_header_chunky.png`, `pixelpatcherLOGO.png`
- Fetch handler: cache-first for same-origin requests; network-only for Firebase/Google APIs
- Firebase SDK scripts (gstatic.com, googleapis.com) always network — never cached

### HTML additions
- `<link rel="manifest" href="manifest.json">` in `<head>`
- `<meta name="theme-color" content="#4B2A8C">` in `<head>`
- `<meta name="mobile-web-app-capable" content="yes">` in `<head>`
- `<meta name="apple-mobile-web-app-capable" content="yes">` in `<head>`
- `<meta name="apple-mobile-web-app-title" content="PP Accounting">` in `<head>`
- `<link rel="apple-touch-icon" href="icon-192.png">` in `<head>`
- SW registration script at bottom of `<body>` before `</body>`

---

## Feature 2: Job Templates / Price Book

### Data store
`pp_templates` added to `FS_KEYS` — array of:
```js
{ id, name, device, model, issue, service, labor, partsList: [{name, cost}] }
```

### Jobs section
- Template pills row appears above the job filter bar if templates exist
- Each pill: gold outlined button with template name
- Click: opens Add Job form (if closed) and pre-fills all matching fields
- "+ Manage" link at end of pills → navigates to Settings tab

### Settings section
- New "Job Templates" card at bottom of Settings page
- Table: Name | Device | Service | Labor | Actions (Edit / Delete)
- "+ Add Template" button → inline form with same fields as job form (minus customer info)
- Edit: reuses edit-modal pattern

---

## Feature 3: Online Booking → Firestore

### Marketing site (`index.html` at repo root)
- New "Book a Repair" section with form:
  - Name (required), Phone (required), Email (optional)
  - Device type (free text), Issue description (textarea)
  - Preferred date (date input)
  - Submit button
- On submit: writes to `bookingRequests/{id}` in Firestore (pixelpatcher-accounting project)
- Firebase SDK (app + firestore compat) added to marketing site index.html
- Success state: "Thanks! We'll confirm your appointment shortly."
- Error state: "Submission failed — please call 540-300-2577"

### Firestore rules
- `bookingRequests` collection: allow create for unauthenticated users (public write)
- All other collections: unchanged (require auth)

### Accounting app
- On login (`fsauth.onAuthStateChanged`): call `loadBookingRequests(uid)`
- `loadBookingRequests()`: queries `bookingRequests` where `processed != true`, ordered by `createdAt`
- If any found: shows banner on dashboard "N new booking request(s)" with "Import All" button
- "Import All": creates each as a `pp_jobs` entry (status: Pending, paid: false, source: 'booking')
  then marks each `bookingRequests/{id}` as `processed: true`
- Imported jobs show up in the existing "pending inquiries" dashboard banner

### Booking request document shape
```js
{
  id,               // generated client-side
  name,             // customer name
  phone,
  email,
  device,
  issue,
  preferredDate,
  createdAt,        // new Date().toISOString()
  processed: false
}
```

---

## Feature 4: Google Analytics + Search Console

### GA4 setup steps (documented in plan)
1. Go to analytics.google.com → Admin → Create Property
2. Property name: "Pixel Patcher", timezone: America/New_York, currency: USD
3. Create Web data stream → URL: pixelpatcher.com → get G-XXXXXXXX ID
4. Create second Web data stream → URL: pixelpatcher-accounting.web.app → get second ID

### Snippet (both sites)
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Search Console
- Go to search.google.com/search-console → Add property
- Domain property for pixelpatcher.com → DNS TXT verification (Netlify DNS)
- URL prefix for pixelpatcher-accounting.web.app → HTML meta tag verification
- Meta tag: `<meta name="google-site-verification" content="XXXXXXX">`

### Placement
- Marketing `index.html`: GA snippet + Search Console meta in `<head>`
- Accounting HTML: GA snippet in `<head>`, Search Console meta in `<head>`
- Note: accounting app is private (auth-gated) — GA will show very low traffic (just Jason), that's expected

