package com.ribhlab.ribhmeasure;
import org.junit.Test;import static org.junit.Assert.*;
public class RoomMeshTest {
 @Test public void lShapeMesh(){float[][] a={{0,0},{5,0},{5,2},{2,2},{2,4},{0,4}};RoomMesh m=RoomMesh.create(a,2.8f);assertEquals(12,m.floorVertices);assertEquals(36,m.wallVertices);assertEquals(m.positions.length,m.normals.length);double sum=0;for(int i=0;i<m.floorVertices*3;i+=9){float[] p={m.positions[i],m.positions[i+2]},q={m.positions[i+3],m.positions[i+5]},r={m.positions[i+6],m.positions[i+8]};sum+=Math.abs(RoomMath.orient(p,q,r))/2;}assertEquals(14,sum,.001);assertTrue(WallLoop.contains(m.outline,m.eyeX,m.eyeZ));}
 @Test public void rejectsInvalid(){assertFalse(RoomMath.valid(new float[][]{{0,0},{2,0},{2,2},{1,0},{0,2}}));assertFalse(RoomMath.valid(new float[][]{{0,0},{Float.NaN,1},{1,1}}));}
 @Test(expected=IllegalArgumentException.class)public void missingHeight(){RoomMesh.create(new float[][]{{0,0},{2,0},{2,2},{0,2}},Float.NaN);}
}
