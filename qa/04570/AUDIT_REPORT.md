# RivoScan v0.45.70 - QA evidence
Source ref: fix/rivoscan-04570-final-qa

## Genuine UI screenshots from the running RivoScan frontend
The PNGs were captured from actual RivoScan v0.45.70 HTML/CSS/JS
running in Chrome mobile emulation through Puppeteer. They are NOT
AI-generated artwork or mockups. The QR/Plate camera rectangles are
a Chrome SIMULATED device feed. These are NOT Android hardware camera
screenshots, nor real live AdMob creatives.

## Changes
- Both scanners retain 50/50 camera/results split on portrait screens.
- QR/Barcode results show timestamps and actual saved / already saved / failed state.
- Plate scanner has copyable live and history results with timestamps.
- Plate watchlist no longer generates extra JPEG files on a match; existing TXT ledger remains.
- Book Scan Save PDF footer remains inside modal at 320 / 393 / 412px.
- Home card titles fit, Plate tile has a distinct warm orange design.
- ID Photo has one camera, central Import and disabled directional buttons.
- Native 320x50 banner with 3dp nav gap and Interstitial only is unchanged.

## QA scope and limitations
- Baseline 0.45.69: 370 automated source tests passed.
- Browser audit: 320 / 360 / 393 / 412 mobile viewport widths.
- Full modal sweep: 54 tool launches, 30 genuine dialogs, zero detected overflow,
  zero captured JavaScript errors in these flows.
- Physical Android camera focus/zoom, native AdMob serving, real device install
  and original signing key CANNOT be proven from these Chrome screenshots.
- Original-key signature verification is performed by the GitHub Actions pipeline.
- DO NOT publish to Play automatically.
