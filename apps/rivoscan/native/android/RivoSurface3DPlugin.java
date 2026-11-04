package com.ribhlab.rivoscan;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.opencv.android.Utils;
import org.opencv.calib3d.Calib3d;
import org.opencv.core.*;
import org.opencv.features2d.*;
import org.opencv.imgproc.Imgproc;
import org.json.JSONArray;
import java.io.ByteArrayOutputStream;
import java.util.*;

/**
 * Experimental genuine multi-view *relative* 3D paper reconstruction.
 * ORB + robust essential matrix + recovered camera pose + triangulated 3D
 * points -> a smooth tangent-plane rectification. No fake depth from 2D lines.
 *
 * Unknown phone intrinsics and sparse content mean no metric depth guarantee.
 * Insecure/ill-conditioned matches are rejected rather than inventing paper.
 * Input and output remain local, source frames untouched, human review required.
 */
@CapacitorPlugin(name="RivoSurface3D")
public final class RivoSurface3DPlugin extends Plugin {
    static final int MAX_BYTES=5*1024*1024;
    static final int MAX_SIDE=960;
    static final int MIN_INLIERS=36;
    private static class Anchor {
        double x,y,dx,dy,z;
        Anchor(double x,double y,double dx,double dy,double z){
            this.x=x;this.y=y;this.dx=dx;this.dy=dy;this.z=z;
        }
    }
    private static class Reconstruction {
        ArrayList<Anchor> anchors=new ArrayList<>();
        double confidence,depthSpread;
        int matches,inliers;
        String failure="Not enough valid 3D parallax";
    }
    private static int clamp(int v,int min,int max){return Math.max(min,Math.min(max,v));}
    private static Bitmap decode(String encoded,int width,int height){
        if(encoded==null||encoded.length()<100||encoded.length()>MAX_BYTES*2)
            throw new IllegalArgumentException("3D input image exceeds size limits");
        byte[] bytes=Base64.decode(encoded,Base64.DEFAULT);
        if(bytes.length>MAX_BYTES)throw new IllegalArgumentException("3D image payload too large");
        BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;
        BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);
        if(bounds.outWidth<128||bounds.outHeight<128||bounds.outWidth>12000||bounds.outHeight>12000)
            throw new IllegalArgumentException("Unsupported 3D capture dimensions");
        BitmapFactory.Options options=new BitmapFactory.Options();options.inPreferredConfig=Bitmap.Config.ARGB_8888;
        options.inSampleSize=1;
        while((long)bounds.outWidth*bounds.outHeight/(options.inSampleSize*options.inSampleSize)>2200000)
            options.inSampleSize*=2;
        Bitmap bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);
        if(bitmap==null)throw new IllegalArgumentException("Invalid 3D frame");
        Bitmap scaled=Bitmap.createScaledBitmap(bitmap,width,height,true);
        if(scaled!=bitmap)bitmap.recycle();
        return scaled;
    }
    static double median(ArrayList<Double> values) {
        Collections.sort(values);
        return values.get(values.size()/2);
    }
    private static Reconstruction triangulate(Mat a,Mat b,int w,int h){
        Reconstruction out=new Reconstruction();
        Mat g0=new Mat(),g1=new Mat(),d0=new Mat(),d1=new Mat(),K=Mat.eye(3,3,CvType.CV_64F);
        Mat E=null,mask=new Mat(),R=new Mat(),t=new Mat(),P0=null,P1=null,xyz=new Mat();
        MatOfKeyPoint k0=new MatOfKeyPoint(),k1=new MatOfKeyPoint();
        MatOfPoint2f p0=new MatOfPoint2f(),p1=new MatOfPoint2f();
        ArrayList<MatOfDMatch> pairs=new ArrayList<>();
        try{
            Imgproc.cvtColor(a,g0,Imgproc.COLOR_RGBA2GRAY);
            Imgproc.cvtColor(b,g1,Imgproc.COLOR_RGBA2GRAY);
            ORB orb=ORB.create(2000);
            orb.detectAndCompute(g0,new Mat(),k0,d0);
            orb.detectAndCompute(g1,new Mat(),k1,d1);
            if(d0.empty()||d1.empty())return out;
            DescriptorMatcher matcher=BFMatcher.create(Core.NORM_HAMMING);
            matcher.knnMatch(d0,d1,pairs,2);
            KeyPoint[] ka=k0.toArray(),kb=k1.toArray();
            ArrayList<Point> q0=new ArrayList<>(),q1=new ArrayList<>();
            for(MatOfDMatch pair:pairs){
                DMatch[] mm=pair.toArray();
                if(mm.length<2||mm[0].distance>=.75*mm[1].distance)continue;
                if(mm[0].queryIdx<0||mm[0].queryIdx>=ka.length||
                   mm[0].trainIdx<0||mm[0].trainIdx>=kb.length)continue;
                q0.add(ka[mm[0].queryIdx].pt);
                q1.add(kb[mm[0].trainIdx].pt);
            }
            out.matches=q0.size();
            if(q0.size()<55){out.failure="Need more distinct text/details in both photos";return out;}
            p0.fromList(q0);p1.fromList(q1);
            // Approximate intrinsics from image dimensions; user may capture with
            // different cameras, in which case low confidence must reject it.
            double f=1.25*Math.max(w,h),cx=(w-1)/2.0,cy=(h-1)/2.0;
            K.put(0,0,f);K.put(1,1,f);K.put(0,2,cx);K.put(1,2,cy);
            E=Calib3d.findEssentialMat(p0,p1,K,Calib3d.RANSAC,.999,1.5,mask);
            if(E.empty()||E.rows()!=3){out.failure="Unstable 3D camera motion";return out;}
            out.inliers=Calib3d.recoverPose(E,p0,p1,K,R,t,mask);
            if(out.inliers<MIN_INLIERS){out.failure="No reliable camera baseline for depth";return out;}
            Mat pose0=Mat.zeros(3,4,CvType.CV_64F),pose1=Mat.zeros(3,4,CvType.CV_64F);
            try{
                for(int i=0;i<3;i++){
                    pose0.put(i,i,1.0);
                    for(int j=0;j<3;j++)pose1.put(i,j,R.get(i,j)[0]);
                    pose1.put(i,3,t.get(i,0)[0]);
                }
                P0=new Mat();P1=new Mat();
                Core.gemm(K,pose0,1,new Mat(),0,P0);
                Core.gemm(K,pose1,1,new Mat(),0,P1);
                Calib3d.triangulatePoints(P0,P1,p0,p1,xyz);
            }finally{pose0.release();pose1.release();}
            ArrayList<Double> depths=new ArrayList<>();
            ArrayList<double[]> cloud=new ArrayList<>();
            for(int i=0;i<q0.size();i++){
                if(mask.rows()>i&&mask.get(i,0)[0]<1)continue;
                double homogeneous=xyz.get(3,i)[0];
                if(!Double.isFinite(homogeneous)||Math.abs(homogeneous)<1e-9)continue;
                double X=xyz.get(0,i)[0]/homogeneous,Y=xyz.get(1,i)[0]/homogeneous,Z=xyz.get(2,i)[0]/homogeneous;
                if(!Double.isFinite(X)||!Double.isFinite(Y)||!Double.isFinite(Z)||Z<=1e-4)continue;
                double X2=R.get(0,0)[0]*X+R.get(0,1)[0]*Y+R.get(0,2)[0]*Z+t.get(0,0)[0];
                double Y2=R.get(1,0)[0]*X+R.get(1,1)[0]*Y+R.get(1,2)[0]*Z+t.get(1,0)[0];
                double Z2=R.get(2,0)[0]*X+R.get(2,1)[0]*Y+R.get(2,2)[0]*Z+t.get(2,0)[0];
                if(Z2<=1e-4)continue;
                double err=Math.hypot(f*X/Z+cx-q0.get(i).x,f*Y/Z+cy-q0.get(i).y)+
                     Math.hypot(f*X2/Z2+cx-q1.get(i).x,f*Y2/Z2+cy-q1.get(i).y);
                if(err>4.5)continue;
                depths.add(Z);
                cloud.add(new double[]{X,Y,Z,q0.get(i).x,q0.get(i).y});
            }
            if(cloud.size()<MIN_INLIERS){out.failure="Too few triangulated paper points";return out;}
            double zmed=median(depths);
            ArrayList<Double> deviation=new ArrayList<>();
            for(double z:depths)deviation.add(Math.abs(z-zmed)/zmed);
            double spread=median(deviation);
            if(spread<.006||spread>.40){out.failure="3D surface depth unreliable or sheet nearly flat";return out;}
            double xmin=w,xmax=0,ymin=h,ymax=0;
            for(double[] pt:cloud){
                double X=pt[0],Y=pt[1],Z=pt[2],flatX=f*X/zmed+cx,flatY=f*Y/zmed+cy;
                double shiftX=pt[3]-flatX,shiftY=pt[4]-flatY;
                if(!Double.isFinite(flatX)||!Double.isFinite(flatY)||
                   flatX<0||flatX>=w||flatY<0||flatY>=h||
                   Math.abs(shiftX)>w*.09||Math.abs(shiftY)>h*.09)continue;
                out.anchors.add(new Anchor(flatX,flatY,shiftX,shiftY,Z/zmed));
                xmin=Math.min(xmin,flatX);xmax=Math.max(xmax,flatX);
                ymin=Math.min(ymin,flatY);ymax=Math.max(ymax,flatY);
            }
            if(out.anchors.size()<MIN_INLIERS||(xmax-xmin)<w*.40||(ymax-ymin)<h*.35){
                out.anchors.clear();out.failure="3D sample coverage too sparse; recapture with more visible edges";return out;
            }
            out.depthSpread=spread;
            out.confidence=Math.min(.98,Math.min(1.,out.anchors.size()/100.)*
               Math.min(1.,out.inliers/90.)*.90);
            if(out.confidence<.28){out.anchors.clear();out.failure="Low-confidence 3D pose";return out;}
            out.failure="";
            return out;
        }finally{
            g0.release();g1.release();d0.release();d1.release();K.release();mask.release();
            k0.release();k1.release();p0.release();p1.release();R.release();t.release();xyz.release();
            if(E!=null)E.release();if(P0!=null)P0.release();if(P1!=null)P1.release();
            for(MatOfDMatch mat:pairs)mat.release();
        }
    }
    private static double[] weightAt(List<Anchor> anchors,double x,double y,double w,double h){
        double r2=Math.pow(Math.min(w,h)*.23,2),sum=0,sx=0,sy=0,depth=0;
        for(Anchor a:anchors){
            double d2=(x-a.x)*(x-a.x)+(y-a.y)*(y-a.y);
            if(d2>r2*4)continue;
            double weight=1./(d2+Math.max(110,r2*.025));
            sum+=weight;sx+=a.dx*weight;sy+=a.dy*weight;depth+=a.z*weight;
        }
        if(sum<=0)return new double[]{0,0,1,0};
        return new double[]{sx/sum,sy/sum,depth/sum,sum};
    }
    private static Mat flatten(Mat rgba,Reconstruction geometry,int w,int h){
        // Slow-changing 3D displacement field: sample a coarse 2D mesh and
        // bilinearly interpolate to every pixel. Never synthesize hidden text.
        int nx=17,ny=21;
        double[][][] grid=new double[ny][nx][];
        for(int iy=0;iy<ny;iy++)for(int ix=0;ix<nx;ix++)
            grid[iy][ix]=weightAt(geometry.anchors,ix*(w-1.)/(nx-1),iy*(h-1.)/(ny-1),w,h);
        Mat xmap=new Mat(h,w,CvType.CV_32FC1),ymap=new Mat(h,w,CvType.CV_32FC1),out=new Mat();
        try{
            float[] xs=new float[w*h],ys=new float[w*h];
            for(int y=0;y<h;y++){
                double gy=y*(ny-1.)/(h-1.),fy=gy-Math.floor(gy);
                int y0=Math.min(ny-2,(int)Math.floor(gy));
                for(int x=0;x<w;x++){
                    double gx=x*(nx-1.)/(w-1.),fx=gx-Math.floor(gx);
                    int x0=Math.min(nx-2,(int)Math.floor(gx)),k=y*w+x;
                    double[] a=grid[y0][x0],b=grid[y0][x0+1],c=grid[y0+1][x0],d=grid[y0+1][x0+1];
                    double dx=(1-fy)*((1-fx)*a[0]+fx*b[0])+fy*((1-fx)*c[0]+fx*d[0]);
                    double dy=(1-fy)*((1-fx)*a[1]+fx*b[1])+fy*((1-fx)*c[1]+fx*d[1]);
                    xs[k]=(float)Math.max(0,Math.min(w-1,x+dx));
                    ys[k]=(float)Math.max(0,Math.min(h-1,y+dy));
                }
            }
            xmap.put(0,0,xs);ymap.put(0,0,ys);
            Imgproc.remap(rgba,out,xmap,ymap,Imgproc.INTER_LINEAR,
               Core.BORDER_REPLICATE,new Scalar(255,255,255,255));
            return out;
        }finally{xmap.release();ymap.release();}
    }

    @PluginMethod
    public void reconstruct(PluginCall call){
        JSONArray photos=call.getArray("images");
        if(photos==null||photos.length()<2||photos.length()>4){
            call.reject("3D requires 2 to 4 different-angle images of the same physical page");return;
        }
        getBridge().execute(()->{
            ArrayList<Bitmap> bitmaps=new ArrayList<>();
            ArrayList<Mat> frames=new ArrayList<>();
            Mat result=null;
            try{
                // Work with one bounded resolution; evidence never leaves device.
                final int w=640,h=832;
                for(int i=0;i<photos.length();i++){
                    Bitmap b=decode(photos.getString(i),w,h);
                    bitmaps.add(b);
                    Mat frame=new Mat();Utils.bitmapToMat(b,frame);frames.add(frame);
                }
                Reconstruction best=null;
                long start=System.nanoTime();
                for(int i=1;i<frames.size();i++){
                    Reconstruction candidate=triangulate(frames.get(0),frames.get(i),w,h);
                    if(best==null||candidate.confidence>best.confidence)best=candidate;
                }
                if(best==null||best.anchors.isEmpty()){
                    call.reject("3D reconstruction abstained: "+(best==null?"No suitable camera view":best.failure));
                    return;
                }
                result=flatten(frames.get(0),best,w,h);
                Bitmap corrected=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);
                try{
                    Utils.matToBitmap(result,corrected);
                    ByteArrayOutputStream out=new ByteArrayOutputStream();
                    corrected.compress(Bitmap.CompressFormat.JPEG,95,out);
                    JSObject response=new JSObject();
                    response.put("imageBase64",Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP));
                    response.put("width",w);response.put("height",h);
                    response.put("triangulatedPoints",best.anchors.size());
                    response.put("ransacInliers",best.inliers);
                    response.put("featureMatches",best.matches);
                    response.put("relativeDepthSpread",best.depthSpread);
                    response.put("confidence",best.confidence);
                    response.put("surfaceModel","orb-essential-rotation-translation-triangulation");
                    response.put("metricDepth",false);
                    response.put("approximateCameraCalibration",true);
                    response.put("physical3DRelative",true);
                    response.put("requiresHumanReview",true);
                    response.put("elapsedMs",(System.nanoTime()-start)/1000000L);
                    call.resolve(response);
                }finally{corrected.recycle();}
            }catch(Throwable error){call.reject("3D page reconstruction unavailable: "+error.getMessage());}
            finally{
                if(result!=null)result.release();
                for(Mat m:frames)m.release();
                for(Bitmap bmp:bitmaps)bmp.recycle();
            }
        });
    }
}
