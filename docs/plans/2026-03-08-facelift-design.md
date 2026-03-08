# Accounting App Facelift Design — 2026-03-08

## Goal
Visual refresh of the accounting app: slim pixel banner strip at top, real logo in sidebar, purple as a proper UI accent color, and mobile-responsive layout with hamburger navigation.

## Assets
- `Accounting/pixelpatcher_header_chunky.png` — wide pixel noise banner (purple/gold/black/white)
- `Accounting/logoblack_gold.png` — gold pixel-art retro computer logo on black
- `Accounting/pixelpatcherLOGO.png` — already used on invoice (keep as-is)

## Layout

### Top Banner Strip
- Full-width, 48px tall, fixed at top
- `background-image: url('pixelpatcher_header_chunky.png')`, `background-size: cover`
- Sits above both sidebar and main content
- On mobile: contains hamburger button (left) + optional site name (right)

### App body
- Wrapper div takes `height: calc(100vh - 48px)`, `display: flex`
- Sidebar + main content fill this space

## Color Changes

| Variable | Old | New | Notes |
|---|---|---|---|
| `--sidebar` | `#0a0a0a` | `#0d0a12` | Subtle purple tint |
| `--border` | `#2a2410` | `#2a1a3a` | Purple-tinted border |
| `--warning` → `--purple` | `#4B2A8C` | `#4B2A8C` | Rename var, keep value |
| Active nav bg | gold (`--accent`) | `--purple` | Purple bg, gold text |
| Active nav color | `#000` | `var(--accent)` | Gold text on purple |

All other colors unchanged: `--bg`, `--card`, `--accent`, `--positive`, `--negative`, `--text`, `--muted`.

## Sidebar Logo
- Remove: `<div class="logo">■ PIXEL PATCHER</div>`
- Add: `<img src="logoblack_gold.png">` at ~56px height, full width, object-fit contain
- Keep some bottom margin before nav

## Mobile Responsive (breakpoint: 768px)

### Hamburger button
- Fixed in banner strip, top-left, on mobile only
- `☰` character, styled to match brand
- Toggles sidebar open/closed

### Sidebar on mobile
- `position: fixed; top: 48px; left: 0; height: calc(100vh - 48px); z-index: 200`
- Default: `transform: translateX(-185px)`
- Open: `transform: translateX(0)`
- Transition: `transform 0.2s ease`
- Backdrop: semi-transparent overlay behind sidebar, click to close

### Main content on mobile
- `width: 100%`, `padding: 20px 16px`
- Tables already have `overflow-x: auto` — fine as-is
- KPI grids: `grid-template-columns: repeat(2, 1fr) !important` max
- Single-column KPI grids stay single column

### Nav items on mobile
- Clicking any nav item closes the sidebar automatically

## CSS Implementation Notes
- All changes in the `<style>` block and sidebar HTML
- Add `@media (max-width: 768px)` block at bottom of styles
- Add `id="hamburger"` button to banner strip (hidden on desktop, visible on mobile)
- Add `id="sidebar-backdrop"` div (hidden by default, shown when sidebar open)
- JS: `toggleSidebar()` function, nav buttons call it on mobile

