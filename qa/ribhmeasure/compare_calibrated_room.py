import json,math,re,xml.etree.ElementTree as E
from pathlib import Path
O=Path("qa-output")
t=json.loads((O/"ground-truth.json").read_text())
rows=[]
for f in sorted(O.glob("motion-*.xml")):
 try: labels=[n.get("text","") for n in E.fromstring(f.read_text()).iter("node")]
 except Exception:continue
 for s in labels:
  m=re.search(r"Corners:\s*(\d+)\s*\|\s*([0-9.]+) m²\s*•\s*([0-9.]+) m",s)
  if not m:continue
  n,A,P=int(m[1]),float(m[2]),float(m[3])
  h=re.search(r"Height\s+([0-9.]+) m\s*•\s*([0-9.]+) m³",s)
  row={"sample":f.stem,"corners":n,"area_m2":A,"perimeter_m":P,"height_m":float(h[1]) if h else None,"volume_m3":float(h[2]) if h else None}
  # Side estimates are valid only under the rectangle assumption; not a direct measurement.
  d=(P/2)**2-4*A
  if n==4 and d>=0:
   row["length_m"]=(P/2+math.sqrt(d))/2;row["width_m"]=(P/2-math.sqrt(d))/2
  row["relative_error_pct"]={k:100*(row[k]-t[k])/t[k] for k in ("length_m","width_m","height_m","area_m2","perimeter_m","volume_m3") if row.get(k) is not None}
  rows.append(row)
# Use latest recorded complete result, never the result closest to the reference.
rows.sort(key=lambda x:int(x["sample"].split("-")[-1]))
last=rows[-1] if rows else None
report={"expected":t,"observed":last,"all_candidates":rows,"side_method":"Rectangle side estimates derived from reported area and perimeter, not direct wall readings.","status":"NO_ROOM_MEASURED" if not last else "INCOMPLETE_OR_OUTSIDE_TOLERANCE"}
if last and last["corners"]==4 and all(k in last["relative_error_pct"] and abs(last["relative_error_pct"][k])<=5 for k in ("length_m","width_m","height_m","area_m2","perimeter_m","volume_m3")):report["status"]="WITHIN_5_PERCENT"
(O/"measurement-comparison.json").write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2),flush=True)
if report["status"]!="WITHIN_5_PERCENT":raise SystemExit("Calibrated room validation not passed")
