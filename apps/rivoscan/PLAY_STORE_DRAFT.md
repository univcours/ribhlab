# Google Play listing draft — RivoScan

Store title: **RivoScan: PDF Scanner & Editor** (verify current 30-character listing limit and actual length)

Short description: **Scan, merge, sign, edit & convert PDFs on your phone. Private by design.**

Long description:

Meet RivoScan, the simple, private PDF toolkit for everyday work and study. Capture documents with your camera, combine pages into professional PDFs, merge and split existing files, annotate, rotate, reorder, add page numbers, apply a watermark, and draw signatures.

Convert PDF pages to JPG or PNG, extract text from digital documents, or use OCR to recognize scanned text in supported languages. Core editing works locally on your device, without requiring an account. OCR may require a language-pack download on first use.

Please note: scanned-PDF compression can flatten pages and remove searchable text. Handwritten signatures are visual signatures, not certificate-backed e-signatures. Some advanced PDF documents may not be supported.

Before submission: verify store listing claims against device tests, app capabilities, policy declarations and region-specific rules.


## Google Play release build (not published)
- New workflow rivoscan-play-aab.yml compiles a release AAB for inspection.
- Without private signing secrets it remains UNSIGNED and NOT Play-ready.
- Optional signing requires repository Secrets RIVOSCAN_PLAY_KEYSTORE_B64, RIVOSCAN_PLAY_KEY_ALIAS, RIVOSCAN_PLAY_STORE_PASSWORD and RIVOSCAN_PLAY_KEY_PASSWORD.
- Never commit upload keys or publish PDFs. Real phone QA, privacy policy, Data Safety, screenshots and Play Console internal testing remain necessary.
