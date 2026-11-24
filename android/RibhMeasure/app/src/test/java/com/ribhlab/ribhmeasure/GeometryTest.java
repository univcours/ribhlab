package com.ribhlab.ribhmeasure;

import org.junit.Test;
import java.util.Arrays;
import java.util.List;
import static org.junit.Assert.*;

public class GeometryTest {
    @Test public void oneDegreeAtEquatorIsAbout111km(){assertEquals(111195,Geometry.distance(new Geometry.Pt(0,0),new Geometry.Pt(0,1)),100);}
    @Test public void rectangleAreaAndPerimeter(){
        // 0.0001 degrees latitude/longitude near equator: approximately 11.12m sides
        List<Geometry.Pt> square=Arrays.asList(new Geometry.Pt(0,0),new Geometry.Pt(0,.0001),new Geometry.Pt(.0001,.0001),new Geometry.Pt(.0001,0));
        assertEquals(123.64,Geometry.area(square),2.0);
        assertEquals(44.48,Geometry.perimeter(square),1.0);
    }
    @Test public void photoScale(){assertEquals(180,Geometry.scaledPhotoLength(60,new float[]{0,0,10,0,0,0,30,0}),.0001);}
    @Test public void invalidPhotoScale(){assertTrue(Double.isNaN(Geometry.scaledPhotoLength(60,new float[]{0,0,0,0,0,0,30,0})));}
    @Test public void emptyArea(){assertEquals(0,Geometry.area(Arrays.asList(new Geometry.Pt(2,3))),.001);}
}
