package com.ribhlab.ribhmeasure;
final class RoomMath {
 static double area(float[][] a){double sum=0;for(int i=0;i<a.length;i++){float[] p=a[i],q=a[(i+1)%a.length];sum+=(double)p[0]*q[1]-(double)q[0]*p[1];}return Math.abs(sum)/2;}
 static double perimeter(float[][] a){if(a.length<3)return 0;double sum=0;for(int i=0;i<a.length;i++){float[] p=a[i],q=a[(i+1)%a.length];sum+=Math.hypot(p[0]-q[0],p[1]-q[1]);}return sum;}
 static double orient(float[] a,float[] b,float[] c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
 static boolean valid(float[][] a){if(a.length<3||area(a)<.01)return false;for(int i=0;i<a.length;i++)for(int j=i+1;j<a.length;j++){if(Math.hypot(a[i][0]-a[j][0],a[i][1]-a[j][1])<.02)return false;if(j==i+1||(i==0&&j==a.length-1))continue;float[] p=a[i],q=a[(i+1)%a.length],r=a[j],s=a[(j+1)%a.length];if(orient(p,q,r)*orient(p,q,s)<0&&orient(r,s,p)*orient(r,s,q)<0)return false;}return true;}
}
