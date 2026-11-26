package com.ribhlab.ribhmeasure;
import java.util.*;
public class IndependentQa {
 static int pass=0,fail=0;
 static void check(String name,boolean ok,String result){System.out.println((ok?"PASS":"FAIL")+" | "+name+" | "+result);if(ok)pass++;else fail++;}
 static boolean near(double a,double b){return Double.isFinite(a)&&Math.abs(a-b)<.002;}
 static List<float[]> walls(float[][] a,float gap){List<float[]> out=new ArrayList<>();for(int i=0;i<a.length;i++){float[] p=a[i],q=a[(i+1)%a.length];float dx=q[0]-p[0],dz=q[1]-p[1],l=(float)Math.hypot(dx,dz),nx=dz/l,nz=-dx/l,d=nx*p[0]+nz*p[1],t=-nz*p[0]+nx*p[1],u=-nz*q[0]+nx*q[1];out.add(new float[]{nx,nz,d,Math.min(t,u)+gap,Math.max(t,u)-gap});}return out;}
 static float[][] rotate(float[][] a,double rad,float dx,float dz){float[][] b=new float[a.length][2];for(int i=0;i<a.length;i++){b[i][0]=(float)(a[i][0]*Math.cos(rad)-a[i][1]*Math.sin(rad))+dx;b[i][1]=(float)(a[i][0]*Math.sin(rad)+a[i][1]*Math.cos(rad))+dz;}return b;}
 static void room(String name,float[][] a,double area,double perimeter,float x,float z){float[][] result=WallLoop.solve(walls(a,.05f),x,z);check(name,near(RoomMath.area(result),area)&&near(RoomMath.perimeter(result),perimeter),"area="+RoomMath.area(result)+" perimeter="+RoomMath.perimeter(result)+" corners="+result.length);}
 public static void main(String[] args){
 float[][] rect={{0,0},{5,0},{5,4},{0,4}},l={{0,0},{5,0},{5,2},{2,2},{2,4},{0,4}},u={{0,0},{6,0},{6,5},{4,5},{4,2},{2,2},{2,5},{0,5}};
 room("Rectangle 5x4",rect,20,18,2,2);room("L outline",l,14,18,1,1);room("U outline",u,24,28,1,1);
 float[][] shifted=rotate(rect,.37,8,-6),point=rotate(new float[][]{{2,2}},.37,8,-6);room("Rotated translated rectangle",shifted,20,18,point[0][0],point[0][1]);
 List<float[]> incomplete=walls(rect,.05f);incomplete.remove(2);check("Missing wall rejected",WallLoop.solve(incomplete,2,2).length==0&&AutoRoomMath.solve(incomplete,2,2).length==0,"no closed outline");
 List<float[]> extra=walls(rect,.05f);extra.add(new float[]{1,0,3,1,3});float[][] fallback=AutoRoomMath.solve(extra,2,2);check("Interior obstacle not treated as wall",fallback.length==0||near(RoomMath.area(fallback),20),"fallback area="+RoomMath.area(fallback));
 check("Crossed polygon rejected",!RoomMath.valid(new float[][]{{0,0},{3,3},{0,3},{3,0}}),"invalid");
 check("NaN rejected",!RoomMath.valid(new float[][]{{0,0},{Float.NaN,1},{1,1}}),"invalid");
 for(float[][] a:new float[][][]{rect,l,u}){RoomMesh m=RoomMesh.create(a,2.8f);double sum=0;for(int i=0;i<m.floorVertices*3;i+=9){float[] x={m.positions[i],m.positions[i+2]},y={m.positions[i+3],m.positions[i+5]},z={m.positions[i+6],m.positions[i+8]};sum+=Math.abs(RoomMath.orient(x,y,z))/2;}check("3D floor mesh "+a.length+" corners",near(sum,RoomMath.area(a)),"mesh area="+sum);}
 double d=Geometry.scaledPhotoLength(100,new float[]{0,0,100,0,0,0,250,0});check("Photo reference 100cm / 250px",near(d,250),"cm="+d);
 check("Zero reference pixel distance rejected",Double.isNaN(Geometry.scaledPhotoLength(100,new float[]{0,0,0,0,0,0,100,0})),"NaN");
 check("GPS identical positions",near(Geometry.distance(new Geometry.Pt(33,-7),new Geometry.Pt(33,-7)),0),"0 m");
 System.out.println("TOTAL "+pass+" PASS / "+fail+" FAIL");if(fail>0)System.exit(1);
 }
}