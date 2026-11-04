# RivoScan PerfectScan Pro — Android beta 0.40.0

## Delivered in code
- One-tap entry from Home and existing-image editor; up to three additional phone-camera or gallery shots.
- Local gradient-aligned registration of the same printed page (maximum ±22 pixels), explicit rejection when alignment confidence is low.
- Non-destructive paper-tone and wrinkle-shadow correction with conservative pixel fusion; preservation of dark ink, colored stamps and handwritten signatures; optional confidence-gated printed-text 2D dewarping.
- Full-screen original / enhanced compare, mandatory human review before save.
- Export new JPG image and integrity JSON with SHA-256 hashes of original and added shots and processed image (where browser WebCrypto is available), alignment diagnostics, document alteration warnings. Newly imported originals saved unchanged.
- Direct Google ML Kit FULL Deep Clean entry opens Google's on-device editor with user-controlled gallery import. The local 2D PerfectScan engine and ML Kit workflow are distinct; they are not the same process.
- Premium Comfort UI, selectable photos with Share and Delete side by side, local privacy, 7 languages. All Pro/paywall/billing gates still OFF for field testing.

## Technical limitations
- The implemented remap is a guarded 2D line correction, not true 3D physical page reconstruction. Hidden text, severe folds, and missing ink cannot be recovered reliably.
- Translation-only matching works on nearly registered shots of the same paper. Different pages and major perspective/rotation differences are rejected rather than fabricated.
- On-device PerfectScan fusion is bounded to about 4.8 megapixels for WebView memory safety. Native CameraX and ML Kit may produce larger photos separately.
- Hash and contrast diagnostics do not establish certified legal authenticity; human review is required.
- UVDoc and UVDoc_onnx (PaddlePaddle; Apache-2.0) are not bundled or running in the Android APK. Their Android runtime, model preprocessing, licensing/dependencies and device memory must be validated before enabling. Do not advertise UVDoc or true 3D as implemented.

## Device QA required before release
- Capture one strongly folded real paper, compare with source and verify no made-up strokes.
- Capture 2–4 shots of the same paper under changing light and confirm aligned frames, legible signatures, stamp color.
- Add another document as a second shot: it must be rejected without mixing content.
- Verify generated source, JPG and JSON are separate in Documents/RivoScan.
- Verify camera/gallery chooser and ML Kit FULL behavior on Samsung SM-S908B.
- Install in place and confirm previous documents and app settings remain. Do not uninstall due to signing mismatch.

## Sources
- https://developers.google.com/ml-kit/vision/doc-scanner
- https://huggingface.co/PaddlePaddle/UVDoc_onnx
- https://www.paddleocr.ai/latest/en/version3.x/module_usage/text_image_unwarping.html
