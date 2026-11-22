#!/usr/bin/env python3
import re,csv,json,hashlib,subprocess,collections,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1]; O=R/"audit";O.mkdir(exist_ok=True)
tracked=subprocess.check_output(["git","ls-files","--cached","--others","--exclude-standard"],cwd=R,text=True).splitlines()
excluded={"patch_release.py","patch_stage1.py","patch_stage4.py","patch_stage5.py","patch_stage5_tests.py","patch_stage6.py"}
files=sorted({p.replace("\\","/") for p in tracked if p not in excluded and not p.startswith("audit/")})
states="Normal|Pressed|Focused|Disabled|Loading|Success|Error|Empty|Offline|Long Text|Small Screen|Large Screen|Dark Mode|Light Mode|Screen Rotation|Keyboard Visible|Back Navigation|App Background/Foreground"
rules={
"ui_control":r"<\s*(?:button|input|select|textarea|a|label|option|summary)\b|createElement\(\s*['\"](?:button|input|select|textarea|a)['\"]",
"icon":r"\bico\(|\bicon\s*:|icon=['\"]|\bsvg\b|drawable",
"menu_card":r"class(?:Name)?\s*=\s*['\"][^'\"]*(?:card|tile|menu|list|nav)|\b(?:menuItems|toolCards|tabs)\b",
"dialog_overlay":r"dialog|overlay|modal|popover|bottom.?sheet|toast|alert\(",
"message":r"\b(?:notify|toast|alert|showMessage|showError)\s*\(|(?:status|hint|error|message|title)\.textContent\s*=|role=['\"](?:alert|status)['\"]",
"navigation":r"\b(?:navigate|onClose|onBack|history\.back|goBack|backTransitions|backButton|popstate|location\.hash|showPage|setPage)\b|data-(?:back|nav|route)",
"interaction":r"addEventListener\s*\(|\.on(?:click|change|input|pointerdown|pointerup|touchstart|submit)\b|data-(?:action|tool|open|close|save|scan)",
"save_export":r"\b(?:save|export|download|share|write|persist|appendScannerText|createPdf|toBlob|toDataURL)\s*\(|\b(?:share|export|download|save)\b",
"advertising":r"AdMob|\b(?:banner|interstitial|rewarded|admob|adsense|Consent)\b",
"background_service":r"setInterval|setTimeout|Promise\.all|Worker|Service|BroadcastReceiver|onResume|visibilitychange|BackgroundTask|requestAnimationFrame|MutationObserver|IntersectionObserver|fetch\(|async\s+function",
"error_path":r"\b(?:catch|throw|finally|reject|fallback|error|failed|no.?fill|timeout|offline|permission|denied|unavailable)\b",
"screen_route":r"\b(?:case|route|page|screen|section|mode)\s*[:=]\s*['\"][A-Za-z0-9_-]+['\"]|data-(?:page|route|screen)|<\s*(?:activity|fragment)\b",
"state_condition":r"\b(?:disabled|loading|isLoading|busy|pending|success|empty|offline|dark|light|reduced.motion|orientation|keyboard|foreground|background)\b",
"function_path":r"^\s*(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*|^\s*(?:public|private|protected)\s+(?:static\s+)?(?:void|boolean|String|int|long)\s+[A-Za-z_]\w*\s*\("
}
cssrules={
"css_selector":r"^\s*(?:(?!@)[^{};]+)\{",
"animation":r"@keyframes\b|\banimation(?:-name)?\s*:|\btransition\s*:",
"colors":r"(?:^|[;{])\s*(?:color|background|border-color|box-shadow|text-shadow|fill|stroke)\s*:|#[0-9a-fA-F]{3,8}\b|rgba?\(",
"typography":r"\bfont(?:-family|-size|-weight)?\s*:|\bletter-spacing\s*:|\bline-height\s*:",
"spacing_layout":r"\b(?:margin|padding|gap|row-gap|column-gap|inset|width|height|top|left|right|bottom|z-index|overflow|position|display|flex|grid|border-radius)\s*:"
}
rules={k:re.compile(v,re.I) for k,v in rules.items()}
cssrules={k:re.compile(v,re.I) for k,v in cssrules.items()}
rows=[];groups=collections.Counter();counts=collections.Counter()
def group(path):
 for prefix,name in [("src/","App source"),("tests/","Automated tests"),("native/","Android native"),("android/","Android native"),("public/","Resources"),("assets/","Resources"),(".github/","CI workflows"),("scripts/","Build scripts")]:
  if path.startswith(prefix):return name
 return "Project config/docs"
def add(cat,p,line,sample,ext,g,stateset=states):
 key=p+":"+str(line)+":"+cat+":"+str(sample)
 evidence=hashlib.sha256(key.encode("utf8",errors="replace")).hexdigest()[:16]
 rows.append(dict(ID="AUD-%07d"%(len(rows)+1),Category=cat,Source=p,Line=line,Evidence=p+":"+str(line)+"#"+evidence,
   Excerpt=str(sample).strip().replace("\t"," ")[:220],Extension=ext,Group=g,
   CODE="DISCOVERED ONLY",VISUAL="NOT TESTED",FUNCTIONAL="NOT TESTED",UX="NOT TESTED",
   REGRESSION="NOT TESTED",ADVERSARIAL="NOT TESTED",Result="UNVERIFIED",
   Reason="No individual runtime evidence",ApplicableStates=stateset,TestEvidence="",FixCommit="",RetestEvidence=""))
 counts[cat]+=1
text_ext={".js",".mjs",".cjs",".jsx",".ts",".tsx",".css",".html",".java",".kt",".json",".xml",".yml",".yaml",".gradle",".properties",".md",".txt",".ps1",".cmd",".sh",".svg"}
for path in files:
 f=R/path
 if not f.is_file():continue
 ext=f.suffix.lower();g=group(path);groups[g]+=1;data=f.read_bytes()
 add("project_file",path,0,"bytes="+str(len(data))+" sha256="+hashlib.sha256(data).hexdigest()[:16],ext,g,"")
 if ext not in text_ext or len(data)>2500000:continue
 s=data.decode("utf8",errors="replace")
 source=path.startswith(("src/","native/","android/","public/","assets/")) or path=="index.html" or path.startswith(".github/")
 for n,line in enumerate(s.splitlines(),1):
  if not line.strip():continue
  if source and ext in {".js",".mjs",".cjs",".jsx",".ts",".tsx",".java",".kt",".html",".xml",".svg"}:
   for cat,rx in rules.items():
    if rx.search(line):add(cat,path,n,line,ext,g)
  if source and ext==".css":
   for cat,rx in cssrules.items():
    if rx.search(line):add(cat,path,n,line,ext,g)
  if path=="package.json" and re.match(r'^\s*"[@\w./-]+"\s*:\s*["]',line):add("dependency",path,n,line,ext,g,"")
  if path.endswith("AndroidManifest.xml") and "<" in line:add("manifest",path,n,line,ext,g,"")
  if path.startswith(".github/workflows/") and any(x in line for x in ("uses:","run:","name:")):add("ci_step",path,n,line,ext,g,"")
with (O/"AUDIT_MASTER_CHECKLIST.csv").open("w",newline="",encoding="utf-8-sig") as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
with (O/"AUDIT_MASTER_CHECKLIST.jsonl").open("w",encoding="utf8") as f:
 for row in rows:f.write(json.dumps(row,ensure_ascii=False)+"\n")
sha=subprocess.check_output(["git","rev-parse","HEAD"],cwd=R,text=True).strip()
summary={"generated_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
 "source_commit":sha,"project_files":sum(groups.values()),"inventory_entries":len(rows),
 "categories":dict(counts),"file_groups":dict(groups),
 "source_inventory":"DISCOVERED NOT VALIDATED","runtime_navigation_crosschecked":False,
 "device_attached":False,"emulator_available":False,
 "status":{"UNVERIFIED":len(rows),"PASS":0,"FAIL":0},
 "exclusions":["Vendor node_modules, compiled dist, .git and ignored build output","Six untracked temporary patch scripts"],
 "limitations":["Regex/static discovery cannot enumerate every dynamically created element or state","No Android phone attached or configured AVD","No physical camera, AdMob, rotation or memory tests","No automatic promotion of aggregate test-suite results to individual element PASS"]}
(O/"AUDIT_SUMMARY.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False),encoding="utf8")
md=["# RivoScan Audit Master Inventory","","Source commit: "+sha,
"","**"+str(len(rows))+" source occurrences across "+str(sum(groups.values()))+" project files.**",
"","**UNVERIFIED: this is NOT 100% runtime coverage.**",
"","## File groups","", "| Group | File count |","|---|---:|"]
md.extend("| "+k+" | "+str(v)+" |" for k,v in sorted(groups.items()))
md+=["","## Discovery categories","", "| Category | Entries |","|---|---:|"]
md.extend("| "+k+" | "+str(v)+" |" for k,v in sorted(counts.items()))
md+=["","## Rules","", "No PASS without item-specific reproducing test, screenshot or runtime evidence.",
"Each source match is CODE=DISCOVERED ONLY; 18 per-item states and the 6 independent passes remain NOT TESTED.",
"Navigation versus source inventory could not be reconciled without a connected Android device or AVD.",
"Machine-readable outputs: AUDIT_MASTER_CHECKLIST.csv, AUDIT_MASTER_CHECKLIST.jsonl, AUDIT_SUMMARY.json."]
(O/"AUDIT_MASTER_CHECKLIST.md").write_text("\n".join(md),encoding="utf8")
print(json.dumps(summary,ensure_ascii=False))
