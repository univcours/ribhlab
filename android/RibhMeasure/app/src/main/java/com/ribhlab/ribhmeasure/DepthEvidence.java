package com.ribhlab.ribhmeasure;
import android.media.Image;
import com.google.ar.core.*;
import com.google.ar.core.exceptions.NotYetAvailableException;
import java.nio.*;
import java.util.*;

/** Bounded raw-depth evidence. The measurements are observations, not an accuracy percentage. */
final class DepthEvidence {
 private final ArrayDeque<float[]> samples=new ArrayDeque<>();
 private long timestamp=-1;
 void clear(){samples.clear();timestamp=-1;}
 int size(){return samples.size();}
 void add(Frame frame){
  try(Image d=frame.acquireRawDepthImage16Bits();Image c=frame.acquireRawDepthConfidenceImage()){
   if(d.getTimestamp()==timestamp||d.getWidth()!=c.getWidth()||d.getHeight()!=c.getHeight())return;
   timestamp=d.getTimestamp();
   int w=d.getWidth(),h=d.getHeight();Image.Plane dp=d.getPlanes()[0],cp=c.getPlanes()[0];
   ByteBuffer db=dp.getBuffer().order(ByteOrder.LITTLE_ENDIAN),cb=cp.getBuffer();
   CameraIntrinsics in=frame.getCamera().getTextureIntrinsics();int[] dim=in.getImageDimensions();float[] focal=in.getFocalLength(),center=in.getPrincipalPoint();
   float fx=focal[0]*w/dim[0],fy=focal[1]*h/dim[1],cx=center[0]*w/dim[0],cy=center[1]*h/dim[1];
   if(fx<=0||fy<=0)return;Pose pose=frame.getCamera().getPose();int step=Math.max(1,(int)Math.ceil(Math.sqrt(w*h/500.0)));
   for(int y=0;y<h;y+=step)for(int x=0;x<w;x+=step){int ci=y*cp.getRowStride()+x*cp.getPixelStride(),di=y*dp.getRowStride()+x*dp.getPixelStride();if(ci>=cb.limit()||di+1>=db.limit())continue;
    int confidence=cb.get(ci)&255,mm=db.getShort(di)&65535;if(confidence<160||mm<250||mm>6500)continue;
    float z=mm*.001f;float[] p=pose.transformPoint(new float[]{z*(x-cx)/fx,z*(cy-y)/fy,-z});
    if(Float.isFinite(p[0])&&Float.isFinite(p[1])&&Float.isFinite(p[2])){if(samples.size()>=4000)samples.removeFirst();samples.addLast(p);}
   }
  }catch(NotYetAvailableException ignored){}catch(RuntimeException e){android.util.Log.w("RoomDepth","Depth unavailable",e);}
 }
 int support(float[] wall,float floor){int n=0;for(float[] p:samples){if(p[1]<floor+.4f||p[1]>floor+2.8f)continue;float dist=Math.abs(wall[0]*p[0]+wall[1]*p[2]-wall[2]),t=-wall[1]*p[0]+wall[0]*p[2];if(dist<.12f&&t>=wall[3]-.1f&&t<=wall[4]+.1f)n++;}return n;}
}
