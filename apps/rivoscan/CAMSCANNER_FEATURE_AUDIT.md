## 0.32.0 manual-select color cleanup and repair quality
- **Color-aware No Handwriting workflow**: new `Colored ink (brushed only)` option uses only a user-marked area and strong chroma, preserving unselected printed black/gray pixels. It is not semantic handwriting removal; use the original to review complex colored paper. Existing blue/red/green/light-gray options remain.
- **Stroke correctness**: each brush gesture keeps its original color when the selector changes, single taps mark a circular area, Undo reverts the whole gesture. Changing the selection no longer rewrites previous strokes.
- **Smart Erase**: image-local horizontal and vertical boundary interpolation favors matching boundary colors, reducing dark printed-ink bleeding into a colored annotation removal. Pixels outside the exact mask, including alpha, remain untouched. This is not generative inpainting.
- **Restore Photo**: small isolated high-contrast dust pixels on otherwise uniform regions can now be corrected; connected printed text and original image remain preserved. Torn photo reconstruction, missing content and full AI restoration remain unavailable.
- Regression tests cover color-only masks, untouched dark print, original image integrity, single-pixel spot repair, directional inpainting and brush action behavior.
- Source and CI tests are not substitutes for QA on actual documents and Android phones.

## 0.31.1 independent left/right Book Scan curvature correction
- Automatic Book Scan bend estimation is now computed separately for each facing page and applied independently to both the preview and the exported PDF. Previously the app averaged the estimates, losing opposite or unequal bends.
- Manual curvature and page split changes cancel obsolete auto-estimates; importing a new photo also resets stale adjustments.
- The UI instructions in French, Spanish, German, Portuguese and Italian now describe the actual guided nonrigid correction rather than incorrectly saying there is no curvature correction.
- Regression tests check the independent mapping, export wiring, manual override and input validation.
- This remains a bounded image-based heuristic, not 3D surface reconstruction; real-device testing is necessary.

## 0.31.0 book flattening beta
- Book Scan now offers an **automatic curvature estimate button** based on repeated dark text line alignment near the spine versus the outside margins. It suggests a bounded nonlinear pixel warp and shows a confidence level. The user can override using the existing curvature slider. Blank/low-confidence pages default to manual and originals remain intact.
- This is a real image-derived automatic heuristic, NOT high-accuracy 3D surface reconstruction. Handset and diverse-document validation are still required.

## 0.30.0 remote AI implementations
- **AI Chat**: extract PDF text/OCR into page-marked context; question answering via the OpenAI Responses API with explicit per-request approval. The user enters their own key for that session, not stored or committed. Requests set `store:false`; vendor may have independent retention policies. No provider subscription or secret is bundled.
- **Solver AI**: submit the actual resized selected problem image as `input_image` after confirmation, or extracted text/PDF. Real model output is displayed; errors are surfaced and user key is redacted.
- Tests mock the network to check actual request format, page grounding, consent path and no provider saving. Because the project has no provisioned production AI credentials, a live API response cannot yet be certified.
- **Persistent link sharing** still needs a user-authorized, access-controlled cloud store and published backend. Never upload documents to a public repository just to fabricate a permanent share link.
- **Automatic 3D flattening / semantic handwriting removal** still needs specialized models and on-device quality tests.

## 0.30.0 — AI integrations with explicit consent
- **AI Chat (#16)**: document extraction (PDF text and OCR on raster pages) with page markers, questions, and the real OpenAI Responses API. User must provide their own API key per session and confirm each text transfer. Requests set `store:false`; RivoScan does not store credentials. Provider usage may incur charges.
- **Solver AI (#17)**: image selection/resizing and real vision input, or PDF/text problem extraction, followed by a user-confirmed external AI request. Answers are returned by the provider; no simulated solving.
- AI integrations cannot be live-tested without a user-supplied, funded API credential. Internet access required. API access is separate from a ChatGPT subscription.

## 0.29.0 Office formatting enhancements
- **Excel (#13)**: exports native .xlsx with aligned columns inferred from repeated PDF text x-coordinates and grouped y-rows. Preserves text, leading zeros, blanks. Scanned image OCR still cannot reliably reproduce complex table grids.
- **Word (#12)**: adds a separate editable DOCX mode that recreates plain tables from born-digital PDF text alignment with actual Word table cells, plus existing OCR paragraph mode. Images, nested tables, decorative styling and page geometry are not reconstructed exactly.
- The user's original file is untouched; all exports are new document copies.

## 0.28.0 guided selective mark removal
- **Erase colored writing / light watermark (#3/#4)**: the user brushes the actual area, then chooses 'blue', 'red', 'green' or 'light-gray watermark'. Only matched colored pixels inside that area are inpainted; adjacent black print is not selected. Supports undo and seven-language labels.
- This is NOT semantic automatic handwriting recognition, nor automatic watermark identification. Original copies remain unchanged, and the preview must be inspected. Mask tests explicitly check preservation of printed black strokes.

## 0.27.0 Formula OCR beta
- Adds a real camera/import OCR workflow for **linear printed equations**, with OCR confidence, editable recognized text, a conservative LaTeX character converter, copy and TXT export. Does **not** claim recognition of stacked fractions, nested layouts, or handwritten proofs. Complex math OCR remains missing until an appropriate specialized model is integrated and validated.

## 0.26.0 improvements
- **Signature placement (#21)**: after drawing, a real document-image preview supports dragging the signature anywhere and choosing its scale. The final exported scan uses the same normalized position; original remains untouched.
- **ID photo background (#11)**: elective, real on-device BodyPix MobileNet segmentation, with original/white/light-blue/gray backgrounds. Model weights download once. The user must inspect hair and clothing boundaries, and official acceptance is not guaranteed.
- **Whiteboard/Slides (#8)**: local 80th-percentile illumination correction now preserves colored markers, unlike the former destructive grayscale threshold. Native OpenCV Whiteboard mode also retains color/stamps. Burnt-out specular highlights cannot restore missing characters.
- Pending: full automatic 3D curve estimation, accurate handwriting-vs-printed separation, math-specific OCR, high-fidelity Office layout recovery, AI chat/solver backend, persistent links. User-requested capabilities are NOT represented by fake finished buttons.

## RivoScan 0.25.0 updates
- **Photo Translation (#9)** now invokes Tesseract OCR, allows correction of recognized text, and uses on-device `@capacitor-mlkit/translation` on Android. Language models download once (may use mobile data), then translation stays local. Supports Arabic, English, French, Spanish, German, Portuguese, Italian. Accuracy and hardware performance require field QA.
- **PPTX editable text (#14)** now provides a SEPARATE "To PPT (editable text)" export using PowerPoint native text boxes, plus the existing screenshot/image-slide export. No claim to reconstruct tables or graphic objects with full fidelity.
- Lock PDF, before-save signatures and manually guided non-linear dewarping remain in the app.
- Still missing: autonomous curved-page 3D flattening, handwriting/mark identification, accurate equation recognition, true AI conversational solver, persistent authenticated sharing, full Word/Excel table reconstruction. No dummy controls.

## 0.23.0 additional completed source / field QA needed
- **Lock PDF (#15)**: a standalone AES-256 encrypt action uses @pdfsmaller/pdf-encrypt locally with open password, optional separate owner password and copy/edit/print flags. Saves a NEW protected PDF. The opening password is not saved or transmitted. PDF permissions are advisory, not DRM.
- **Sign before saving (#21)**: CameraX corner editor and enhancement preview offer a native freehand signature dialog. User-drawn ink is overlaid at bottom-right only on the cleaned output after ✓; the original is not modified. Position is fixed bottom-right (custom drag placement still missing).
- **Guided nonlinear book flattening (#1/#7)**: Book Scan has an adjustable curvature slider applying an actual non-affine, bilinear pixel remap to both facing pages, with an on-screen preview and PDF output. It is NOT automatically inferred 3D dewarping of an arbitrary curled page.
- **Remaining unimplemented selected features**: automatic handwriting detection, automatic watermark/annotation detection, formula OCR, layout-preserving DOCX/XLSX/PPTX, AI Chat/Solver, and persistent authenticated cloud share links. Photo Translation now runs with on-device ML Kit after language model download. Do not advertise unfinished tools.
- The source includes true AES encryption test, deterministic pixel-warp tests, build & signature regressions; Android handset test on curved/scanned pages still required.

## 0.22.0: implementation update for the user's 22-feature selection
| Requested feature | 0.22.0 actual state |
| --- | --- |
| #1 True nonplanar/curved paper dewarping | PARTIAL: manually guided nonrigid remap in Book Scan; automatic 3D page reconstruction NOT implemented |
| #2 Auto text/stamp enhancement | Implemented OpenCV CLAHE/color-preserving Auto; hardware image quality QA pending |
| #3 No Handwriting automatic detection | PARTIAL manual color-selective erase of brushed blue/red/green writing; no semantic handwriting detection |
| #4 No Watermark automatic detection | PARTIAL manual brushed removal of faint neutral-gray marks; no automatic watermark detection |
| #5 Smart Erase | Partial, FUNCTIONAL: user paints mask and local edge-color interpolation fills selected area without changing unselected pixels |
| #6 Restore Photo | Partial, FUNCTIONAL: local edge-aware color denoising, no generative restoration |
| #7 Book Scan | Partial, FUNCTIONAL: capture/import, adjustable gutter, guided nonrigid curvature correction and 2-page PDF; automatic 3D flattening missing |
| #8 Whiteboard/Slides | Partial: color-preserving local illumination normalization, perspective crop and colored stamp retention; saturated highlights cannot be recovered |
| #9 Photo Translation | Source IMPLEMENTED: Tesseract OCR photo + on-device Google ML Kit translation between seven languages; first-use model downloads, Android hardware QA required |
| #10 Formula Recognition | Partial, functional beta: Tesseract extracts linear printed formulas and converts visible symbols into editable LaTeX; full 2D math model still missing |
| #11 ID Photo Maker | Partial: on-device portrait background segmentation (downloaded BodyPix) now available plus sizes and 300 DPI sheet; detailed edge quality/official acceptance not guaranteed |
| #12 Formatted DOCX | Partial: real editable DOCX tables from aligned born-digital PDF text and OCR paragraphs; exact layout, graphics, merged cells not recovered |
| #13 Table-accurate XLSX | Partial: genuine XLSX with column-aligned native PDF text; complex scanned-table borders, merged cells and layouts not guaranteed |
| #14 Editable PPT | PARTIAL: a new PowerPoint export produces real editable text boxes from PDF text/OCR; original images, advanced slide layouts and design geometry are not reconstructed |
| #15 Lock PDF | Implemented in source: AES-256 password protection, optional owner password and print/copy/edit permission flags; complete encryption integration test and Android QA required |
| #16 AI Chat | User-configured implementation: local PDF/image OCR + consent-based external AI; user API key, provider charges and live QA required |
| #17 Solver AI | User-configured implementation: actual selected image/problem sent to AI model only after explicit consent; key and live QA required |
| #18 CountCam | Partial, FUNCTIONAL source: COCO-SSD model detects common object classes from camera/import photo; internet for model weights on first use, counts are estimates, handset QA pending |
| #19 Scan Code | FUNCTIONAL source: ZXing local QR/1D/2D decoding from a camera photo or imported image; hardware QA pending |
| #20 Persistent Share Link | NOT implemented; needs authenticated storage/backend and user consent |
| #21 Sign before first save | Native signature dialog before ✓ now supports drag placement and resize on a live page preview; handset QA pending |
| #22 What's New | FUNCTIONAL source: version-tracked seven-language dialog on update and in Settings |

No placeholder controls are added for #1 #3 #4 #9 #10 #15 #16 #17 #18 #20 #21. **Do not conflate successful CI build with verified Samsung handset image quality.**

# RivoScan / CamScanner screenshot feature audit — 2026-11-01

**Source:** screenshot comparisons shared by the user in conversation. This is a feature matrix, not a claim that RivoScan reproduces CamScanner's algorithms. Do not misrepresent offline filters as generative AI or actual nonrigid paper dewarping.

## Primary requested flow
- Captured photo -> corner magnifier/manual correction -> **post-crop enhancement preview** -> choose Original / Enhance / Magic / No Shadow / Whiteboard / B&W -> compare original -> ✓ Save the processed image -> publish image in Documents/RivoScan and return to PDF assembly.
- Implemented in native `RivoLiveScannerActivity`, `RivoDocumentEnhancer`, `RivoEdgeDetector`, `RivoCropEditor`. Since 0.19.1, ✓ in the crop editor immediately runs Auto Clean and saves; Filters is OPTIONAL, not a prerequisite.
- Actual processing: perspective transform, spatial illumination normalization, CLAHE local contrast, restrained sharpening, and adaptive B&W. **Does not geometrically unbend deeply curved paper, recover text never recorded, or replace an AI restoration engine.** Physical creases/shadows may be reduced but not always removed.
- The original input photo is not overwritten; a decoded/pre-enhancement backup is saved in `Documents/RivoScan/Originals`, and the new cleaned scan is saved separately.
- Requires Android OpenCV to initialize; basic camera fallback does not have these advanced modes.

## New working additions in 0.20.0
- Restored **nine persistent scanner preferences** in Me > Settings: ✓ auto-clean, configurable native filter, save originals, single/batch default, HD/SD camera, JPEG quality, PDF quality, A4/Letter, automatic PDF creation. Each option is validated, translated into seven languages, and passed to the native CameraX scanner or PDF assembly.
- Existing Auto Clean output is no longer enhanced a second time when assembling a PDF, protecting the saturation of colored stamps and faint handwriting.
- **Two-sided ID card mode** captures front and back, then places both photographs on ONE A4 page. This is a simple physical composite, not government-ID validation.
- **Print PDF** invokes the system's actual Android print dialog for a PDF stored in RivoScan's verified Documents folders. A compatible printer/service is required.
- **Retake** is explicitly available in the native crop header; ID card capture indicates front/back in seven languages.
- Previous items remain: manual four-corner correction/loupe, Compare, filtered preview, reorder/delete/rotate pages, OCR, DOCX text export, CSV text export, image-based PPTX, JPG/PNG, long-image, sharing, direct transfer, fixed Documents/RivoScan + legacy Downloads visibility, language switching and sound toggle.

## 0.21.0 additions grounded in the user's original screenshots
- **Native Manage Pages DURING a multipage CameraX session**: each captured page has a real thumbnail, multi-selection, select all/deselect, drag-and-drop reordering (and accessible ↑/↓ controls), left/right 90° rotation, removing pages from the current PDF and ✓ confirmation. Underlying previously published JPEGs/originals are never deleted. Final PDF uses the confirmed page order and rotated JPEGs.
- **Editable Excel .xlsx export**: Tools > Convert > To Excel now writes a genuine XLSX workbook with OCR/PDF-text cells. CSV stays a separate tool. OCR-derived rows/columns are heuristic; scanned tables are NOT guaranteed to reconstruct their original layout. Every recognized cell stays text to protect leading zeros and avoid malicious formulas.
- Both features include source-level regressions and are compiled/checked in Android Actions.

## Compared screenshot functions
| CamScanner control observed | RivoScan state | Actual implementation / caveat |
| --- | --- | --- |
| Smart Scan | Implemented | CameraX and OpenCV contour detection |
| Corner adjustment, magnifier, crop | Implemented | Native 4-corner perspective warp |
| Enhancement after capture, ✓ confirmation | Implemented in 0.19.0 source; handset QA pending | New native filter preview and save path |
| Enhance, Magic, No Shadow, B&W | Implemented in source; image quality QA pending | Native offline OpenCV, not identical to proprietary algorithms |
| No Handwriting | Not implemented automatically | Manual white brush cleanup exists; do not erase signatures/annotations automatically |
| No Watermark | Not a generic automatic feature | Do not claim watermark/branding is erased; use manual cleanup only for legitimate annotations |
| Strong fold/curved-book dewarp | Partial | Perspective rectification and shadow normalization; nonplanar dewarp missing |
| Compare original / enhanced | Implemented | Toggle in native preview and touch-hold in web editor |
| Retake, Rotate, Crop | Implemented | Native camera, web editor, page manager |
| OCR Extract Text | Implemented | Tesseract.js, varies with text and language |
| Sign | Implemented | PDF signing, not yet a native pre-save scan-sign button |
| Manage Pages select/reorder/rotate/delete | Implemented in native scan session and PDF editor | Drag/↑↓ ordering, rotation and deletion within current PDF; originals kept |
| Import images/files | Implemented | Android picker |
| PDF to images / long image | Implemented | Offline export, bounded number of pages |
| Word export | Partial | OCR text DOCX, complex tables/layout not retained |
| Excel export | Editable XLSX and CSV available | Text/OCR cells exported to true .xlsx; complex table geometry not reconstructed |
| PPT export | Partial | Image-backed slides, not editable shapes |
| Compress / Merge / Split / Watermark / Page Numbers | Implemented | PDF toolkit |
| Folder copy/move/rename, multi-select | Implemented | Android MediaStore and web batch controls |
| Sharing via Android apps | Implemented | Device share chooser and format/quality selector |
| Share Link | Partial | Manual WebRTC device pairing; no persistent public cloud URL |
| ID card scan | Implemented source (0.20.0; handset QA pending) | Front/back are placed together on ONE A4 PDF page |
| Book scanner | Partial | Launches document scanner; curved book dewarp missing |
| Slides / Whiteboard | Partial | Scan and whiteboard photo enhancement; perspective details depend on camera |
| Timestamp | Implemented | Text overlay on enhanced image |
| Photo Translation | Missing | OCR plus translation service/pack required |
| Formula recognition | Missing | Specialized math recognition required |
| ID Photo Maker | Missing | Passport background/size requirements not implemented |
| Smart Erase / Restore Photo | Partial | Manual brush and ordinary enhancement only, not semantic inpainting |
| Erase Marks | Partial | Manual brush, cannot guarantee no text loss |
| Lock PDF | Missing | No PDF encryption in currently wired tools |
| AI Chat / Solver AI | Missing | Needs AI service and cost/privacy design |
| CountCam | Missing | Needs object recognition |
| Print | Implemented source (0.20.0; handset QA pending) | Android native PrintManager printer chooser, PDF files only |
| Scan Code | Missing | Barcode/QR scanner not wired |
| What's New + sticky Tools categories | Partial | Tools categories/search implemented; What's New banner not in app |
| Scanner settings | Implemented source (0.20.0; handset QA pending) | Nine real options with seven-language UI and CameraX/PDF wiring |

## Acceptance tests still required on a real Samsung S22 Ultra
1. Capture a flat document, tap crop Next, switch every filter, compare, save; ensure PDF generated.
2. Photograph a visibly wrinkled page: evaluate shadow reduction without erasing faint handwriting, stamps, signatures or table lines; compare with source.
3. Photograph low light, colored paper, receipts and forms. Avoid overexposure and halo artifacts.
4. Retake, undo crop, single/batch mode, gallery import, return/back navigation.
5. Force fallback camera without OpenCV, ensure graceful handling, no document loss.
6. Validate JPEG quality, memory use and no crashes when rapidly switching modes.
7. Confirm versionCode monotonically increases and the existing Android app is never uninstalled/downgraded.

This list reflects code presence and still needs runtime QA; it is not a claim of full CamScanner parity.
