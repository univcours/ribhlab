package com.ribhlab.ribhmeasure;
import org.junit.Test;import static org.junit.Assert.*;import java.util.*;
public class AutoRoomMathTest {
 List<float[]> rectangle(){return new ArrayList<>(Arrays.asList(new float[]{1,0,5,0,4},new float[]{-1,0,0,-4,0},new float[]{0,1,4,-5,0},new float[]{0,-1,0,0,5}));}
 @Test public void rectangleFromWalls(){float[][] p=AutoRoomMath.solve(rectangle(),2,2);assertEquals(4,p.length);assertEquals(20,RoomMath.area(p),.001);assertEquals(18,RoomMath.perimeter(p),.001);}
 @Test public void missingWallRejected(){List<float[]> p=rectangle();p.remove(3);assertEquals(0,AutoRoomMath.solve(p,2,2).length);}
 @Test public void duplicateWall(){List<float[]> p=rectangle();p.add(new float[]{1,0,5.02f,1,3});assertEquals(20,RoomMath.area(AutoRoomMath.solve(p,2,2)),.001);}
 @Test public void unsupportedWallRejected(){List<float[]> p=rectangle();p.set(0,new float[]{1,0,5,10,12});assertEquals(0,AutoRoomMath.solve(p,2,2).length);}
}
