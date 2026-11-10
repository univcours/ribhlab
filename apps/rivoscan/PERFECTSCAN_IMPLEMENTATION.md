# RivoScan PerfectScan Pro 0.41.0 — Native UVDoc ONNX and relative 3D mesh (field beta)

## Delivered Android integration
- **Real native UVDoc neural correction**: official PaddlePaddle/UVDoc_onnx inference.onnx (31,684,150 bytes, Apache-2.0) is downloaded at Android build time; its SHA-256 is pinned to 54cab30dc2cf347b4f3d6971c833b1c3d84f5ef17280f1f6d15796bff20e63d6. The verified model is bundled in Android assets and verified again before loading. ONNX Runtime Android 1.31.1 uses the official BGR/255 float32 NCHW preprocessing and rectified-image output. No document photos leave the phone.
- **Native multi-shot relative 3D reconstruction**: 2–4 source photos of one physical page. OpenCV ORB feature matching, essential-matrix RANSAC, relative pose, 3D triangulation, positive-depth/coverage confidence gates, and bounded tangent-plane mesh warping. Rejects low confidence or nearly identical viewpoints. Camera intrinsics are approximated; recovered depth is relative, not metrically calibrated.
- **UI**: 3D and UVDoc controls are visible on Android in PerfectScan, with UVDoc enabled by default. Distinct pipelines, actual model identity and relative 3D confidence/rejection reason are included in the JSON integrity report.
- **Document safety**: original photo preserved; JPEG, optional PDF and JSON are saved as new files only after mandatory human review. No synthesized lost letters, invented ink or official forensic authenticity claim.
- **Memory/resolution limits**: UVDoc executes at up to 1024px long side and 3D reconstruction at up to 960px. Upsampling for export does not create more detail than the neural/mesh inference size. Severe folds, occluded text, blank pages or repeated low-text patterns may still fail.
- **Build caveat**: initial Android build needs network to obtain the pinned model once; subsequent builds reuse a verified local copy. A missing/modified model makes build or inference fail visibly, never a fake 3D success.
- **Production gate**: field photographs and Samsung handset performance, fold/color/stamp quality, signature fidelity and in-place update safety are not certified by successful CI alone. Pro paywall remains disabled.

## Important distinction
UVDoc neural image correction is a 2D geometric rectification model. The separate Surface3D plugin uses genuine multi-view 3D point triangulation, but output is relative (camera calibration approximate), not an accurate metric paper scan or a guaranteed recovery of hidden text.

## References
- Official UVDoc ONNX (Apache-2.0): https://huggingface.co/PaddlePaddle/UVDoc_onnx
- PaddleX preprocess: https://github.com/PaddlePaddle/PaddleX/blob/release/3.7/paddlex/inference/models/image_unwarping/predictor.py
- ONNX Runtime Android (MIT): https://central.sonatype.com/artifact/com.microsoft.onnxruntime/onnxruntime-android
- OpenCV: https://opencv.org/license/

## Previous 0.40.1 notes (historical)
# RivoScan PerfectScan Pro — Android beta 0.40.1 (superseded)

## Delivered in code
- One-tap entry from Home and existing-image editor; up to three additional phone-camera or gallery shots.
- Local gradient-aligned registration of the same printed page (maximum ±22 pixels), explicit rejection when alignment confidence is low.
- Non-destructive paper-tone and wrinkle-shadow correction with conservative pixel fusion; preservation of dark ink, colored stamps and handwritten signatures; optional confidence-gated printed-text 2D dewarping.
- Full-screen original / enhanced compare, mandatory human review before save.
- Export new JPG image, optional PDF of the same proportions, and integrity JSON with SHA-256 hashes of original and added shots and processed image (where browser WebCrypto is available), alignment diagnostics, document alteration warnings. Newly imported originals saved unchanged.
- Direct Google ML Kit FULL Deep Clean entry opens Google's on-device editor with user-controlled gallery import. The local 2D PerfectScan engine and ML Kit workflow are distinct; they are not the same process.
- Premium Comfort UI, selectable photos with Share and Delete side by side, local privacy, 7 languages. All Pro/paywall/billing gates still OFF for field testing.

## Technical limitations
- The implemented remap is a guarded 2D line correction, not true 3D physical page reconstruction. Hidden text, severe folds, and missing ink cannot be recovered reliably.
- Translation-only matching works on nearly registered shots of the same paper. Different pages and major perspective/rotation differences are rejected rather than fabricated.
- On-device PerfectScan fusion is bounded to about 4.8 megapixels for WebView memory safety. Native CameraX and ML Kit may produce larger photos separately.
- Hash and contrast diagnostics do not establish certified legal authenticity; human review is required.
- UVDoc was not bundled in version 0.40.1; this limitation is superseded by the native 0.41.0 integration. Their Android runtime, model preprocessing, licensing/dependencies and device memory must be validated before enabling. Do not advertise UVDoc or true 3D as implemented.

## Optional desktop UVDoc ONNX validation
- A genuine local experimental runner is provided at scripts/uvdoc-offline.py.
- It uses PaddlePaddle's Apache-2.0 UVDoc model through PaddleOCR/ONNX Runtime when installed on a compatible desktop environment, and keeps a byte-identical source copy and hashes. It does not run on Android, it is not a built-in mobile tool, and it has not been performance-certified on the user's phone.
- Model download may require connectivity on first use; input photos are handled as local paths. This is an experimental companion for comparative QA, not a replacement for the mobile scanner.

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

## 0.40.1 additional controls
- Optional PDF output and its SHA-256 hash in integrity JSON; JPEG export and source original remain separate.
- Offline capture-quality hints for low edge detail, weak contrast, and excessive clipped highlights. These are heuristics, not guarantees of focus or legally certified authenticity.
