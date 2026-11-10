package com.ribhlab.rivoscan;

import android.graphics.Bitmap;
import org.opencv.android.Utils;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfDouble;
import org.opencv.core.MatOfPoint;
import org.opencv.core.MatOfPoint2f;
import org.opencv.core.Point;
import org.opencv.core.Size;
import org.opencv.core.Rect;
import org.opencv.imgproc.Imgproc;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/** Camera-frame and gallery-page contour detector. No external service. */
final class RivoEdgeDetector {
    private RivoEdgeDetector() {}

    /** Points ordered TL, TR, BR, BL; coordinates in [0,1]. */
    static Point[] detect(Bitmap bitmap) {
        Mat rgba = new Mat(), gray = new Mat();
        try {
            Utils.bitmapToMat(bitmap, rgba);
            Imgproc.cvtColor(rgba, gray, Imgproc.COLOR_RGBA2GRAY);
            return detectGray(gray);
        } finally { rgba.release(); gray.release(); }
    }

    static Point[] detectGray(Mat source) {return detectGray(source,900);}
    /** Max edge length is reduced only for LIVE CameraX frames. Still images use 900px
     * plus full-resolution crop handles; neither preview nor saved image is fabricated. */
    static Point[] detectGray(Mat source,int maxLongSide) {
        if(source.empty() || source.width()<40 || source.height()<40) return null;
        int w=source.width(),h=source.height();
        double factor=Math.min(1.0,Math.max(360,Math.min(1250,maxLongSide))/(double)Math.max(w,h));
        Mat small=new Mat(),blur=new Mat(),edges=new Mat(),closed=new Mat(),kernel=new Mat(),hierarchy=new Mat();
        List<MatOfPoint> contours=new ArrayList<>();
        try {
            Imgproc.resize(source,small,new Size(Math.round(w*factor),Math.round(h*factor)));
            // Adaptive Canny thresholds: fixed contrast thresholds miss
            // pale paper on dark desks and over-detect noisy dark surfaces.
            Imgproc.GaussianBlur(small,blur,new Size(5,5),1.2);
            // Stage 1: bright sheets/receipts on darker desks can have
            // wrinkled or torn edges, so a strict 4-corner edge fit fails.
            // Segment a high-contrast central light object and estimate
            // its bounding quadrilateral. Reject weakly contrasted surfaces.
            Point[] lightPaper=detectLightPaper(blur);
            if(lightPaper!=null)return lightPaper;
            MatOfDouble mean=new MatOfDouble(), stdDev=new MatOfDouble();
            double contrast=30;
            try{
                Core.meanStdDev(blur,mean,stdDev);
                contrast=stdDev.get(0,0)[0];
            }finally{mean.release();stdDev.release();}
            double low=Math.max(24,Math.min(90,contrast*0.9));
            Imgproc.Canny(blur,edges,low,Math.max(80,Math.min(210,low*2.4)));
            kernel=Imgproc.getStructuringElement(Imgproc.MORPH_RECT,new Size(5,5));
            Imgproc.morphologyEx(edges,closed,Imgproc.MORPH_CLOSE,kernel);
            Imgproc.findContours(closed,contours,hierarchy,Imgproc.RETR_LIST,Imgproc.CHAIN_APPROX_SIMPLE);
            double imageArea=small.width()*(double)small.height();
            double bestScore=0;
            Point[] best=null;
            for(MatOfPoint c:contours) {
                double area=Imgproc.contourArea(c);
                if(area<imageArea*.12 || area>imageArea*.985)continue;
                MatOfPoint2f curve=new MatOfPoint2f(c.toArray());
                MatOfPoint2f approx=new MatOfPoint2f();
                try {
                    double peri=Imgproc.arcLength(curve,true);
                    Imgproc.approxPolyDP(curve,approx,.025*peri,true);
                    if(approx.total()!=4)continue;
                    MatOfPoint rounded=new MatOfPoint(approx.toArray());
                    boolean convex=Imgproc.isContourConvex(rounded);
                    rounded.release();
                    if(!convex)continue;
                    Point[] pts=order(approx.toArray());
                    double minX=1,minY=1,maxX=0,maxY=0;
                    for(Point p:pts){p.x/=small.width();p.y/=small.height();minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
                    if(maxX-minX<.25||maxY-minY<.25)continue;
                    // Reject strongly skewed/random quadrilaterals, weight
                    // document-like right angles as well as coverage.
                    double anglePenalty=0;
                    for(int k=0;k<4;k++){
                        Point prev=pts[(k+3)%4],now=pts[k],next=pts[(k+1)%4];
                        double ax=prev.x-now.x,ay=prev.y-now.y;
                        double bx=next.x-now.x,by=next.y-now.y;
                        double denom=Math.hypot(ax,ay)*Math.hypot(bx,by);
                        if(denom<1e-5){anglePenalty=4;break;}
                        anglePenalty+=Math.abs((ax*bx+ay*by)/denom);
                    }
                    if(anglePenalty>1.55)continue;
                    double coverage=area/imageArea;
                    double centered=1.0-Math.min(1.0,
                        Math.abs((minX+maxX)/2.0-0.5)+Math.abs((minY+maxY)/2.0-0.5));
                    double score=coverage*(1.0-0.22*Math.min(1,anglePenalty))+
                        0.08*centered;
                    if(score>bestScore){bestScore=score;best=pts;}
                }finally{curve.release();approx.release();}
            }
            return best;
        } finally {
            for(MatOfPoint c:contours)c.release();
            small.release();blur.release();edges.release();closed.release();kernel.release();hierarchy.release();
        }
    }

    /**
     * High-contrast pale paper or receipt over a dark surface.
     * Uses Otsu + morphology to bridge small tears and folds; confidence checks
     * prevent an entire desk or bright wall from being labeled as a document.
     */
    private static Point[] detectLightPaper(Mat gray) {
        // Accurate skewed corners, NOT an axis-aligned bounding rectangle.
        // Otsu on the luminance plane is cheap for bright paper over darker desks.
        Mat mask=new Mat(),clean=new Mat(),kernel=new Mat(),hierarchy=new Mat();
        Mat inner=new Mat(),outer=new Mat();
        List<MatOfPoint> contours=new ArrayList<>();
        try{
            int w=gray.width(),h=gray.height();
            if(w<70||h<70)return null;
            Imgproc.threshold(gray,mask,0,255,Imgproc.THRESH_BINARY+Imgproc.THRESH_OTSU);
            kernel=Imgproc.getStructuringElement(Imgproc.MORPH_ELLIPSE,new Size(7,7));
            Imgproc.morphologyEx(mask,clean,Imgproc.MORPH_CLOSE,kernel);
            Imgproc.findContours(clean,contours,hierarchy,Imgproc.RETR_EXTERNAL,Imgproc.CHAIN_APPROX_SIMPLE);
            double frameArea=(double)w*h,best=0;
            Point[] winner=null;
            for(int index=0;index<contours.size();index++){
                MatOfPoint contour=contours.get(index);
                double area=Imgproc.contourArea(contour),fraction=area/frameArea;
                if(fraction<.085||fraction>.89)continue;
                Rect bounds=Imgproc.boundingRect(contour);
                if(bounds.width<.26*w||bounds.height<.22*h)continue;
                if(bounds.x<.017*w||bounds.y<.017*h
                    ||bounds.x+bounds.width>.983*w||bounds.y+bounds.height>.983*h)continue;
                double cx=(bounds.x+bounds.width*.5)/w,cy=(bounds.y+bounds.height*.5)/h;
                if(Math.abs(cx-.5)>.29||Math.abs(cy-.5)>.30)continue;
                // Only accept a genuine four-point contour. The previous detector
                // returned boundingRect() corners and chopped off tilted page edges.
                MatOfPoint2f curve=new MatOfPoint2f(contour.toArray());
                MatOfPoint2f quad=new MatOfPoint2f();
                try{
                    double perimeter=Imgproc.arcLength(curve,true);
                    Point[] corners=null;
                    for(double epsilon:new double[]{.013,.020,.028,.038}){
                        Imgproc.approxPolyDP(curve,quad,epsilon*perimeter,true);
                        if(quad.total()==4){
                            MatOfPoint round=new MatOfPoint(quad.toArray());
                            boolean convex=Imgproc.isContourConvex(round);round.release();
                            if(convex){corners=order(quad.toArray());break;}
                        }
                    }
                    if(corners==null)continue;
                    inner=Mat.zeros(h,w,CvType.CV_8UC1);
                    Imgproc.drawContours(inner,contours,index,new org.opencv.core.Scalar(255),-1);
                    outer=new Mat();Core.bitwise_not(inner,outer);
                    double inside=Core.mean(gray,inner).val[0],outside=Core.mean(gray,outer).val[0];
                    inner.release();inner=new Mat();outer.release();outer=new Mat();
                    if(inside<105||inside-outside<24)continue;
                    double sumX=0,sumY=0,penalty=0;
                    for(int j=0;j<4;j++){
                        Point p=corners[j],prev=corners[(j+3)%4],next=corners[(j+1)%4];
                        sumX+=p.x/w;sumY+=p.y/h;
                        double ax=prev.x-p.x,ay=prev.y-p.y,bx=next.x-p.x,by=next.y-p.y;
                        double len=Math.hypot(ax,ay)*Math.hypot(bx,by);
                        if(len<.001){penalty=5;break;}
                        penalty+=Math.abs((ax*bx+ay*by)/len);
                    }
                    if(penalty>1.48)continue;
                    double score=area/frameArea*.52+(inside-outside)/255*.34
                        +(.15*(1-Math.min(1,penalty))) 
                        -(.1*(Math.abs(sumX/4-.5)+Math.abs(sumY/4-.5)));
                    if(score>best){
                        best=score;
                        winner=new Point[4];
                        for(int j=0;j<4;j++)
                            winner[j]=new Point(Math.max(0,Math.min(1,corners[j].x/w)),
                                                Math.max(0,Math.min(1,corners[j].y/h)));
                    }
                }finally{curve.release();quad.release();}
            }
            return winner;
        }catch(Exception error){
            return null; // Contrasts can vary; regular Canny quadrilateral fallback runs next.
        }finally{
            for(MatOfPoint c:contours)c.release();
            mask.release();clean.release();kernel.release();hierarchy.release();
            inner.release();outer.release();
        }
    }

    static Point[] fallback() {
        return new Point[]{new Point(.17,.20),new Point(.83,.20),new Point(.83,.80),new Point(.17,.80)};
    }

    static Point[] order(Point[] input) {
        // Sort clockwise around the centroid, then rotate so top-left comes first.
        // A simple "top two / bottom two" failed when the paper was tilted.
        Point[] p=Arrays.copyOf(input,4);
        double midX=0,midY=0;
        for(Point q:p){midX+=q.x;midY+=q.y;}
        final double cx=midX/4,cy=midY/4;
        Arrays.sort(p,Comparator.comparingDouble(q->Math.atan2(q.y-cy,q.x-cx)));
        int first=0;double best=Double.POSITIVE_INFINITY;
        for(int i=0;i<4;i++){double sum=p[i].x+p[i].y;if(sum<best){best=sum;first=i;}}
        return new Point[]{p[first],p[(first+1)%4],p[(first+2)%4],p[(first+3)%4]};
    }

    /** Perspective correct at document-readable resolution without upscaling fabricated detail. */
    static Bitmap warp(Bitmap bitmap,Point[] normalized) {
        return warp(bitmap,normalized,3100);
    }
    static Bitmap warp(Bitmap bitmap,Point[] normalized,int maxLongSide) {
        int w=bitmap.getWidth(),h=bitmap.getHeight();
        Point[] q=new Point[4];
        for(int i=0;i<4;i++)q[i]=new Point(Math.max(0,Math.min(1,normalized[i].x))*(w-1),Math.max(0,Math.min(1,normalized[i].y))*(h-1));
        int width=(int)Math.round(Math.max(distance(q[0],q[1]),distance(q[3],q[2])));
        int height=(int)Math.round(Math.max(distance(q[0],q[3]),distance(q[1],q[2])));
        if(width<80||height<80)throw new IllegalArgumentException("Move corners to outline a document.");
        // A4 300dpi is ~3508px tall. Preserve more real ink detail in HD
        // when available, bounded to avoid OOM in OpenCV processing.
        double target=Math.max(1700,Math.min(3400,maxLongSide));
        double shrink=Math.min(1.,target/Math.max(width,height));
        width=Math.max(1,(int)Math.round(width*shrink));height=Math.max(1,(int)Math.round(height*shrink));
        Mat source=new Mat(),out=new Mat(),matrix=new Mat();
        MatOfPoint2f src=new MatOfPoint2f(q),dst=new MatOfPoint2f(
            new Point(0,0),new Point(width-1,0),new Point(width-1,height-1),new Point(0,height-1));
        try{
            Utils.bitmapToMat(bitmap,source);
            matrix=Imgproc.getPerspectiveTransform(src,dst);
            Imgproc.warpPerspective(source,out,matrix,new Size(width,height),Imgproc.INTER_LINEAR,Core.BORDER_CONSTANT);
            Bitmap result=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);
            Utils.matToBitmap(out,result);
            return result;
        }finally{src.release();dst.release();source.release();out.release();matrix.release();}
    }

    private static double distance(Point a,Point b){return Math.hypot(a.x-b.x,a.y-b.y);}
}
