"""Build a metric room for the emulator renderer, never for the Android APK."""
import argparse,json,math,random
from pathlib import Path
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument("--resources",required=True);p.add_argument("--truth",required=True);a=p.parse_args()
res=Path(a.resources);out=Path(a.truth);out.parent.mkdir(parents=True,exist_ok=True)
# Keep the camera origin inside the room. Coordinates are metres, Y up.
L,W,H=5.0,4.0,2.8
x0,x1=-L/2,L/2;z0,z1=-W/2,W/2
# Unique non-repeating natural-looking high contrast visual features per face.
faces=[("floor",(x0,0,z0),(x1,0,z0),(x1,0,z1),(x0,0,z1)),
("ceiling",(x0,H,z1),(x1,H,z1),(x1,H,z0),(x0,H,z0)),
("wall_n",(x0,0,z0),(x0,H,z0),(x1,H,z0),(x1,0,z0)),
("wall_s",(x1,0,z1),(x1,H,z1),(x0,H,z1),(x0,0,z1)),
("wall_w",(x0,0,z1),(x0,H,z1),(x0,H,z0),(x0,0,z0)),
("wall_e",(x1,0,z0),(x1,H,z0),(x1,H,z1),(x1,0,z1))]
# Default scene path differs between emulator builds; replace only the scene asset
# inside the disposable CI emulator. Fail closed if it cannot be identified.
candidates=sorted(res.rglob("Toren1BD.obj"))
if not candidates:raise SystemExit("Cannot locate default Toren1BD.obj; no calibrated camera run")
for obj in candidates:
 folder=obj.parent;obj.with_suffix(".original.obj").write_bytes(obj.read_bytes())
 lines=["mtllib calibration.mtl","o CalibrationRoom"]
 mtl=[]
 for j,(name,*verts) in enumerate(faces):
  rng=random.Random(7300+j)
  img=Image.new("RGB",(1024,1024),(214-j*7,207-j*4,193+j*4));d=ImageDraw.Draw(img)
  # Distinct nonperiodic points, patches, and lines allow visual odometry.
  for i in range(1550):
   u,v=rng.randrange(1024),rng.randrange(1024);r=rng.randrange(2,13)
   c=tuple(rng.randrange(55,200) for _ in range(3))
   d.rectangle((u,v,u+r,v+r),fill=c)
  for i in range(35):
   u,v=rng.randrange(40,950),rng.randrange(40,950);w,h=rng.randrange(14,72),rng.randrange(14,72)
   d.rectangle((u,v,u+w,v+h),outline=(52,62,77),width=3)
   d.line((u,v,u+w,v+h),fill=(110,93,76),width=2)
  img.save(folder/(name+".png"))
  mtl.extend(["newmtl "+name,"Ka 1 1 1","Kd 1 1 1","Ks 0 0 0","d 1","illum 1","map_Kd "+name+".png",""])
  lines+=["v %.6f %.6f %.6f"%v for v in verts]
  lines+=["vt 0 0","vt 1 0","vt 1 1","vt 0 1"]
  # Explicit inward normals; OBJ winding selected to face the interior.
  u=[verts[1][k]-verts[0][k] for k in range(3)];v=[verts[2][k]-verts[0][k] for k in range(3)]
  n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
  c=[sum(v[k] for v in verts)/4 for k in range(3)]
  inward=[-c[0],H/2-c[1],-c[2]]
  reverse=sum(n[k]*inward[k] for k in range(3))<0
  if reverse:n=[-q for q in n]
  norm=math.sqrt(sum(q*q for q in n))
  lines+=["vn %.6f %.6f %.6f"%tuple(q/norm for q in n),"usemtl "+name]
  ix=[j*4+k for k in (1,2,3,4)]
  if reverse:ix=ix[::-1]
  for tri in [(ix[0],ix[1],ix[2]),(ix[0],ix[2],ix[3])]:lines.append("f "+" ".join(f"{i}/{i}/{j+1}" for i in tri))
 obj.write_text("\n".join(lines)+"\n")
 (folder/"calibration.mtl").write_text("\n".join(mtl))
 # No default furniture or posters inside the calibrated mesh.
 for post in folder.glob("Toren1BD.posters"):post.write_text("")
 print("CALIBRATED SCENE",obj,flush=True)
truth={"length_m":L,"width_m":W,"height_m":H,"area_m2":L*W,"perimeter_m":2*(L+W),"volume_m3":L*W*H,"coordinates":"metres, y up","scene_min":[x0,0,z0],"scene_max":[x1,H,z1],"scene_files":[str(x) for x in candidates]}
out.write_text(json.dumps(truth,indent=2));print("GROUND TRUTH",truth,flush=True)
