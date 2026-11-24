package com.ribhlab.ribhmeasure;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
public class WallLoopTest {
  List<float[]> observations(float[][] points){
    List<float[]> out=new ArrayList<>();
    for(int i=0;i<points.length;i++){
      float[] p=points[i],q=points[(i+1)%points.length];float dx=q[0]-p[0],dz=q[1]-p[1],l=(float)Math.hypot(dx,dz);
      float nx=dz/l,nz=-dx/l,d=nx*p[0]+nz*p[1],t1=-nz*p[0]+nx*p[1],t2=-nz*q[0]+nx*q[1];
      out.add(new float[]{nx,nz,d,Math.min(t1,t2)+.05f,Math.max(t1,t2)-.05f});
    }return out;
  }
  @Test public void lRoom(){float[][] p={{0,0},{5,0},{5,2},{2,2},{2,4},{0,4}};float[][] a=WallLoop.solve(observations(p),1,1);assertEquals(6,a.length);assertEquals(14,RoomMath.area(a),.001);assertEquals(18,RoomMath.perimeter(a),.001);}
  @Test public void uRoom(){float[][] p={{0,0},{6,0},{6,5},{4,5},{4,2},{2,2},{2,5},{0,5}};float[][] a=WallLoop.solve(observations(p),1,1);assertEquals(8,a.length);assertEquals(24,RoomMath.area(a),.001);}
  @Test public void missingWall(){List<float[]> w=observations(new float[][]{{0,0},{5,0},{5,4},{0,4}});w.remove(2);assertEquals(0,WallLoop.solve(w,2,2).length);}
  @Test public void outsideOrigin(){assertEquals(0,WallLoop.solve(observations(new float[][]{{0,0},{5,0},{5,4},{0,4}}),8,2).length);}
  @Test public void rectangleShuffled(){List<float[]> w=observations(new float[][]{{0,0},{5,0},{5,4},{0,4}});Collections.shuffle(w,new Random(5));assertEquals(20,RoomMath.area(WallLoop.solve(w,2,2)),.001);}
  @Test public void rejectLargeGap(){List<float[]> w=observations(new float[][]{{0,0},{5,0},{5,4},{0,4}});w.get(0)[3]+=1.5f;assertEquals(0,WallLoop.solve(w,2,2).length);}
}
