# Remote Support Page -- Design Spec

**Date:** 2026-03-11
**Status:** Approved

## Overview

A standalone remote support landing page hosted at `remote.pixelpatcher.com` that lets
tech-illiterate customers download a pre-configured RustDesk client and get connected
to Pixel Patcher for remote support. A button/link on the main site also points to it.

## URLs and Hosting

- **Remote support page:** `remote.pixelpatcher.com` (Netlify subdomain, same repo/deploy pipeline as main site)
- **Main site:** `pixelpatcher.com` (Netlify, `Branding/index.html`)
- **RustDesk server:** `desk.pixelpatcher.com` (self-hosted on home machine, separate from this page)

## Files

- `Branding/remote/index.html` -- the remote support page
- `Branding/remote/PixelPatcherRemoteSupport.zip` -- pre-configured RustDesk exe + config (moved from repo root)
- `Branding/netlify.toml` -- rewrite rule so `remote.pixelpatcher.com` serves `/remote/index.html`

**Logo:** Use `logoblack_color.png` (same as main site nav).
**Download href:** `PixelPatcherRemoteSupport.zip` (relative path, same directory as `index.html`).

## Page Design

**Layout:** Single column, full-width scroll. Works on mobile and desktop.

**Brand:** Matches main site -- black background, gold (#C9A000), purple (#4B2A8C),
Press Start 2P pixel font for headings/buttons, DM Sans for body text.

**Structure:**
1. Sticky nav -- Pixel Patcher logo on the left
2. Hero section:
   - Headline: "Remote Support"
   - Subheadline: "We can fix your computer without leaving your home."
   - Gold CTA button: "DOWNLOAD SUPPORT TOOL" (links to zip file)
   - Reassurance text: "Windows only · Free · Safe to remove after your session"
3. Three numbered steps (purple cards):
   - Step 1: Download and run the support tool above
   - Step 2: You will see a 9-digit number on screen
   - Step 3: Text or call us that number at 540-300-2577
4. Footer with phone number

## Main Site Integration

- Add "Remote Support" link to nav in `Branding/index.html`
- Add a remote support section near the bottom of the main page with a button linking to `remote.pixelpatcher.com`

## Netlify Configuration

1. Add `remote.pixelpatcher.com` as a custom domain on the Netlify site.
2. Add a DNS CNAME record pointing `remote.pixelpatcher.com` to the Netlify site URL.
3. Add a rewrite rule in `Branding/netlify.toml` so requests to `remote.pixelpatcher.com`
   are served `/remote/index.html` rather than the root.
4. Nav links to `remote.pixelpatcher.com` open in the same tab (not `target="_blank"`).

## Out of Scope

- macOS/Linux support (Windows only for now)
- Session request forms or email/text triggers
- README inside the zip file
