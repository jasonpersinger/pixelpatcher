# PWA + Templates + Booking + Analytics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the accounting app installable as a PWA, add job templates with quick-launch pills, wire an online booking form on the marketing site directly into the accounting app's Firestore, and add Google Analytics to both sites.

**Architecture:** Four independent feature tracks in order: PWA (new files + HTML meta), templates (new data store + UI in Jobs/Settings), booking (Firestore rules + marketing form + accounting importer), analytics (manual GA4 setup + snippet in both HTML files). All accounting changes are in `Accounting/PIXELPATCHER-Accounting.html`. Marketing changes are in `index.html` at the repo root.

**Tech Stack:** Vanilla JS, Firebase Firestore (compat SDK), Firebase Hosting, Netlify (marketing site), Python/Pillow for icon resizing, Google Analytics 4.

**Key constraints:**
- `Accounting/PIXELPATCHER-Accounting.html`: Write tool blocked for innerHTML content — use Edit tool or python3 heredoc
- `index.html` (marketing): standard HTML file, Edit tool fine
- Firestore rules: `Accounting/firestore.rules` — deploy with `npx firebase-tools@latest deploy --only firestore:rules`
- Marketing site deploys via `git push origin main` (Netlify auto-deploys)

---

## Bash heredoc pattern for large HTML replacements

```bash
python3 - << 'PYEOF'
with open('/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html', 'r') as f:
    content = f.read()
old = '''EXACT_OLD_TEXT'''
new = '''EXACT_NEW_TEXT'''
assert old in content, "OLD TEXT NOT FOUND"
content = content.replace(old, new, 1)
with open('/home/jason/Desktop/PIXELPATCHER/Accounting/PIXELPATCHER-Accounting.html', 'w') as f:
    f.write(content)
print("Done")
PYEOF
```

---

### Task 1: PWA icons

**Files:**
- Create: `Accounting/icon-192.png`
- Create: `Accounting/icon-512.png`

**Step 1: Check Pillow is available**
```bash
python3 -c "from PIL import Image; print('OK')"
```
If not installed: `pip install Pillow`

**Step 2: Generate icons**
```bash
python3 - << 'PYEOF'
from PIL import Image
img = Image.open('/home/jason/Desktop/PIXELPATCHER/Accounting/logoblack_gold.png').convert('RGBA')
# Add black background (logo is on transparent/black — make it solid black for PWA icon)
bg192 = Image.new('RGBA', (192, 192), (0, 0, 0, 255))
logo192 = img.resize((160, 160), Image.LANCZOS)
bg192.paste(logo192, (16, 16), logo192)
bg192.convert('RGB').save('/home/jason/Desktop/PIXELPATCHER/Accounting/icon-192.png')

bg512 = Image.new('RGBA', (512, 512), (0, 0, 0, 255))
logo512 = img.resize((432, 432), Image.LANCZOS)
bg512.paste(logo512, (40, 40), logo512)
bg512.convert('RGB').save('/home/jason/Desktop/PIXELPATCHER/Accounting/icon-512.png')
print("Icons created")
PYEOF
```

**Step 3: Verify icons exist**
```bash
ls -lh /home/jason/Desktop/PIXELPATCHER/Accounting/icon-*.png
```
Expected: both files present, each a few KB.

**Step 4: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/icon-192.png Accounting/icon-512.png
git commit -m "feat: add PWA icons 192x192 and 512x512"
```

---

### Task 2: PWA manifest + service worker

**Files:**
- Create: `Accounting/manifest.json`
- Create: `Accounting/sw.js`

**Step 1: Create manifest.json**

Create `/home/jason/Desktop/PIXELPATCHER/Accounting/manifest.json`:
```json
{
  "name": "Pixel Patcher Accounting",
  "short_name": "PP Accounting",
  "description": "Job tracking, invoicing, and accounting for Pixel Patcher",
  "start_url": "/PIXELPATCHER-Accounting.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#000000",
  "theme_color": "#4B2A8C",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Step 2: Create sw.js**

Create `/home/jason/Desktop/PIXELPATCHER/Accounting/sw.js`:
```js
const CACHE_NAME = 'pp-shell-v1';
const SHELL_ASSETS = [
  '/PIXELPATCHER-Accounting.html',
  '/manifest.json',
  '/logoblack_gold.png',
  '/pixelpatcher_header_chunky.png',
  '/pixelpatcherLOGO.png',
  '/icon-192.png',
  '/icon-512.png',
];

// Network-only hosts — never cache Firebase/Google API calls
const NETWORK_ONLY = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebasestorage.googleapis.com',
  'firebase.googleapis.com',
  'gstatic.com',
  'googleapis.com',
  'googletagmanager.com',
  'fonts.googleapis.com',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always network for Firebase and Google APIs
  if (NETWORK_ONLY.some(host => url.hostname.includes(host))) {
    return; // default browser fetch
  }

  // Cache-first for same-origin shell assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
```

**Step 3: Add PWA meta tags and manifest link to the accounting HTML**

Find in `Accounting/PIXELPATCHER-Accounting.html`:
```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
```
Replace with:
```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#4B2A8C">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="PP Accounting">
  <link rel="apple-touch-icon" href="icon-192.png">
```

**Step 4: Register the service worker**

Find the closing `</script>` tag at the very end of the file:
```js
// Initial render triggered by fsauth.onAuthStateChanged above
</script>
```
Replace with:
```js
// Initial render triggered by fsauth.onAuthStateChanged above

// ── PWA service worker registration ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.warn('SW registration failed:', err));
  });
}
</script>
```

**Step 5: Verify PWA**
- Deploy (step below) then open Chrome DevTools → Application → Manifest
- Should show name, icons, theme color with no errors
- Application → Service Workers — should show sw.js as activated
- On mobile Chrome: 3-dot menu → "Add to Home screen" option should appear

**Step 6: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/manifest.json Accounting/sw.js Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add PWA manifest and service worker for installability"
```

---

### Task 3: Job templates data + Settings UI

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add pp_templates to FS_KEYS**

Find:
```js
const FS_KEYS = ['pp_settings','pp_income','pp_expenses','pp_mileage','pp_jobs','pp_seeded','pp_followups','pp_customers'];
```
Replace with:
```js
const FS_KEYS = ['pp_settings','pp_income','pp_expenses','pp_mileage','pp_jobs','pp_seeded','pp_followups','pp_customers','pp_templates'];
```

**Step 2: Add template management to renderSettings()**

Find at the end of renderSettings(), the closing of the card div:
```js
      <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
    </div>
  `;
```
Replace with:
```js
      <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
    </div>
    <div class="page-title" style="margin-top:32px">Job Templates</div>
    <div class="card" style="max-width:700px">
      <div class="section-header" style="margin-bottom:16px">
        <div style="font-size:13px;color:var(--muted)">Quick-launch templates appear as pills on the Jobs tab.</div>
        <button class="btn btn-primary" style="font-size:12px;padding:6px 14px"
          onclick="toggleForm('tmpl-form')">+ Add Template</button>
      </div>
      <div class="add-form" id="tmpl-form" style="margin-bottom:20px">
        <div class="form-grid">
          <div class="form-group"><label>Template Name</label>
            <input id="tmpl-name" placeholder="e.g. iPhone Screen Replacement"></div>
          <div class="form-group"><label>Device</label>
            <input id="tmpl-device" placeholder="iPhone, MacBook, etc."></div>
          <div class="form-group"><label>Model</label>
            <input id="tmpl-model" placeholder="13 Pro, Air M2, etc."></div>
          <div class="form-group"><label>Issue Description</label>
            <input id="tmpl-issue" placeholder="Cracked screen, etc."></div>
          <div class="form-group"><label>Service Performed</label>
            <input id="tmpl-service" placeholder="Screen replacement, etc."></div>
          <div class="form-group"><label>Labor ($)</label>
            <input type="number" step="0.01" id="tmpl-labor" placeholder="0.00"></div>
        </div>
        <button class="btn btn-primary" onclick="saveTemplate()">Save Template</button>
      </div>
      ${(() => {
        const tmpls = DB.get('pp_templates') || [];
        if (tmpls.length === 0) return '<div style="color:var(--muted);font-size:13px">No templates yet.</div>';
        return '<div class="table-wrap"><table>'
          + '<thead><tr><th>Name</th><th>Device</th><th>Service</th><th>Labor</th><th></th></tr></thead>'
          + '<tbody>'
          + tmpls.map(t => `<tr>
              <td><strong>${esc(t.name)}</strong></td>
              <td style="color:var(--muted)">${esc([t.device, t.model].filter(Boolean).join(' ')) || '&mdash;'}</td>
              <td style="color:var(--muted)">${esc(t.service) || '&mdash;'}</td>
              <td style="color:var(--positive)">${fmt(t.labor || 0)}</td>
              <td><button class="btn btn-danger" onclick="deleteTemplate('${esc(t.id)}')">&#x2715;</button></td>
            </tr>`).join('')
          + '</tbody></table></div>';
      })()}
    </div>
  `;
```

**Step 3: Add saveTemplate() and deleteTemplate() functions**

Find:
```js
function saveSettings() {
```
Insert before it:
```js
// ── Job Templates ─────────────────────────────────────────────────────────────
function saveTemplate() {
  const name = (document.getElementById('tmpl-name') || {}).value || '';
  if (!name.trim()) { alert('Template name is required.'); return; }
  DB.push('pp_templates', {
    id:      uid(),
    name:    name.trim(),
    device:  (document.getElementById('tmpl-device')  || {}).value || '',
    model:   (document.getElementById('tmpl-model')   || {}).value || '',
    issue:   (document.getElementById('tmpl-issue')   || {}).value || '',
    service: (document.getElementById('tmpl-service') || {}).value || '',
    labor:   parseFloat((document.getElementById('tmpl-labor') || {}).value) || 0,
  });
  renderSettings();
}

function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  DB.del('pp_templates', id);
  renderSettings();
}

function loadTemplate(id) {
  const tmpls = DB.get('pp_templates') || [];
  const t = tmpls.find(x => x.id === id);
  if (!t) return;
  // Open the add job form if not already open
  const form = document.getElementById('job-form');
  if (form && !form.classList.contains('open')) form.classList.add('open');
  // Pre-fill fields
  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
  set('j-device',  t.device);
  set('j-model',   t.model);
  set('j-issue',   t.issue);
  set('j-service', t.service);
  set('j-labor',   t.labor || '');
  // Scroll to form
  const jobSection = document.getElementById('jobs');
  if (jobSection) jobSection.scrollTo({ top: 0, behavior: 'smooth' });
}

```

**Step 4: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add job templates CRUD in Settings"
```

---

### Task 4: Job template pills on Jobs tab

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add template pills row to renderJobs()**

Find in renderJobs() the totals bar:
```html
    <div class="totals-bar">
      <div class="total-item"><label>Total Jobs</label><span>${jobs.length}</span></div>
```
Replace with:
```html
    ${(() => {
      const tmpls = DB.get('pp_templates') || [];
      if (tmpls.length === 0) return '';
      return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center">'
        + '<span style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Quick Start:</span>'
        + tmpls.map(t =>
            `<button onclick="loadTemplate('${esc(t.id)}')"
               style="background:transparent;border:1px solid var(--accent);color:var(--accent);
                      border-radius:20px;padding:5px 14px;font-size:12px;cursor:pointer;
                      font-family:var(--font);font-weight:600;white-space:nowrap">${esc(t.name)}</button>`
          ).join('')
        + `<button onclick="showSection('settings')"
             style="background:transparent;border:1px solid var(--border);color:var(--muted);
                    border-radius:20px;padding:5px 12px;font-size:11px;cursor:pointer;
                    font-family:var(--font)">+ Manage</button>`
        + '</div>';
    })()}
    <div class="totals-bar">
      <div class="total-item"><label>Total Jobs</label><span>${jobs.length}</span></div>
```

**Step 2: Verify**
- Go to Settings → add a template "iPhone Screen" with labor $80
- Go to Jobs tab — gold pill "iPhone Screen" appears above the filter bar
- Click pill — Add Job form opens with device/service/labor pre-filled
- "+ Manage" pill → jumps to Settings tab

**Step 3: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add job template quick-launch pills to Jobs tab"
```

---

### Task 5: Firestore rules — allow public bookingRequests writes

**Files:**
- Modify: `Accounting/firestore.rules`

**Step 1: Read current rules**
```bash
cat /home/jason/Desktop/PIXELPATCHER/Accounting/firestore.rules
```

**Step 2: Add bookingRequests rule**

The current rules require auth for all reads/writes to `users/{uid}/data`. Add a new rule allowing unauthenticated creates to `bookingRequests`:

Find the closing `}` of the rules file and add before it:
```
    // Public booking requests from marketing site
    match /bookingRequests/{docId} {
      allow create: if true;
      allow read, update: if request.auth != null;
    }
```

Full expected file after edit:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/data/{key} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /mail/{docId} {
      allow create: if request.auth != null;
      allow read: if false;
    }
    // Public booking requests from marketing site
    match /bookingRequests/{docId} {
      allow create: if true;
      allow read, update: if request.auth != null;
    }
  }
}
```
(Adjust to match actual current content — the key addition is the bookingRequests block.)

**Step 3: Deploy rules**
```bash
cd /home/jason/Desktop/PIXELPATCHER/Accounting
npx firebase-tools@latest deploy --only firestore:rules
```
Expected: `✔ firestore: released rules`

**Step 4: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/firestore.rules
git commit -m "feat: allow public unauthenticated writes to bookingRequests collection"
```

---

### Task 6: Booking form on marketing site

**Files:**
- Modify: `index.html` (repo root)

**Step 1: Find where to insert the booking section**

Read `index.html` and identify a good insertion point — after the services/reviews section, before the footer. Look for a section with id="contact" or similar, or just before `</main>` or `<footer`.

**Step 2: Add Firebase SDK scripts to marketing site**

Find in `index.html` the closing `</head>` tag and add before it:
```html
  <!-- Firebase for booking form -->
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
```

**Step 3: Add booking section HTML**

Find a suitable insertion point (before footer or after contact section) and insert:
```html
<!-- ── Book a Repair ───────────────────────────────────────────── -->
<section id="booking" style="padding:80px 24px;background:#0a0a0a;text-align:center">
  <div style="max-width:560px;margin:0 auto">
    <h2 style="font-family:'Press Start 2P',monospace;font-size:12px;color:#C9A000;
               letter-spacing:2px;margin-bottom:12px;text-transform:uppercase">Book a Repair</h2>
    <p style="color:#7a6a50;font-size:15px;margin-bottom:32px;font-family:'DM Sans',sans-serif">
      Tell us what's broken — we'll get it fixed.
    </p>
    <form id="booking-form" style="display:flex;flex-direction:column;gap:14px;text-align:left">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <label style="font-size:12px;color:#7a6a50;display:block;margin-bottom:5px">Your Name *</label>
          <input id="bk-name" required placeholder="Jane Smith"
            style="width:100%;background:#000;border:1px solid #2a1a3a;color:#EDE8DC;
                   border-radius:8px;padding:10px 14px;font-size:14px;font-family:'DM Sans',sans-serif;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#7a6a50;display:block;margin-bottom:5px">Phone *</label>
          <input id="bk-phone" required placeholder="555-000-0000"
            style="width:100%;background:#000;border:1px solid #2a1a3a;color:#EDE8DC;
                   border-radius:8px;padding:10px 14px;font-size:14px;font-family:'DM Sans',sans-serif;box-sizing:border-box">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <label style="font-size:12px;color:#7a6a50;display:block;margin-bottom:5px">Email</label>
          <input id="bk-email" type="email" placeholder="jane@example.com"
            style="width:100%;background:#000;border:1px solid #2a1a3a;color:#EDE8DC;
                   border-radius:8px;padding:10px 14px;font-size:14px;font-family:'DM Sans',sans-serif;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#7a6a50;display:block;margin-bottom:5px">Device</label>
          <input id="bk-device" placeholder="iPhone 13, MacBook, etc."
            style="width:100%;background:#000;border:1px solid #2a1a3a;color:#EDE8DC;
                   border-radius:8px;padding:10px 14px;font-size:14px;font-family:'DM Sans',sans-serif;box-sizing:border-box">
        </div>
      </div>
      <div>
        <label style="font-size:12px;color:#7a6a50;display:block;margin-bottom:5px">What's wrong? *</label>
        <textarea id="bk-issue" required rows="3" placeholder="Describe the issue..."
          style="width:100%;background:#000;border:1px solid #2a1a3a;color:#EDE8DC;
                 border-radius:8px;padding:10px 14px;font-size:14px;font-family:'DM Sans',sans-serif;
                 resize:vertical;box-sizing:border-box"></textarea>
      </div>
      <div>
        <label style="font-size:12px;color:#7a6a50;display:block;margin-bottom:5px">Preferred Drop-off Date</label>
        <input id="bk-date" type="date"
          style="background:#000;border:1px solid #2a1a3a;color:#EDE8DC;
                 border-radius:8px;padding:10px 14px;font-size:14px;font-family:'DM Sans',sans-serif">
      </div>
      <button type="submit"
        style="background:#C9A000;color:#000;border:none;border-radius:8px;padding:14px 24px;
               font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;
               margin-top:4px">
        Request Repair
      </button>
      <div id="bk-status" style="font-size:13px;text-align:center;min-height:20px;font-family:'DM Sans',sans-serif"></div>
    </form>
  </div>
</section>

<script>
// ── Booking form → Firestore ────────────────────────────────────────────────
const _bkConfig = {
  apiKey: "AIzaSyD9DXFXJEudx4ODE-P1yYxAniM4jtqytJY",
  authDomain: "pixelpatcher-accounting.firebaseapp.com",
  projectId: "pixelpatcher-accounting",
};
if (!window._bkApp) {
  window._bkApp = firebase.initializeApp(_bkConfig, 'booking');
}
const _bkDb = firebase.firestore(window._bkApp);

document.getElementById('booking-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const status = document.getElementById('bk-status');
  const btn    = this.querySelector('button[type=submit]');
  const name   = document.getElementById('bk-name').value.trim();
  const phone  = document.getElementById('bk-phone').value.trim();
  const issue  = document.getElementById('bk-issue').value.trim();
  if (!name || !phone || !issue) {
    status.style.color = '#ef4444';
    status.textContent = 'Please fill in the required fields.';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Sending\u2026';
  status.textContent = '';
  try {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await _bkDb.collection('bookingRequests').doc(id).set({
      id,
      name,
      phone,
      email:         document.getElementById('bk-email').value.trim(),
      device:        document.getElementById('bk-device').value.trim(),
      issue,
      preferredDate: document.getElementById('bk-date').value || '',
      createdAt:     new Date().toISOString(),
      processed:     false,
    });
    status.style.color = '#22c55e';
    status.textContent = "\u2713 Got it! We\u2019ll reach out shortly to confirm.";
    this.reset();
  } catch(err) {
    console.error(err);
    status.style.color = '#ef4444';
    status.textContent = 'Submission failed \u2014 please call 540-300-2577.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Request Repair';
  }
});
</script>
```

**Step 4: Add "Book a Repair" link to the marketing site nav**

Find the nav links in `index.html` and add a booking link. Look for the nav element and add:
```html
<a href="#booking">Book a Repair</a>
```
(Match existing nav link styling.)

**Step 5: Verify**
- Open marketing site locally (or push and wait for Netlify deploy)
- Fill out booking form and submit
- Check Firebase Console → Firestore → bookingRequests collection — document should appear
- Try submitting with missing required fields — error message shows

**Step 6: Commit and push (triggers Netlify deploy)**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add index.html
git commit -m "feat: add Book a Repair form to marketing site, writes to Firestore bookingRequests"
git push origin main
```

---

### Task 7: Booking importer in accounting app

**Files:**
- Modify: `Accounting/PIXELPATCHER-Accounting.html`

**Step 1: Add loadBookingRequests() function**

Find:
```js
// ── Dashboard ─────────────────────────────────────────────────────────────────
```
Insert before it:
```js
// ── Booking requests importer ─────────────────────────────────────────────────
async function loadBookingRequests() {
  const user = fsauth.currentUser;
  if (!user) return;
  try {
    const snap = await fsdb.collection('bookingRequests')
      .where('processed', '==', false)
      .orderBy('createdAt', 'asc')
      .get();
    if (snap.empty) return;

    const requests = [];
    snap.forEach(doc => requests.push(doc.data()));

    // Show import banner on dashboard
    const banner = document.createElement('div');
    banner.id = 'booking-import-banner';
    banner.style.cssText = 'background:rgba(201,160,0,0.12);border:1px solid var(--accent);'
      + 'border-radius:var(--radius);padding:14px 20px;margin-bottom:20px;'
      + 'display:flex;align-items:center;justify-content:space-between;font-family:var(--font)';
    const msg = document.createElement('span');
    msg.style.cssText = 'font-size:13px;color:var(--accent)';
    msg.textContent = '\u2605 ' + requests.length + ' new booking request'
      + (requests.length > 1 ? 's' : '') + ' from the website';
    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-primary';
    importBtn.style.cssText = 'font-size:12px;padding:6px 16px';
    importBtn.textContent = 'Import as Pending Jobs';
    importBtn.addEventListener('click', () => importBookingRequests(requests));
    banner.appendChild(msg);
    banner.appendChild(importBtn);

    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
      const existing = document.getElementById('booking-import-banner');
      if (existing) existing.remove();
      dashboard.prepend(banner);
    }
  } catch(err) {
    console.warn('loadBookingRequests failed:', err);
  }
}

async function importBookingRequests(requests) {
  for (const r of requests) {
    // Create customer if needed
    const custs = DB.get('pp_customers') || [];
    let cust = custs.find(c =>
      c.phone === r.phone ||
      (c.firstName + ' ' + c.lastName).trim().toLowerCase() === r.name.toLowerCase()
    );
    if (!cust) {
      const nameParts = r.name.trim().split(' ');
      cust = {
        id: uid(), firstName: nameParts[0], lastName: nameParts.slice(1).join(' '),
        phone: r.phone, email: r.email || '', street: '', city: '', state: '', zip: '', notes: '',
      };
      DB.push('pp_customers', cust);
    }

    // Create pending job
    DB.push('pp_jobs', {
      id: uid(),
      date: r.preferredDate || today(),
      customer: r.name,
      customerId: cust.id,
      phone: r.phone,
      address: '',
      issue: r.issue,
      service: '',
      device: r.device || '',
      model: '',
      notes: 'Booked via website' + (r.email ? ' · ' + r.email : ''),
      labor: 0, parts: 0, tax: 0,
      status: 'Pending',
      paid: false,
      source: 'booking',
    });

    // Mark processed in Firestore
    await fsdb.collection('bookingRequests').doc(r.id).update({ processed: true });
  }

  // Remove banner and re-render dashboard
  const banner = document.getElementById('booking-import-banner');
  if (banner) banner.remove();
  renderDashboard();
  alert(requests.length + ' job' + (requests.length > 1 ? 's' : '') + ' imported as Pending.');
}

```

**Step 2: Call loadBookingRequests after login**

Find in `fsauth.onAuthStateChanged`:
```js
    hideSignInOverlay();
    await loadFromFirestore(user.uid);
    seedData();
    renderDashboard();
```
Replace with:
```js
    hideSignInOverlay();
    await loadFromFirestore(user.uid);
    seedData();
    renderDashboard();
    loadBookingRequests();
```

**Step 3: Verify end-to-end**
- Submit a booking on the marketing site (or write directly to Firestore console)
- Sign in to accounting app — golden banner appears: "1 new booking request from the website"
- Click "Import as Pending Jobs" — job appears in Jobs tab with status Pending
- Firestore console: bookingRequests doc now has `processed: true`
- Banner disappears after import

**Step 4: Commit**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: import website booking requests as pending jobs on login"
```

---

### Task 8: Google Analytics + Search Console

**Note:** This task requires manual steps in a browser. The plan documents what to do and where to paste the resulting IDs.

**Step 1: Create GA4 property**
1. Go to https://analytics.google.com
2. Click **Admin** (gear icon, bottom left)
3. Click **+ Create** → **Property**
4. Property name: `Pixel Patcher`, timezone: `America/New_York`, currency: `USD` → Next
5. Business details: Industry `Computers & Electronics`, size: Small → Next
6. Choose **Web** platform
7. Set up data stream:
   - First stream URL: `pixelpatcher.com`, stream name: `Pixel Patcher Marketing` → Create
   - Copy the **Measurement ID**: `G-XXXXXXXXXX` (save this)
8. Go back to Admin → Data Streams → Add stream → Web
   - URL: `pixelpatcher-accounting.web.app`, stream name: `PP Accounting` → Create
   - Copy this second **Measurement ID**: `G-YYYYYYYYYY` (save this)

**Step 2: Add GA snippet to marketing site**

Find in `index.html` the `</head>` tag and insert before it:
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
Replace `G-XXXXXXXXXX` with the actual marketing site measurement ID from Step 1.

**Step 3: Add GA snippet to accounting app**

Find in `Accounting/PIXELPATCHER-Accounting.html` the `</head>` tag and insert before it:
```html
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-YYYYYYYYYY"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-YYYYYYYYYY');
  </script>
```
Replace `G-YYYYYYYYYY` with the actual accounting app measurement ID.

**Step 4: Set up Search Console — pixelpatcher.com**
1. Go to https://search.google.com/search-console
2. Click **Add property** → choose **Domain** → enter `pixelpatcher.com`
3. Copy the TXT record value shown
4. Go to your DNS provider (wherever pixelpatcher.com DNS is managed) → add TXT record
5. Click **Verify** in Search Console

**Step 5: Set up Search Console — pixelpatcher-accounting.web.app**
1. Search Console → Add property → **URL prefix** → `https://pixelpatcher-accounting.web.app`
2. Choose **HTML tag** verification method
3. Copy the meta tag: `<meta name="google-site-verification" content="XXXXXXX">`
4. Add it to `Accounting/PIXELPATCHER-Accounting.html` in `<head>` (before other meta tags)
5. Deploy accounting app
6. Click **Verify** in Search Console

**Step 6: Commit and deploy**
```bash
cd /home/jason/Desktop/PIXELPATCHER
git add index.html Accounting/PIXELPATCHER-Accounting.html
git commit -m "feat: add Google Analytics 4 to both sites"
git push origin main

cd Accounting
npx firebase-tools@latest deploy --only hosting
```

**Step 7: Verify**
- Visit marketing site → GA4 Realtime report → should see 1 active user
- Visit accounting app → second GA4 stream Realtime → should see 1 active user

