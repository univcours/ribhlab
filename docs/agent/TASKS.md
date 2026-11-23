# RivoScan QA tasks

| Task | Priority | Status | Acceptance |
|---|---|---|---|
| DOC-001 remove duplicate Documents image-specific import without deleting generic file import | P0 | IMPLEMENTED | Single real `data-import="file"` remains and no duplicate `data-import-images`; no lost gallery import |
| DOC-002 label generic Documents import correctly in all 7 languages | P0 | IMPLEMENTED | `Import files` translation and rounded upload icon; browser test verifies |
| UI-001 use Material 3 Expressive + offline Material Symbols Rounded everywhere | P0 | IMPLEMENTED, device QA pending | Real icon glyphs legible and unclipped in all screens |
| FAB-001 hide floating camera in QR/Barcode/Book/ID/permission/dialog/selection/processing states | P0 | IMPLEMENTED, device QA pending | No overlaps, flashes or obstructed scanner controls |
| ADS-001 guarantee native banner placement and recover from NO_FILL/network errors | P0 | BLOCKED on device evidence | Real SDK/logcat and screenshot/impression proof; no fake ad requests |
| CI-001 0.45.89 source checks, tests, responsive layout QA | P0 | TODO | New workflow run passes after version gate repair |
| CI-002 signed ABI-specific APKs plus all-ABI AAB with original signer | P0 | TODO | Real 0.45.89 build and verifier logs; GitHub prerelease assets |
| QA-001 genuine Android emulator screenshots and navigation | P1 | IN_PROGRESS | Screens inspected as Android, not browser SAMPLE |
| QA-002 physical-device full feature, PDF/ML Kit/QR and RTL/accessibility regression | P1 | BLOCKED | Test device available and result logged |
| PUBLISH-001 Google Play release | P2 | BLOCKED | Explicit user request plus validated release checks |

Statuses TODO / IN_PROGRESS / BLOCKED / IMPLEMENTED / VERIFIED reflect evidence, not optimism.
