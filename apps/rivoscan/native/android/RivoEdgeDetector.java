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

    static Point[] detectGray(Mat source) {
        if(source.empty() || source.width()<40 || source.height()<40) return null;
        int w=source.width(),h=source.height();
        double factor=Math.min(1.0,850.0/Math.max(w,h));
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
        Mat mask=new Mat(),clean=new Mat(),kernel=new Mat(),inner=new Mat(),outer=new Mat(),hierarchy=new Mat();
        List<MatOfPoint> contours=new ArrayList<>();
        try {
            int w=gray.width(),h=gray.height();
            if(w<70||h<70)return null;
            Imgproc.threshold(gray,mask,0,255,Imgproc.THRESH_BINARY+Imgproc.THRESH_OTSU);
            kernel=Imgproc.getStructuringElement(Imgproc.MORPH_ELLIPSE,new Size(9,9));
            Imgproc.morphologyEx(mask,clean,Imgproc.MORPH_CLOSE,kernel);
            kernel.release();
            kernel=Imgproc.getStructuringElement(Imgproc.MORPH_ELLIPSE,new Size(5,5));
            Imgproc.morphologyEx(clean,clean,Imgproc.MORPH_OPEN,kernel);
            Imgproc.findContours(clean,contours,hierarchy,Imgproc.RETR_EXTERNAL,Imgproc.CHAIN_APPROX_SIMPLE);
            double frameArea=(double)w*h,best=-1;
            Point[] result=null;
            for (int index=0;index<contours.size();index++) {
                MatOfPoint candidate=contours.get(index);
                double area=Imgproc.contourArea(candidate),fraction=area/frameArea;
                if(fraction<0.055||fraction>0.78)continue;
                Rect r=Imgproc.boundingRect(candidate);
                double rw=r.width/(double)w,rh=r.height/(double)h;
                if(rw<.22||rh<.19||rw>.94||rh>.94)continue;
                // Cropping around a table edge is a dangerous false positive.
                if(r.x<.025*w||r.y<.025*h||r.x+r.width>.975*w||r.y+r.height>.975*h)continue;
                double fill=area/(r.width*(double)r.height);
                if(fill<.58)continue;
                double cx=(r.x+r.width*.5)/w,cy=(r.y+r.height*.5)/h;
                if(Math.abs(cx-.5)>.30||Math.abs(cy-.5)>.31)continue;
                inner=Mat.zeros(h,w,CvType.CV_8UC1);
                Imgproc.drawContours(inner,contours,index,new org.opencv.core.Scalar(255),-1);
                outer=new Mat();
                Core.bitwise_not(inner,outer);
                double inside=Core.mean(gray,inner).val[0],outside=Core.mean(gray,outer).val[0];
                inner.release();inner=new Mat();
                outer.release();outer=new Mat();
                double contrast=inside-outside;
                if(inside<115||contrast<32)continue;
                double score=contrast*.6+fill*28+fraction*18
                    -(Math.abs(cx-.5)+Math.abs(cy-.5))*24;
                if(score<=best)continue;
                best=score;
                // Small safety margin around irregular sheet edges.
                double pad=Math.max(2,Math.min(w,h)*.008);
                double left=Math.max(0,(r.x-pad)/w),top=Math.max(0,(r.y-pad)/h);
                double right=Math.min(1,(r.x+r.width+pad)/w);
                double bottom=Math.min(1,(r.y+r.height+pad)/h);
                result=new Point[]{new Point(left,top),new Point(right,top),
                    new Point(right,bottom),new Point(left,bottom)};
            }
            return result;
        } catch(Exception e) {
            return null; // Gracefully fall back to the quadrilateral detector.
        } finally {
            for(MatOfPoint c:contours)c.release();
            mask.release();clean.release();kernel.release();inner.release();outer.release();hierarchy.release();
        }
    }

    static Point[] fallback() {
        return new Point[]{new Point(.07,.08),new Point(.93,.08),new Point(.93,.92),new Point(.07,.92)};
    }

    static Point[] order(Point[] input) {
        // For nearly rectangular pages: group top two and bottom two, then sort by x.
        Point[] p=Arrays.copyOf(input,4);
        Arrays.sort(p,Comparator.comparingDouble(q->q.y));
        Point[] top={p[0],p[1]},bottom={p[2],p[3]};
        Arrays.sort(top,Comparator.comparingDouble(q->q.x));
        Arrays.sort(bottom,Comparator.comparingDouble(q->q.x));
        return new Point[]{top[0],top[1],bottom[1],bottom[0]};
    }

    /** Apply perspective transform to a color bitmap with user-adjustable corners. */
    static Bitmap warp(Bitmap bitmap,Point[] normalized) {
        int w=bitmap.getWidth(),h=bitmap.getHeight();
        Point[] q=new Point[4];
        for(int i=0;i<4;i++)q[i]=new Point(Math.max(0,Math.min(1,normalized[i].x))*(w-1),Math.max(0,Math.min(1,normalized[i].y))*(h-1));
        int width=(int)Math.round(Math.max(distance(q[0],q[1]),distance(q[3],q[2])));
        int height=(int)Math.round(Math.max(distance(q[0],q[3]),distance(q[1],q[2])));
        if(width<80||height<80)throw new IllegalArgumentException("Move corners to outline a document.");
        double shrink=Math.min(1.,2100./Math.max(width,height));
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
