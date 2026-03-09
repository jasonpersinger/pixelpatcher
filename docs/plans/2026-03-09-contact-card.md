# Contact Card Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A branded `/card` page at pixelpatcher.com/card with a downloadable vCard, suitable for NFC tags and direct sharing.

**Architecture:** Two static files added to the repo root — `pixelpatcher.vcf` (vCard 3.0) and `card.html` (standalone branded page). Netlify auto-deploys both on `git push origin main`. No routing config needed.

**Tech Stack:** Static HTML/CSS, vCard 3.0, Netlify hosting.

**Brand tokens (from `index.html`):**
- `--black: #000000`, `--gold: #C9A000`, `--purple: #4B2A8C`, `--white: #ffffff`, `--gray: #aaaaaa`
- Fonts: `Press Start 2P` (pixel headings), `DM Sans` (body)
- CDN: `https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;500;700&display=swap`

---

### Task 1: Create `pixelpatcher.vcf`

**Files:**
- Create: `pixelpatcher.vcf` (repo root)

**Step 1: Create the file with this exact content**

```
BEGIN:VCARD
VERSION:3.0
FN:Jason Persinger
N:Persinger;Jason;;;
ORG:Pixel Patcher
TITLE:Owner / Technician
TEL;TYPE=CELL:540-300-2577
EMAIL;TYPE=WORK:jason@pixelpatcher.com
ADR;TYPE=WORK:;;709 Marshall Ave SW #A;Roanoke;VA;24016;USA
URL:https://www.pixelpatcher.com
X-SOCIALPROFILE;type=instagram:https://www.instagram.com/pixelpatcher540
END:VCARD
```

**Step 2: Verify the file**

Open `pixelpatcher.vcf` in a text editor and confirm all fields look correct.

**Step 3: Commit**

```bash
git add pixelpatcher.vcf
git commit -m "feat: add pixelpatcher vCard file"
```

---

### Task 2: Create `card.html`

**Files:**
- Create: `card.html` (repo root)

**Step 1: Create the file**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jason Persinger — Pixel Patcher</title>
  <meta name="description" content="Contact card for Jason Persinger, Owner of Pixel Patcher PC Repair in Roanoke, VA.">
  <link rel="icon" type="image/png" href="Branding/logoblack.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --black:      #000000;
      --gold:       #C9A000;
      --purple:     #4B2A8C;
      --white:      #ffffff;
      --gray:       #aaaaaa;
      --dim:        rgba(201,160,0,0.25);
      --font-pixel: 'Press Start 2P', monospace;
      --font-body:  'DM Sans', sans-serif;
    }

    body {
      background: var(--black);
      color: var(--white);
      font-family: var(--font-body);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }

    .card {
      max-width: 420px;
      width: 100%;
      text-align: center;
    }

    .logo {
      width: 200px;
      height: auto;
      margin: 0 auto 20px;
      display: block;
    }

    .avatar-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }

    .avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: 3px solid var(--gold);
      object-fit: cover;
    }

    .name {
      font-family: var(--font-pixel);
      font-size: 13px;
      color: var(--gold);
      margin-bottom: 6px;
      line-height: 1.6;
    }

    .title {
      font-size: 14px;
      color: var(--gray);
      margin-bottom: 28px;
    }

    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, var(--gold), transparent);
      margin-bottom: 24px;
    }

    .contact-list {
      list-style: none;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 32px;
    }

    .contact-list li a,
    .contact-list li span {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      color: var(--white);
      text-decoration: none;
      font-size: 15px;
      line-height: 1.5;
      transition: color 0.2s;
    }

    .contact-list li a:hover { color: var(--gold); }

    .icon {
      font-size: 18px;
      flex-shrink: 0;
      width: 24px;
      text-align: center;
      margin-top: 1px;
    }

    .save-btn {
      display: inline-block;
      width: 100%;
      padding: 14px 24px;
      background: var(--gold);
      color: var(--black);
      font-family: var(--font-pixel);
      font-size: 10px;
      text-decoration: none;
      border-radius: 6px;
      letter-spacing: 0.05em;
      transition: opacity 0.2s;
    }

    .save-btn:hover { opacity: 0.85; }

    .back-link {
      display: block;
      margin-top: 20px;
      font-size: 12px;
      color: var(--gray);
      text-decoration: none;
    }

    .back-link:hover { color: var(--gold); }
  </style>
</head>
<body>
  <div class="card">
    <img src="Branding/logoblack_gold.png" alt="Pixel Patcher" class="logo">

    <div class="avatar-wrap">
      <img src="Branding/jasonlogoprofile.jpeg" alt="Jason Persinger" class="avatar">
    </div>

    <h1 class="name">Jason Persinger</h1>
    <p class="title">Owner / Technician &middot; Pixel Patcher</p>

    <div class="divider"></div>

    <ul class="contact-list">
      <li>
        <a href="tel:5403002577">
          <span class="icon">📞</span>
          <span>(540) 300-2577</span>
        </a>
      </li>
      <li>
        <a href="mailto:jason@pixelpatcher.com">
          <span class="icon">✉️</span>
          <span>jason@pixelpatcher.com</span>
        </a>
      </li>
      <li>
        <span>
          <span class="icon">📍</span>
          <span>709 Marshall Ave SW #A<br>Roanoke, VA 24016</span>
        </span>
      </li>
      <li>
        <a href="https://www.pixelpatcher.com">
          <span class="icon">🌐</span>
          <span>pixelpatcher.com</span>
        </a>
      </li>
      <li>
        <a href="https://www.instagram.com/pixelpatcher540" target="_blank" rel="noopener">
          <span class="icon">📸</span>
          <span>@pixelpatcher540</span>
        </a>
      </li>
    </ul>

    <a href="pixelpatcher.vcf" download="Jason Persinger - Pixel Patcher.vcf" class="save-btn">
      Save Contact
    </a>

    <a href="https://www.pixelpatcher.com" class="back-link">pixelpatcher.com</a>
  </div>
</body>
</html>
```

**Step 2: Commit**

```bash
git add card.html
git commit -m "feat: add branded contact card page"
```

---

### Task 3: Deploy and verify

**Step 1: Push to Netlify**

```bash
git push origin main
```

Netlify auto-deploys. Wait ~30 seconds.

**Step 2: Verify**

- [ ] Open https://www.pixelpatcher.com/card — page loads with logo, photo, contact rows, Save Contact button
- [ ] Click "Save Contact" — downloads `Jason Persinger - Pixel Patcher.vcf`
- [ ] Import the .vcf into phone contacts — all fields populate correctly
- [ ] Phone number, email, and website links are tappable on mobile
- [ ] Instagram link opens @pixelpatcher540

**Step 3: Final commit if any tweaks made**

```bash
git add -A
git commit -m "fix: contact card tweaks"
git push origin main
```
