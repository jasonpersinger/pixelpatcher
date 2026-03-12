# holler.works — Design Spec
**Date:** 2026-03-12
**Status:** Approved

---

## Overview

A community-driven tech job and skills board for Appalachia. People post either "I need X" or "I can offer X." The board connects them. No accounts, no fluff — utilitarian by design.

**Domain:** holler.works
**Tagline:** // tech jobs & skills — appalachia

---

## Goals

- Low barrier to post — just a form, no account required
- Compensation required on every listing — no ghost posts
- Moderated — all posts approved before going live
- Lightweight — single HTML file, no frameworks, fast on any connection
- Aesthetic — monospace fonts, ASCII art accents, rust/brown/gray on black

---

## Tech Stack

- **Frontend:** Single HTML file (no build step, no framework)
- **Backend:** Firebase Firestore (posts collection)
- **Auth:** Simple admin password for `/admin` view (no user accounts)
- **Email:** Firebase Cloud Functions + Trigger Email extension (same setup as Pixel Patcher CRM)
- **Hosting:** Netlify, own repo, connected to holler.works domain
- **Routing:** Hash-based (`#/`, `#/post/:id`, `#/submit`, `#/admin`)

---

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Black | `#0e0e0e` | Background |
| Rust | `#C1440E` | Primary accent, [need] posts, links |
| Brown | `#5C3D2E` | Secondary accent, [offer] posts, muted text |
| Gray | `#888888` | Body text, metadata |
| Light gray | `#cccccc` | Post titles, headings |

**Font:** Courier New / monospace stack throughout. No external font loading.

---

## Layout — Left Rail (Layout C)

```
+------------------+----------------------------------------+
|  HOLLER.WORKS    |                                        |
|  // appalachia   |  > need: wordpress dev for biz site    |
|                  |  software & dev · roanoke · $paid      |
|  browse          |                                        |
|  > all posts     |  > offer: IT support / home network    |
|  > [need]        |  IT & support · morgantown · negotiate |
|  > [offer]       |                                        |
|                  |  > need: remote data entry help        |
|  category        |  admin & ops · remote · $paid          |
|  > dev           |                                        |
|  > IT & support  |                                        |
|  > data & AI     |                                        |
|  > design & UX   |                                        |
|  > admin & ops   |                                        |
|  > finance       |                                        |
|  > HR            |                                        |
|  > marketing     |                                        |
|  > remote-friendly|                                       |
|  > other         |                                        |
|                  |                                        |
|  [+ post]        |                                        |
+------------------+----------------------------------------+
```

---

## Views

### `#/` — Main Board
- Left rail: browse filters (all / need / offer), category list, `[+ post]` link
- Right: paginated list of approved posts, sorted newest first
- Each post row: title, type badge, category, location, compensation
- Clicking a row goes to `#/post/:id`

### `#/post/:id` — Post Detail
- Full post: title, type, category, location, compensation, description, contact info
- Back link to board
- No comments, no replies — contact is direct

### `#/submit` — Submit a Post
Form fields (all required except description):
- Type: need / offer (radio)
- Title (text, max 80 chars)
- Category (select, fixed list + other)
- Location (text — town/county or "remote")
- Compensation (text — required, e.g. "$25/hr", "trade", "volunteer")
- Description (textarea, max 500 chars)
- Contact (text — email or URL)

On submit: saved to Firestore with `status: pending`, Cloud Function sends email notification to admin.

### `#/admin` — Admin Queue
- Password prompt on load (hardcoded env-style constant in JS)
- Lists all `pending` posts, newest first
- Each post shows full detail + Approve / Reject buttons
- Approve sets `status: approved` → post appears on board
- Reject sets `status: rejected` → post removed from queue
- No pagination needed at launch

---

## Data Model

### `posts` collection (Firestore)

```
{
  id:           auto,
  type:         "need" | "offer",
  title:        string (max 80),
  category:     string (from fixed list),
  location:     string,
  compensation: string,
  description:  string (max 500),
  contact:      string,
  status:       "pending" | "approved" | "rejected",
  createdAt:    timestamp
}
```

---

## Email Notifications

**On new submission (to admin):**
- Subject: `[holler.works] new post pending approval`
- Body: post title, type, category, link to `/admin`

**No emails to submitters** at launch — keep it simple.

---

## Categories (fixed list)

1. Software & Dev
2. IT & Support
3. Data & AI
4. Design & UX
5. Admin & Operations
6. Finance & Accounting
7. HR & Recruiting
8. Marketing & Content
9. Remote-Friendly
10. Other

---

## Out of Scope (v1)

- User accounts / profiles
- Search
- Email submitter on approval/rejection
- RSS feed
- Paid listings
- Mobile app
