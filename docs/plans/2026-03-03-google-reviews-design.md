# Google Reviews Carousel — Design

**Date:** 2026-03-03
**Feature:** Live Google Reviews carousel fetched from Places API, replacing placeholder cards

---

## Goal

Replace the three "Reviews coming soon" placeholder cards with a live carousel pulling real reviews from Google Places API. Filters to 4★+ only. Shows 3 cards at once on desktop, 1 on mobile, auto-rotates every 6 seconds with dot navigation.

---

## Data Source

**Google Places API (New)** — `GET https://places.googleapis.com/v1/places/{PLACE_ID}`
- Header: `X-Goog-FieldMask: reviews`
- Returns up to 5 reviews, selected by Google's algorithm
- Filtered client-side to rating >= 4

---

## API Setup (one-time manual)

1. Enable **Places API (New)** in Google Cloud Console (same project as Firebase)
2. Create API key restricted to: HTTP referrers (pixelpatcher domain) + Places API (New) only
3. Find Place ID via Google's Place ID Finder tool

---

## Carousel Behavior

- 3 cards visible at once on desktop (1 on mobile via media query)
- Rotating sets: [0,1,2] → [1,2,3] → [2,3,0] → ...
- Fade transition between sets (CSS opacity, 300ms)
- Auto-advances every 6 seconds
- Dot indicators below — one dot per review, clickable, clicking resets timer
- Only auto-rotates if there are more than 3 reviews

---

## Review Card

- ★ stars in gold (filled count + empty count)
- Review text truncated at 200 chars with ellipsis
- Reviewer name + profile photo (hidden if photo fails to load)
- Relative date ("2 weeks ago")
- Small Google logo in top-right corner

---

## Fallback

If the API call fails or returns 0 qualifying reviews, the entire `#reviews` section is hidden with `display:none`. No broken UI, no console errors shown to users.

---

## Out of Scope (v1)

- "Read more" expansion for long reviews
- Manual review override/curation
- Caching reviews to avoid API calls on every load
- Star rating aggregate display
