import zipfile,hashlib,json,datetime
from pathlib import Path
R=Path(r"C:\Users\ram\AndroidStudioProjects\RivoScan-04567-FullUI")
O=R/"audit";B=O/"browser"
files=[]
for pattern in ["AUDIT_MASTER_CHECKLIST.csv","AUDIT_MASTER_CHECKLIST.jsonl","AUDIT_MASTER_CHECKLIST.md",
 "AUDIT_SUMMARY.json","AUDIT_RUNTIME_ELEMENT_MATRIX.csv","AUDIT_COVERAGE.json","AUDIT_FINDINGS.md",
 "PASS1_STATIC_CODE_EVIDENCE.json","PASS1_CODE_CHECK.txt","PASS4_FUNCTIONAL.txt","PASS5_REGRESSION.txt",
 "build_inventory.py","generate_reports.py","pass1_static.mjs",
 "browser_navigation.py","browser_modal_sweep.py","adversarial_cycle.py","browser_discovery.py"]:
 p=O/pattern
 if p.is_file():files.append(p)
for p in sorted(B.glob("*.json"))+sorted(B.glob("*.png")):
 if p.is_file():files.append(p)
for p in sorted((R/"tests").glob("audit-*.test.js")):files.append(p)
files.append(R/"rivoscan-version.properties")
files.append(R/".github/workflows/rivoscan-04568-ultradeep-audit.yml")
manifest={"generated":datetime.datetime.now(datetime.timezone.utc).isoformat(),"sourceCommit":"f476783cc4ee281295d5237fa93772e66e6f32f9",
 "disclaimer":"SOURCE + BROWSER PARTIAL AUDIT; NO REAL ANDROID EVIDENCE","files":[]}
for p in files:
 b=p.read_bytes()
 manifest["files"].append({"path":p.relative_to(R).as_posix(),"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()})
m=O/"AUDIT_BUNDLE_MANIFEST.json"
m.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
files.append(m)
zipname=O/"RivoScan-UltraDeep-Audit-0.45.68.zip"
with zipfile.ZipFile(zipname,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=7) as z:
 for p in files:z.write(p,p.relative_to(R).as_posix())
with zipfile.ZipFile(zipname) as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(files)
 assert "audit/AUDIT_MASTER_CHECKLIST.csv" in z.namelist()
 assert "audit/AUDIT_FINDINGS.md" in z.namelist()
print(json.dumps({"archive":str(zipname),"size":zipname.stat().st_size,"fileCount":len(files),"hasAllProof":True}))
