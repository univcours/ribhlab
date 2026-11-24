package com.ribhlab.ribhmeasure;
import java.util.*;
final class AutoRoomMath {
 static float[][] solve(List<float[]> raw,float x,float z){
  ArrayList<float[]> walls=new ArrayList<>();
  for(float[] w:raw){boolean merged=false;for(int j=0;j<walls.size();j++){float[] v=walls.get(j);if(w[0]*v[0]+w[1]*v[1]>.996&&Math.abs(w[2]-v[2])<.18){if(w[4]-w[3]>v[4]-v[3])walls.set(j,w);merged=true;break;}}if(!merged)walls.add(w);}
  if(walls.size()<3)return new float[0][];
  float b=15;List<float[]> poly=new ArrayList<>(Arrays.asList(new float[]{x-b,z-b},new float[]{x+b,z-b},new float[]{x+b,z+b},new float[]{x-b,z+b}));
  for(float[] w:walls){List<float[]> out=new ArrayList<>();for(int i=0;i<poly.size();i++){float[] p=poly.get(i),q=poly.get((i+1)%poly.size());float a=w[0]*p[0]+w[1]*p[1]-w[2],c=w[0]*q[0]+w[1]*q[1]-w[2];boolean pi=a<=.0001,qi=c<=.0001;if(pi)out.add(p);if(pi!=qi){float t=a/(a-c);out.add(new float[]{p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])});}}poly=out;if(poly.size()<3)return new float[0][];}
  boolean changed=true;while(changed&&poly.size()>3){changed=false;for(int i=0;i<poly.size();i++){float[] p=poly.get(i),q=poly.get((i+1)%poly.size());if(Math.hypot(p[0]-q[0],p[1]-q[1])<.15){poly.remove((i+1)%poly.size());changed=true;break;}}}
  for(int i=0;i<poly.size();i++){float[] p=poly.get(i),q=poly.get((i+1)%poly.size());if(Math.abs(p[0]-x)>b-.1||Math.abs(p[1]-z)>b-.1)return new float[0][];boolean supported=false;for(float[] w:walls){if(Math.abs(w[0]*p[0]+w[1]*p[1]-w[2])>.16||Math.abs(w[0]*q[0]+w[1]*q[1]-w[2])>.16)continue;float p1=-w[1]*p[0]+w[0]*p[1],q1=-w[1]*q[0]+w[0]*q[1],lo=Math.min(p1,q1),hi=Math.max(p1,q1);float overlap=Math.min(hi,w[4])-Math.max(lo,w[3]);if(overlap>=Math.min((hi-lo)*.30,.8f)){supported=true;break;}}if(!supported)return new float[0][];}
  float[][] result=poly.toArray(new float[0][]);double area=RoomMath.area(result);return area>=1&&area<=400&&RoomMath.valid(result)?result:new float[0][];
 }
 static boolean near(float[][] a,float[][] b,float max){if(a.length!=b.length)return false;for(float[] p:a){boolean found=false;for(float[] q:b)if(Math.hypot(p[0]-q[0],p[1]-q[1])<=max){found=true;break;}if(!found)return false;}return true;}
}
