# RivoScan 0.45.26 — symbol-only Android launcher

The user-approved AI artwork is a blue R, white document and cyan scan line, with **no wordmark**. The launcher image and Play Store listing use different exported crops.

- `scripts/create-turquoise-icon.mjs` imports the user-approved source from Picsart and caches it at `assets/branding/rivoscan-ai-icon-source.png`.
- `public/rivoscan-icon.png` is full-bleed for Web and legacy devices.
- `public/rivoscan-store-icon.png` is 512×512 full-bleed store icon.
- `public/rivoscan-adaptive-foreground.png` is a centred image with a transparent margin for Android adaptive masks.
- The background of Android's adaptive launcher is blue (#0B54C4).

Previous full-logo source retained as provenance but never used as launcher.
