# RivoScan 0.45.88 — Master QA checklist

This checklist records **proof status**. Source presence and a passing unit test are *not* equivalent to a physical Android test.

| Feature / regression | Code state | Unit QA | Browser UI | Android device/emulator | Notes |
|---|---|---|---|---|---|
| Home vs My Documents identical thumbnail/action renderer | Existing | Pending | Pending | Pending | Single `renderSavedFileRow` |
| Full thumbnails without inner gap or clipped icons | Existing | Pending | Pending | Pending | Verify 320, 360, 393, 480, 768 dp |
| Saved file external Android chooser | Existing | Pending | N/A | Pending | URI read grant / installed viewer |
| No eye / in-app preview / file long press | Existing | Pending | Pending | Pending | Keep checkboxes and file actions |
| Unnecessary Back controls removed | Previously changed | Pending | Pending | Pending | Android system Back retained |
| Duplicate Documents Import Images removed | Existing | Pending | Pending | Pending | Keep Scan import |
| FAB visible on Home, Documents, Tools when idle | Updated | Pending | Pending | Pending | Central controller |
| FAB hidden on QR, barcode, plate, editor and Privacy | Existing | Pending | Pending | Pending | Observe runtime overlays |
| FAB hidden in Book Scan, ID Photo, OCR/translation | **Updated** | Pending | Pending | Pending | Newly added lifecycle/overlays |
| FAB never obscures native AdMob banner | **Updated** | Pending | Pending | Pending | Compare actual native 320×50 placement |
| Banner SDK initialization, consent and lifecycle | Existing | Pending | N/A | Pending | Device logs required |
| Banner NO_FILL vs NETWORK_ERROR vs layout | **Updated** | Pending | N/A | Pending | Codes 3 and 2 handled |
| Saved PDFs and all scan/editor/export buttons | Existing | Pending | Pending | Pending | No placeholder success claims |
| Material 3 Expressive and icon library spec | Existing | Pending | Pending | Pending | Resolve user master-brief Phosphor vs later Material Rounded choice |
| Correct app signing / no downgrade / portrait | Existing | Pending | N/A | Pending | Inspect actual APK certificate and manifest |
| ARM64, ARM32, Universal APK, AAB | Workflow planned | Pending | N/A | Pending | Check GitHub artifacts and ABI parity |
| Real ad display, earnings, actual install/permissions | Unknown | N/A | N/A | **UNVERIFIED** | Requires Android device or authentic emulator with AdMob |
| Public Google Play deployment | **NOT AUTHORIZED** | — | — | — | Do not publish |

## Evidence discipline
- Mark a cell **PASS** only with exact command/log/screenshot, version and commit.
- Mark **FAIL** with an actual error.
- Mark **UNVERIFIED** for tests not executed.
- Store artifact links after checking the exact file exists on GitHub.
- Keep per-screen defects in `audit/AUDIT_MASTER_CHECKLIST.md` and this table; never claim 100% coverage from static grep counts.
