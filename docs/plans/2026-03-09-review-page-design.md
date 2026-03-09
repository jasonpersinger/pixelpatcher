# Google Review Page — Design Doc

## Goal
A branded `/review` page at pixelpatcher.com/review that bridges customers to the Google review form with a warm, personal message.

## File
- `review.html` — standalone branded page (repo root, deployed by Netlify)

## Layout
Mobile-first single-column page matching existing site aesthetics (dark bg, gold accents, Press Start 2P / DM Sans fonts).

Structure top to bottom:
1. Logo (`Branding/pixelpatcherLOGO.png`) — centered at top
2. Heading: "Enjoying your repair?"
3. Message: "It only takes 30 seconds and means the world to a small business."
4. Gold **"Leave a Review ⭐"** button → Google review URL (opens in same tab)
5. Small back link to pixelpatcher.com

## Google Review URL
```
https://search.google.com/local/writereview?placeid=ChIJ3TP7T08NTYgRYO4cYbmwsdU
```

## Deployment
Netlify auto-deploys on `git push origin main`.
