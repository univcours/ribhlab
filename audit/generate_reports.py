import json,csv,collections,datetime
from pathlib import Path
R=Path(r"C:\Users\ram\AndroidStudioProjects\RivoScan-04567-FullUI")
O=R/"audit"; B=O/"browser"
source=json.loads((O/"AUDIT_SUMMARY.json").read_text(encoding="utf8"))
code=json.loads((O/"PASS1_STATIC_CODE_EVIDENCE.json").read_text(encoding="utf8"))
nav=json.loads((B/"browser_navigation_audit.json").read_text(encoding="utf8"))
sw=json.loads((B/"modal_sweep.json").read_text(encoding="utf8"))
stress=json.loads((B/"adversarial_open_close.json").read_text(encoding="utf8"))
states=["Normal","Pressed","Focused","Disabled","Loading","Success","Error","Empty","Offline","Long Text","Small Screen","Large Screen","Dark Mode","Light Mode","Screen Rotation","Keyboard Visible","Back Navigation","App Background/Foreground"]
rows=[]
def add(row):
 row["ID"]="RUN-%07d"%(len(rows)+1)
 for state in states: row.setdefault(state,"NOT TESTED")
 rows.append(row)
for name,ss in nav["screens"].items():
 for button in ss.get("buttons",[]):
  add({"Screen":name,"Element":"Button","Name":button.get("text",""),"Data":"|".join(button.get("attrs",[])),
    "Evidence":"audit/browser/"+ss.get("screenshot",name+".png"),
    "Visual":"OBSERVED IN CHROME","Functional":"NOT TESTED","Result":"BROWSER OBSERVED ONLY",
    "Normal":"OBSERVED CHROME","Disabled":"OBSERVED DISABLED" if button.get("disabled") else "NOT TESTED"})
for x in sw["entries"]:
 add({"Screen":x.get("viewport",""),"Element":"Tool activation","Name":x["toolId"],"Data":"data-hub-action="+x["toolId"],
 "Evidence":"audit/browser/modal_sweep.json","Visual":x["status"],"Functional":"NOT TESTED NATIVE","Result":"BROWSER ACTIVATED ONLY",
 "Pressed":"BROWSER CLICK - NO NATIVE PROOF"})
with (O/"AUDIT_RUNTIME_ELEMENT_MATRIX.csv").open("w",newline="",encoding="utf-8-sig") as f:
 writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
fixes=[
 {"id":"FIX-001","name":"Book Scan duplicate photo and import actions","status":"PASS CODE + CHROME ONLY",
  "before":"Two visible pairs, 4 buttons","after":"One visible pair, 2 buttons",
  "evidence":"tests/audit-book-preview.test.js and audit/browser/08_book_scan.png"},
 {"id":"FIX-002","name":"ID Photo empty Photo tab","status":"PASS CODE + CHROME ONLY",
  "before":"Empty Photo tab and unused blank drawer","after":"Photo tab removed and drawer initially collapsed",
  "evidence":"tests/audit-id-photo-empty-tab.test.js and audit/browser/04_id_photo_simulated_native.png"},
 {"id":"FIX-003","name":"ZXing ESM named export instead of absent default export","status":"PASS CODE + REAL GENERATED PIXELS (NOT CAMERA)",
  "before":"Rollup warning about non-existent ZXing default export","after":"Named ESM import; QR and Code39 pixel decoding tested; blank frame rejected",
  "evidence":"tests/audit-zxing-esm.test.js and audit/PASS5_REGRESSION.txt"}]
openItems=[
 ("OPEN-001","HIGH","No connected Android device or AVD","Native camera, AdMob, Storage and lifecycle unverified"),
 ("OPEN-002","HIGH","Banner / Interstitial real inventory","No real creative / No Fill / native overlay data"),
 ("OPEN-003","HIGH","QR/barcode auto-zoom & autofocus","Device zoom hardware and detection not verified"),
 ("OPEN-004","HIGH","3 TXT files and migration","External storage old-file preservation not verified"),
 ("OPEN-005","MEDIUM","PDF save true progress","Stage-by-stage measurable progress still missing"),
 ("OPEN-006","MEDIUM","APK size","Native size optimization not verified"),
 ("OPEN-007","HIGH","All 18 states per item","Source inventory rows not all runtime matched"),
 ("OPEN-008","MEDIUM","7 locales and RTL","Chrome screenshots do not cover all locales"),
 ("OPEN-009","MEDIUM","Rotation and keyboard","Native keyboard/insets and rotation not tested"),
 ("OPEN-010","MEDIUM","Browser-only tool results","17/36 activations had no browser-testable modal"),
 ("OPEN-011","MEDIUM","Memory lifecycle","50 browser cycles; Android heap/foreground untested"),
 ("OPEN-012","MEDIUM","Output quality","No golden OCR/translation results or physical print"),
 ("OPEN-013","LOW","Chrome warnings","User activation and password field advisory; not crashes"),
 ("OPEN-014","LOW","UI pixel reference","14 screenshots but not reference goldens for all elements")]
passes={
"PASS1 CODE":{"status":"PARTIAL","evidence":"audit/PASS1_STATIC_CODE_EVIDENCE.json","detail":"68 JS and 29 CSS parsed; no syntax or relative import errors"},
"PASS2 UI":{"status":"PARTIAL","evidence":"audit/browser/browser_navigation_audit.json","detail":"14 Chrome captures, simulated banner safe area; no Android"},
"PASS3 UX":{"status":"PARTIAL","evidence":"audit/browser/08_book_scan.png, 04_id_photo_simulated_native.png","detail":"2 duplicate/empty-control issues tested and fixed"},
"PASS4 FUNCTIONAL":{"status":"PARTIAL","evidence":"tests/ directory, source test output","detail":"Existing unit tests, no native camera/AdMob/real file picker"},
"PASS5 REGRESSION":{"status":"PARTIAL","evidence":"npm test and npm run build","detail":"Aggregate checks passed but no per-element Android regression"},
"PASS6 ADVERSARIAL":{"status":"PARTIAL","evidence":"audit/browser/adversarial_open_close.json","detail":"50 open-close cycles and 36 tool activations in Chrome"}}
metrics={"generated":datetime.datetime.now(datetime.timezone.utc).isoformat(),"files":source["project_files"],
"sourceItems":source["inventory_entries"],"fullyVerifiedSourceItems":0,"runtimeRows":len(rows),
"browserScreens":len(nav["screens"]),"browserToolActivations":len(sw["entries"]),
"browserOpenedDialogs":sum(x["status"]=="UI_OPENED_BROWSER_ONLY" for x in sw["entries"]),
"browserNoModal":sum(x["status"]=="NO_DIALOG_BROWSER_ONLY" for x in sw["entries"]),
"browserBannerOverlaps":sum(x["status"]=="FAIL_BANNER_OVERLAP" for x in sw["entries"]),
"browserCycles":stress["cycles"],"browserCycleFailures":stress["openErrors"]+stress["closeErrors"],
"codeParsingProblems":len(code["jsErrors"])+len(code["cssErrors"])+len(code["missingRelativeImports"]),
"passes":passes,"fixes":fixes,"openFindings":[{"id":x[0],"priority":x[1],"name":x[2],"reason":x[3]} for x in openItems],
"qualityGate":"BLOCKED - no 100 percent or real Android proof"}
(O/"AUDIT_COVERAGE.json").write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding="utf8")
L=["# RivoScan Ultra-Deep Audit — Findings","","**QUALITY GATE BLOCKED:** this is not a 100% verified application audit.","",
"## Measurements","","| Metric | Evidence | Value |","|---|---|---:|",
"| Source files | AUDIT_MASTER_CHECKLIST.csv | "+str(metrics["files"])+" |",
"| Source occurrences (not unique controls) | AUDIT_MASTER_CHECKLIST.csv | "+str(metrics["sourceItems"])+" |",
"| Browser button/route observations | AUDIT_RUNTIME_ELEMENT_MATRIX.csv | "+str(len(rows))+" |",
"| Browser photographed scenarios | browser_navigation_audit.json | "+str(metrics["browserScreens"])+" |",
"| Tool activation cases | modal_sweep.json | "+str(metrics["browserToolActivations"])+" |",
"| Opened dialogs in browser | modal_sweep.json | "+str(metrics["browserOpenedDialogs"])+" |",
"| No browser-testable modal | modal_sweep.json | "+str(metrics["browserNoModal"])+" |",
"| Simulated banner overlaps | modal_sweep.json | "+str(metrics["browserBannerOverlaps"])+" |",
"| Adversarial open-close cycles | adversarial_open_close.json | "+str(metrics["browserCycles"])+" |",
"","## Six independent passes","","| Pass | Status | Evidence |","|---|---|---|"]
for k,v in passes.items():L.append("| "+k+" | "+v["status"]+" | "+v["evidence"]+" |")
L+=["","## Fixed and re-tested defects"]
for x in fixes:
 L+=["","### "+x["id"]+" "+x["name"],"",
  "**Before:** "+x["before"],"","**After:** "+x["after"],"","**Status:** "+x["status"],"","**Evidence:** "+x["evidence"]]
L+=["","## Outstanding and blocked areas","",
"| ID | Priority | Area | Blocker |","|---|---|---|---|"]
for x in openItems:L.append("| "+" | ".join(x)+" |")
L+=["","## Audit harness caveats","","- First Unicode-corruption alert was false: PowerShell had converted Unicode test character to '?' (JS syntax). Correct codepoint scan found **0 literal U+FFFD** in JS/CSS.","- First browser post-fix screenshot was stale. Verified new hashed production bundle with Chrome cache disabled and Service Worker bypass.","- First stress test falsely marked failures because the DOM was sampled synchronously inside click. Corrected and reran 50 cycles with 0 failures.","- Browser warnings from automated file choosers and login fields are NOT Android app exceptions.","- No phone/AVD was attached. Camera, live advertisements, MediaStore, power/rotation, memory and physical print still need real-device tests.",
"","## Traceability guarantee","","Source occurrences are indexed with source file, line and SHA-based evidence in AUDIT_MASTER_CHECKLIST; every row remains UNVERIFIED until proven individually.",
"Browser controls are separately indexed in AUDIT_RUNTIME_ELEMENT_MATRIX with 18 state columns. These do not retroactively turn source rows into PASS.",
"","## FINAL GATE","","Incomplete. Do not claim 100% until all applicable states and native device scenarios are evidenced."]
(O/"AUDIT_FINDINGS.md").write_text("\n".join(L),encoding="utf8")
print(json.dumps({"runtimeRows":len(rows),"screens":len(nav["screens"]),"cases":len(sw["entries"]),"openFindings":len(openItems)},ensure_ascii=False))
