# Google Reviews Carousel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the three "Reviews coming soon" placeholder cards in index.html with a live carousel pulling 4★+ reviews from the Google Places API.

**Architecture:** Client-side JS fetches from Places API (New) on page load. Reviews filtered to 4+ stars, rendered into a 3-card grid that fades between sets every 6 seconds. Dot indicators sync with current position. Falls back to hiding the section on any error.

**Tech Stack:** Vanilla JS, CSS transitions, Google Places API (New). Output file: `/home/jason/Desktop/PIXELPATCHER/index.html`.

---

## Task 1: Get Place ID and API Key (Manual Setup)

No code changes in this task — just gather the two values needed for Task 2.

**Step 1: Find your Place ID**

Go to: https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder

Search for "Pixel Patcher" and select your listing. Copy the Place ID — it starts with `ChIJ...`.

**Step 2: Enable Places API (New)**

1. Go to https://console.cloud.google.com → select your Firebase project (`pixelpatcher-accounting`)
2. APIs & Services → Library → search "Places API (New)" → Enable

**Step 3: Create a restricted API key**

1. APIs & Services → Credentials → + Create Credentials → API key
2. Click the new key → Edit
3. Under **Application restrictions**: select "Websites" → add `https://pixelpatcher.com/*` and `https://www.pixelpatcher.com/*`
4. Under **API restrictions**: select "Restrict key" → pick "Places API (New)"
5. Save

**Step 4: Note both values**

```
PLACE_ID = ChIJ...          (from Step 1)
API_KEY  = AIzaSy...        (from Step 3)
```

You'll paste these into the code in Task 2.

---

## Task 2: Update CSS

**File:** Modify `/home/jason/Desktop/PIXELPATCHER/index.html`

**Step 1: Replace `.review-placeholder` styles**

Find:
```css
    .review-placeholder {
      border: 1px dashed rgba(201,160,0,0.2);
      padding: 1.5rem;
      text-align: center;
      color: rgba(255,255,255,0.15);
      font-size: 0.85rem;
    }
```

Replace with:
```css
    .reviews-grid {
      transition: opacity 0.3s ease;
    }
    .reviews-grid.fading {
      opacity: 0;
    }
    .review-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(201,160,0,0.15);
      border-radius: 8px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .review-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .review-stars .stars-filled { color: var(--gold); font-size: 1rem; }
    .review-stars .stars-empty  { color: rgba(255,255,255,0.15); font-size: 1rem; }
    .google-logo { width: 18px; height: 18px; opacity: 0.6; }
    .review-text {
      font-size: 0.875rem;
      color: rgba(255,255,255,0.75);
      line-height: 1.6;
      flex: 1;
      margin: 0;
    }
    .review-author {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-top: auto;
    }
    .review-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
    .review-name  { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.9); }
    .review-date  { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
    .reviews-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 1.5rem;
    }
    .review-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.2);
      cursor: pointer;
      padding: 0;
      transition: background 0.2s;
    }
    .review-dot.active { background: var(--gold); }
    @media (max-width: 600px) {
      .reviews-grid { grid-template-columns: 1fr !important; }
    }
```

**Step 2: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add index.html
git commit -m "style: add review card and carousel CSS"
```

---

## Task 3: Replace HTML and Add JS

**File:** Modify `/home/jason/Desktop/PIXELPATCHER/index.html`

**Step 1: Replace the reviews-grid HTML**

Find:
```html
      <div class="reviews-grid">
        <div class="review-placeholder">★★★★★<br><br>Reviews coming soon</div>
        <div class="review-placeholder">★★★★★<br><br>Reviews coming soon</div>
        <div class="review-placeholder">★★★★★<br><br>Reviews coming soon</div>
      </div>
```

Replace with:
```html
      <div class="reviews-grid" id="reviews-grid"></div>
      <div class="reviews-dots" id="reviews-dots"></div>
```

**Step 2: Add the JS block before `</body>`**

Find `</body>` and insert immediately before it:

```html
<script>
(function () {
  var PLACE_ID   = 'REPLACE_WITH_YOUR_PLACE_ID';
  var API_KEY    = 'REPLACE_WITH_YOUR_API_KEY';
  var MIN_RATING = 4;
  var VISIBLE    = 3;
  var ROTATE_MS  = 6000;

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stars(n) {
    return '<span class="stars-filled">' + '\u2605'.repeat(n) + '</span>'
         + '<span class="stars-empty">'  + '\u2605'.repeat(5 - n) + '</span>';
  }

  function truncate(text, max) {
    if (!text || text.length <= max) return text || '';
    return text.slice(0, max).trimEnd() + '\u2026';
  }

  function buildCard(r) {
    var name  = escHtml((r.authorAttribution && r.authorAttribution.displayName) || 'Anonymous');
    var photo = (r.authorAttribution && r.authorAttribution.photoUri) || '';
    var text  = escHtml(truncate((r.text && r.text.text) || '', 200));
    var date  = escHtml(r.relativePublishTimeDescription || '');
    return '<div class="review-card">'
      + '<div class="review-top">'
      + '<div class="review-stars">' + stars(r.rating) + '</div>'
      + '<img class="google-logo" src="https://www.gstatic.com/images/branding/product/1x/googleg_16dp.png" alt="Google">'
      + '</div>'
      + '<p class="review-text">' + text + '</p>'
      + '<div class="review-author">'
      + (photo ? '<img class="review-avatar" src="' + escHtml(photo) + '" alt="' + name + '" onerror="this.style.display=\'none\'">' : '')
      + '<div><div class="review-name">' + name + '</div>'
      + '<div class="review-date">' + date + '</div></div>'
      + '</div></div>';
  }

  function initCarousel(reviews) {
    var grid   = document.getElementById('reviews-grid');
    var dotsEl = document.getElementById('reviews-dots');
    var n      = reviews.length;
    var current = 0;
    var timer;

    if (!grid) return;

    // Build dots
    if (dotsEl) {
      dotsEl.innerHTML = reviews.map(function (_, i) {
        return '<button class="review-dot' + (i === 0 ? ' active' : '')
          + '" data-i="' + i + '" aria-label="Review ' + (i + 1) + '"></button>';
      }).join('');
      dotsEl.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.review-dot');
        if (!btn) return;
        goTo(parseInt(btn.getAttribute('data-i'), 10));
        resetTimer();
      });
    }

    function updateDots() {
      if (!dotsEl) return;
      var dots = dotsEl.querySelectorAll('.review-dot');
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === current);
      });
    }

    function render(idx, animate) {
      var visible = [0, 1, 2].map(function (offset) {
        return reviews[(idx + offset) % n];
      });
      if (animate) {
        grid.classList.add('fading');
        setTimeout(function () {
          grid.innerHTML = visible.map(buildCard).join('');
          grid.classList.remove('fading');
        }, 300);
      } else {
        grid.innerHTML = visible.map(buildCard).join('');
      }
    }

    function goTo(idx) {
      current = ((idx % n) + n) % n;
      render(current, true);
      updateDots();
    }

    function advance() { goTo(current + 1); }

    function resetTimer() {
      clearInterval(timer);
      if (n > VISIBLE) timer = setInterval(advance, ROTATE_MS);
    }

    render(0, false);
    resetTimer();
  }

  fetch('https://places.googleapis.com/v1/places/' + PLACE_ID, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'reviews'
    }
  })
  .then(function (res) { return res.json(); })
  .then(function (data) {
    var reviews = (data.reviews || []).filter(function (r) { return r.rating >= MIN_RATING; });
    if (reviews.length === 0) {
      var sec = document.getElementById('reviews');
      if (sec) sec.style.display = 'none';
      return;
    }
    initCarousel(reviews);
  })
  .catch(function () {
    var sec = document.getElementById('reviews');
    if (sec) sec.style.display = 'none';
  });
})();
</script>
```

**Step 3: Fill in your credentials**

In the newly added script block, replace:
- `'REPLACE_WITH_YOUR_PLACE_ID'` → your Place ID from Task 1 (e.g. `'ChIJabc123...'`)
- `'REPLACE_WITH_YOUR_API_KEY'` → your API key from Task 1 (e.g. `'AIzaSy...'`)

**Step 4: Verify locally**

Open a terminal and serve the file:
```bash
cd /home/jason/Desktop/PIXELPATCHER
python3 -m http.server 8080
```

Open http://localhost:8080 in browser. Open DevTools → Network → look for the `places.googleapis.com` request.

- [ ] Request returns 200 with review data
- [ ] Review cards appear in the grid (not placeholder text)
- [ ] Stars display in gold
- [ ] Dot indicators appear below
- [ ] Cards fade-rotate every 6 seconds (if more than 3 reviews)
- [ ] Dots update to match current position

**Step 5: Commit**

```bash
cd /home/jason/Desktop/PIXELPATCHER
git add index.html
git commit -m "feat: add live Google Reviews carousel via Places API"
```

---

## Task 4: Deploy

**Step 1: Push to git (triggers any hosting deploy) or deploy manually**

If the website is hosted via Firebase Hosting:
```bash
cd /home/jason/Desktop/PIXELPATCHER
npx firebase-tools@latest deploy --only hosting
```

If hosted elsewhere (Netlify, GitHub Pages, etc.), push to the main branch:
```bash
git push origin main
```

**Step 2: Verify on live site**

Open https://pixelpatcher.com (or wherever the site is hosted):

- [ ] Reviews section shows real cards (not placeholders)
- [ ] Stars, name, date, text all display correctly
- [ ] Auto-rotation works
- [ ] On mobile: single card layout
- [ ] DevTools Console: no errors

---

## Final Checklist

- [ ] Place ID obtained from Place ID Finder tool
- [ ] API key created and restricted to domain + Places API (New)
- [ ] `.review-placeholder` CSS replaced with `.review-card` and carousel styles
- [ ] Reviews grid HTML replaced with `id="reviews-grid"` container
- [ ] JS block added before `</body>` with correct Place ID and API key
- [ ] Carousel rotates through sets of 3
- [ ] Dots sync with current set
- [ ] Falls back to hiding section on error
- [ ] Live site verified
