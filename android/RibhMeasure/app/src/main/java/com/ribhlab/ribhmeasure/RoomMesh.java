package com.ribhlab.ribhmeasure;
import java.util.*;

/** Triangulates the measured polygon, and creates a metric 3D mesh. */
final class RoomMesh {
 final float[][] outline;
 final float height,radius,eyeX,eyeZ;
 final float[] positions,normals;
 final int floorVertices,wallVertices,ceilingVertices;
 private RoomMesh(float[][] outline,float height,float radius,float eyeX,float eyeZ,float[] positions,float[] normals,int floor,int walls,int ceiling){
  this.outline=outline;this.height=height;this.radius=radius;this.eyeX=eyeX;this.eyeZ=eyeZ;this.positions=positions;this.normals=normals;floorVertices=floor;wallVertices=walls;ceilingVertices=ceiling;
 }
 static List<int[]> triangulate(float[][] a){
  if(!RoomMath.valid(a))throw new IllegalArgumentException("Invalid outline");
  ArrayList<Integer> idx=new ArrayList<>();for(int i=0;i<a.length;i++)idx.add(i);
  if(RoomMath.signedArea(a)<0)Collections.reverse(idx);
  ArrayList<int[]> out=new ArrayList<>();
  int guard=a.length*a.length;
  while(idx.size()>3&&guard-->0){
   boolean clipped=false;
   for(int k=0;k<idx.size();k++){int i=idx.get((k+idx.size()-1)%idx.size()),j=idx.get(k),l=idx.get((k+1)%idx.size());double cross=RoomMath.orient(a[i],a[j],a[l]);
    if(Math.abs(cross)<1e-7){idx.remove(k);clipped=true;break;}if(cross<=0)continue;
    boolean inside=false;for(int m:idx){if(m==i||m==j||m==l)continue;if(RoomMath.orient(a[i],a[j],a[m])>=-1e-7&&RoomMath.orient(a[j],a[l],a[m])>=-1e-7&&RoomMath.orient(a[l],a[i],a[m])>=-1e-7){inside=true;break;}}
    if(inside)continue;out.add(new int[]{i,j,l});idx.remove(k);clipped=true;break;
   }
   if(!clipped)throw new IllegalArgumentException("Cannot triangulate outline");
  }
  if(idx.size()!=3)throw new IllegalArgumentException("Cannot triangulate outline");out.add(new int[]{idx.get(0),idx.get(1),idx.get(2)});
  double sum=0;for(int[] t:out)sum+=Math.abs(RoomMath.orient(a[t[0]],a[t[1]],a[t[2]]))/2;if(Math.abs(sum-RoomMath.area(a))>Math.max(.001,RoomMath.area(a)*.0001))throw new IllegalArgumentException("Mesh area mismatch");
  return out;
 }
 static RoomMesh create(float[][] input,float height){
  if(!Float.isFinite(height)||height<=0||height>1000)throw new IllegalArgumentException("Measured height required");
  List<int[]> tris=triangulate(input);float[][] a=RoomMath.copy(input);float mx=0,mz=0;for(float[] p:a){mx+=p[0];mz+=p[1];}mx/=a.length;mz/=a.length;
  float radius=height/2;for(float[] p:a){p[0]-=mx;p[1]-=mz;radius=Math.max(radius,(float)Math.hypot(p[0],p[1]));}
  float[] pos=new float[(tris.size()*6+a.length*6)*3],norm=new float[pos.length];int at=0;
  for(int[] t:tris)at=triangle(pos,norm,at,vec(a[t[0]],0),vec(a[t[2]],0),vec(a[t[1]],0));
  int floor=at/3;
  boolean ccw=RoomMath.signedArea(a)>0;
  for(int i=0;i<a.length;i++){int j=(i+1)%a.length;float[] b0=vec(a[i],0),b1=vec(a[j],0),t0=vec(a[i],height),t1=vec(a[j],height);
   if(ccw){at=triangle(pos,norm,at,b0,b1,t1);at=triangle(pos,norm,at,b0,t1,t0);}else{at=triangle(pos,norm,at,b0,t1,b1);at=triangle(pos,norm,at,b0,t0,t1);}
  }
  int walls=at/3-floor;
  for(int[] t:tris)at=triangle(pos,norm,at,vec(a[t[0]],height),vec(a[t[1]],height),vec(a[t[2]],height));
  int[] eye=tris.get(0);float ex=(a[eye[0]][0]+a[eye[1]][0]+a[eye[2]][0])/3,ez=(a[eye[0]][1]+a[eye[1]][1]+a[eye[2]][1])/3;
  return new RoomMesh(a,height,radius,ex,ez,pos,norm,floor,walls,at/3-floor-walls);
 }
 private static float[] vec(float[] p,float y){return new float[]{p[0],y,p[1]};}
 private static int triangle(float[] p,float[] n,int at,float[] a,float[] b,float[] c){float ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];float x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;float l=(float)Math.sqrt(x*x+y*y+z*z);if(l==0)throw new IllegalArgumentException("Degenerate triangle");for(float[] v:new float[][]{a,b,c}){System.arraycopy(v,0,p,at,3);n[at]=x/l;n[at+1]=y/l;n[at+2]=z/l;at+=3;}return at;}
}
