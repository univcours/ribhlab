from pathlib import Path
import hashlib,json,math
R=Path(r"C:\Users\ram\AndroidStudioProjects\RivoScan-04567-FullUI")
source=R/"audit"/"RivoScan-UltraDeep-Audit-0.45.68.zip"
assert source.is_file()
data=source.read_bytes()
size=600_000
out=R/"audit"/"archive_parts";out.mkdir(parents=True,exist_ok=True)
parts=[]
for i in range(0,len(data),size):
 name="part-%02d.bin"%(i//size+1)
 part=data[i:i+size]
 (out/name).write_bytes(part)
 parts.append(name)
meta={"name":source.name,"sha256":hashlib.sha256(data).hexdigest(),"bytes":len(data),
 "parts":parts,"partSha256":[hashlib.sha256((out/n).read_bytes()).hexdigest() for n in parts],
 "sourceCodeCommit":"f476783cc4ee281295d5237fa93772e66e6f32f9"}
(out/"manifest.json").write_text(json.dumps(meta,indent=2),encoding="utf8")
print(json.dumps(meta))
