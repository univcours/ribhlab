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
| Manage Pages select/reorder/rotate/delete | Implemented | PDF page manager via web; non-destructive new PDF |
| Import images/files | Implemented | Android picker |
| PDF to images / long image | Implemented | Offline export, bounded number of pages |
| Word export | Partial | OCR text DOCX, complex tables/layout not retained |
| Excel export | Partial | CSV extracted text, not exact table reconstruction |
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
