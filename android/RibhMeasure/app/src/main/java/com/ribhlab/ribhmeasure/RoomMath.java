package com.ribhlab.ribhmeasure;
final class RoomMath {
 static double signedArea(float[][] a){double sum=0;for(int i=0;i<a.length;i++){float[] p=a[i],q=a[(i+1)%a.length];sum+=(double)p[0]*q[1]-(double)q[0]*p[1];}return sum/2;}
 static double area(float[][] a){return Math.abs(signedArea(a));}
 static double perimeter(float[][] a){if(a.length<3)return 0;double sum=0;for(int i=0;i<a.length;i++){float[] p=a[i],q=a[(i+1)%a.length];sum+=Math.hypot(p[0]-q[0],p[1]-q[1]);}return sum;}
 static double orient(float[] a,float[] b,float[] c){return ((double)b[0]-a[0])*((double)c[1]-a[1])-((double)b[1]-a[1])*((double)c[0]-a[0]);}
 static boolean onSegment(float[] a,float[] b,float[] p){return Math.abs(orient(a,b,p))<1e-6&&p[0]>=Math.min(a[0],b[0])-1e-6&&p[0]<=Math.max(a[0],b[0])+1e-6&&p[1]>=Math.min(a[1],b[1])-1e-6&&p[1]<=Math.max(a[1],b[1])+1e-6;}
 static boolean intersects(float[] a,float[] b,float[] c,float[] d){double p=orient(a,b,c),q=orient(a,b,d),r=orient(c,d,a),s=orient(c,d,b);return (p*q<0&&r*s<0)||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);}
 static boolean valid(float[][] a){
  if(a==null||a.length<3||a.length>200)return false;
  for(float[] p:a)if(p==null||p.length<2||!Float.isFinite(p[0])||!Float.isFinite(p[1]))return false;
  if(!Double.isFinite(area(a))||area(a)<.01)return false;
  for(int i=0;i<a.length;i++){float[] p=a[i],q=a[(i+1)%a.length];for(int j=i+1;j<a.length;j++){
   if(Math.hypot(p[0]-a[j][0],p[1]-a[j][1])<.02)return false;
   if(j==i+1||(i==0&&j==a.length-1))continue;
   if(intersects(p,q,a[j],a[(j+1)%a.length]))return false;
  }}
  for(int i=0;i<a.length;i++){float[] p=a[(i+a.length-1)%a.length],q=a[i],r=a[(i+1)%a.length];if(Math.abs(orient(p,q,r))<1e-6&&((p[0]-q[0])*(r[0]-q[0])+(p[1]-q[1])*(r[1]-q[1]))>0)return false;}
  return true;
 }
 static float[][] copy(float[][] a){float[][] b=new float[a.length][2];for(int i=0;i<a.length;i++)b[i]=a[i].clone();return b;}
 static float[] flatten(float[][] a){float[] f=new float[a.length*2];for(int i=0;i<a.length;i++){f[2*i]=a[i][0];f[2*i+1]=a[i][1];}return f;}
 static float[][] fromFlat(float[] f){if(f==null||f.length<6||f.length>400||f.length%2!=0)return new float[0][];float[][] a=new float[f.length/2][2];for(int i=0;i<a.length;i++){a[i][0]=f[2*i];a[i][1]=f[2*i+1];}return a;}
}
