package com.ribhlab.rivoscan;

import android.graphics.Bitmap;
import org.opencv.android.Utils;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.imgproc.Imgproc;
import org.opencv.imgproc.CLAHE;
import java.util.ArrayList;
import java.util.List;

/**
 * Offline document-image cleaning following the four-corner perspective crop.
 * Reduces fold SHADING and uneven illumination; does not invent lost detail
 * or straighten truly curved, non-planar paper surfaces.
 */
final class RivoDocumentEnhancer {
    static final String ORIGINAL="original",AUTO="auto",ENHANCE="enhance",MAGIC="magic",
        SHADOW="shadow",BW="bw",WHITEBOARD="whiteboard";
    private RivoDocumentEnhancer(){}
    static boolean isSupportedMode(String mode){
        return ORIGINAL.equals(mode)||AUTO.equals(mode)||ENHANCE.equals(mode)||
            MAGIC.equals(mode)||SHADOW.equals(mode)||BW.equals(mode)||WHITEBOARD.equals(mode);
    }

    static Bitmap apply(Bitmap image,String mode){
        if(image==null||image.isRecycled())throw new IllegalArgumentException("Missing scanned page");
        if(ORIGINAL.equals(mode))return image.copy(Bitmap.Config.ARGB_8888,false);
        Mat rgba=new Mat(),rgb=new Mat(),lab=new Mat(),gray=new Mat();
        Mat background=new Mat(),normal=new Mat(),equalized=new Mat();
        Mat smooth=new Mat(),sharp=new Mat(),output=new Mat(),originalRGB=new Mat();
        List<Mat> channels=new ArrayList<>();
        try {
            Utils.bitmapToMat(image,rgba);
            Imgproc.cvtColor(rgba,rgb,Imgproc.COLOR_RGBA2RGB);
            if(AUTO.equals(mode)||WHITEBOARD.equals(mode))rgb.copyTo(originalRGB);
            if(BW.equals(mode)){
                Imgproc.cvtColor(rgb,gray,Imgproc.COLOR_RGB2GRAY);
                // Large-scale paper illumination: reduce shadows caused by folds,
                // fingers and uneven light without erasing ink strokes.
                int sigma=Math.max(14,Math.min(46,Math.min(gray.width(),gray.height())/25));
                Imgproc.GaussianBlur(gray,background,new Size(0,0),sigma);
                Core.add(background,Scalar.all(9),background);
                Core.divide(gray,background,normal,242);
                CLAHE local=Imgproc.createCLAHE(WHITEBOARD.equals(mode)?1.65:1.8,new Size(8,8));
                try{local.apply(normal,equalized);}finally{local.collectGarbage();}
                // Adaptive threshold follows locally uneven page brightness.
                int block=WHITEBOARD.equals(mode)?39:29;
                int subtract=WHITEBOARD.equals(mode)?9:12;
                Imgproc.adaptiveThreshold(equalized,output,255,Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C,
                    Imgproc.THRESH_BINARY,block,subtract);
                Imgproc.cvtColor(output,output,Imgproc.COLOR_GRAY2RGBA);
            }else{
                Imgproc.cvtColor(rgb,lab,Imgproc.COLOR_RGB2Lab);
                Core.split(lab,channels);
                Mat lum=channels.get(0);
                boolean mild=SHADOW.equals(mode)||WHITEBOARD.equals(mode);
                double sigma=Math.max(13,Math.min(55,Math.min(lum.width(),lum.height())/24.));
                Imgproc.GaussianBlur(lum,background,new Size(0,0),sigma);
                Core.add(background,Scalar.all(12),background);
                Core.divide(lum,background,normal,mild?232:244);
                CLAHE local=Imgproc.createCLAHE(MAGIC.equals(mode)?2.5:(mild?1.25:(AUTO.equals(mode)?1.45:1.7)),new Size(8,8));
                try{local.apply(normal,equalized);}finally{local.collectGarbage();}
                // Crisp but restrained strokes; excessive sharpening amplifies noise
                // and produces artificial halos around handwriting.
                Imgproc.GaussianBlur(equalized,smooth,new Size(0,0),.95);
                Core.addWeighted(equalized,MAGIC.equals(mode)?1.28:1.14,
                    smooth,MAGIC.equals(mode)?-.28:-.14,0,sharp);
                channels.get(0).release();
                channels.set(0,sharp.clone());
                Core.merge(channels,lab);
                Imgproc.cvtColor(lab,rgb,Imgproc.COLOR_Lab2RGB);
                if(AUTO.equals(mode)||WHITEBOARD.equals(mode)){
                    // Normalize dull paper while retaining low-contrast writing.
                    Core.addWeighted(rgb,0.82,originalRGB,0.18,0,rgb);
                    // Preserve saturated original stamp ink (blue/red/green) explicitly:
                    // brightness normalization must not wash out official stamp colors.
                    Mat hsv=new Mat(),stampMask=new Mat();
                    try{
                        Imgproc.cvtColor(originalRGB,hsv,Imgproc.COLOR_RGB2HSV);
                        Core.inRange(hsv,new Scalar(0,38,42),new Scalar(179,255,255),stampMask);
                        originalRGB.copyTo(rgb,stampMask);
                    }finally{hsv.release();stampMask.release();}
                }
                Imgproc.cvtColor(rgb,output,Imgproc.COLOR_RGB2RGBA);
            }
            Bitmap result=Bitmap.createBitmap(output.cols(),output.rows(),Bitmap.Config.ARGB_8888);
            Utils.matToBitmap(output,result);
            return result;
        }finally{
            rgba.release();rgb.release();lab.release();gray.release();background.release();
            normal.release();equalized.release();smooth.release();sharp.release();output.release();originalRGB.release();
            for(Mat part:channels)part.release();
        }
    }
}
