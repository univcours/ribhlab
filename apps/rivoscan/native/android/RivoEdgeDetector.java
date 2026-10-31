package com.ribhlab.rivoscan;

import android.graphics.Bitmap;
import org.opencv.android.Utils;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfPoint;
import org.opencv.core.MatOfPoint2f;
import org.opencv.core.Point;
import org.opencv.core.Size;
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
        Mat small=new Mat(),blur=new Mat(),edges=new Mat(),closed=new Mat(),kernel=new Mat();
        List<MatOfPoint> contours=new ArrayList<>();
        try {
            Imgproc.resize(source,small,new Size(Math.round(w*factor),Math.round(h*factor)));
            Imgproc.GaussianBlur(small,blur,new Size(5,5),0);
            Imgproc.Canny(blur,edges,45,125);
            kernel=Imgproc.getStructuringElement(Imgproc.MORPH_RECT,new Size(5,5));
            Imgproc.morphologyEx(edges,closed,Imgproc.MORPH_CLOSE,kernel);
            Imgproc.findContours(closed,contours,new Mat(),Imgproc.RETR_LIST,Imgproc.CHAIN_APPROX_SIMPLE);
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
                    // Largest plausible quadrilateral, preferring a full page with a visible margin.
                    double score=area/imageArea;
                    if(score>bestScore){bestScore=score;best=pts;}
                }finally{curve.release();approx.release();}
            }
            return best;
        } finally {
            for(MatOfPoint c:contours)c.release();
            small.release();blur.release();edges.release();closed.release();kernel.release();
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
