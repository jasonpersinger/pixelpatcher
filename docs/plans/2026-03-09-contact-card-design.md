# Contact Card Page — Design Doc

## Goal
A branded `/card` page at pixelpatcher.com/card serving as a digital business card for NFC tags, QR codes, and direct sharing. Includes a downloadable vCard file.

## Files
- `card.html` — standalone branded contact page (repo root, deployed by Netlify)
- `pixelpatcher.vcf` — static vCard 3.0 file (repo root)

## card.html Layout
Mobile-first single-column page matching existing site aesthetics (dark bg, gold accents, Press Start 2P / DM Sans fonts from existing CDN link).

Structure top to bottom:
1. Logo (`Branding/logoblack_gold.png`) — centered, large hero image
2. Jason's photo (`Branding/jasonlogoprofile.jpeg`) — small circular headshot below logo
3. Name: **Jason Persinger**
4. Title: Owner / Technician · Pixel Patcher
5. Contact rows with icons: phone, email, address, website, Instagram
6. **"Save Contact"** button — downloads `pixelpatcher.vcf`

## pixelpatcher.vcf
vCard 3.0 format. Fields:
- FN / N: Jason Persinger
- ORG: Pixel Patcher
- TITLE: Owner / Technician
- TEL: 540-300-2577
- EMAIL: jason@pixelpatcher.com
- ADR: 709 Marshall Ave SW #A, Roanoke, VA 24016
- URL: https://www.pixelpatcher.com
- X-SOCIALPROFILE (Instagram): https://www.instagram.com/pixelpatcher540

## Contact Info
- Phone: 540-300-2577
- Email: jason@pixelpatcher.com
- Address: 709 Marshall Ave SW #A, Roanoke, VA 24016
- Website: pixelpatcher.com
- Instagram: instagram.com/pixelpatcher540

## Deployment
Netlify auto-deploys on `git push origin main`. No config changes needed — new files in repo root are served automatically.
