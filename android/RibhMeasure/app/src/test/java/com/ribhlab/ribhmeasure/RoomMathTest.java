package com.ribhlab.ribhmeasure;
import org.junit.Test;
import static org.junit.Assert.*;
public class RoomMathTest {
 @Test public void rectangle(){float[][] a={{0,0},{5,0},{5,4},{0,4}};assertTrue(RoomMath.valid(a));assertEquals(20,RoomMath.area(a),0.001);assertEquals(18,RoomMath.perimeter(a),0.001);}
 @Test public void lShape(){float[][] a={{0,0},{4,0},{4,2},{2,2},{2,4},{0,4}};assertTrue(RoomMath.valid(a));assertEquals(12,RoomMath.area(a),0.001);assertEquals(16,RoomMath.perimeter(a),0.001);}
 @Test public void invalid(){assertFalse(RoomMath.valid(new float[][]{{0,0},{4,4},{4,0},{0,4}}));assertFalse(RoomMath.valid(new float[][]{{0,0},{1,0},{0,0}}));}
}
