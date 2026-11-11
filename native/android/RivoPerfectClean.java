package com.ribhlab.rivoscan;

import android.content.ContentResolver;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import org.json.JSONArray;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.util.Arrays;

/**
 * Offline PERFECT CLEAN finishing pass for images already cropped by Google's
 * ML Kit Document Scanner FULL. This is NOT a second camera or edge detector.
 *
 * Non-generative, chroma-safe illumination equalization: large background
 * shadows are whitened while dark pen strokes and colored stamps are left
 * unchanged. Lossless originals remain with Google until PDF import succeeds.
 * A failure returns control to the caller, which imports the exact Google PDF.
 */
final class RivoPerfectClean {
    private static final int GRID=28;
    private static final int MAX_SIDE=3300;
    private static final long MAX_PIXELS=8_000_000L;
    private RivoPerfectClean(){}

    static File createPdf(Context context, JSONArray images) throws Exception {
        if(images==null||images.length()<1||images.length()>25)
            throw new IllegalArgumentException("Unsupported page count for PerfectClean");
        PdfDocument pdf=new PdfDocument();
        File output=null;
        boolean finished=false;
        try {
            ContentResolver resolver=context.getContentResolver();
            for(int i=0;i<images.length();i++){
                Uri uri=Uri.parse(images.getString(i));
                String scheme=uri.getScheme();
                if(!"content".equals(scheme)&&!"file".equals(scheme))
                    throw new SecurityException("Unexpected scanned image URI");
                if("file".equals(scheme)){
                    File imageFile=new File(uri.getPath()).getCanonicalFile();
                    File cache=context.getCacheDir().getCanonicalFile();
                    if(!imageFile.getPath().startsWith(cache.getPath()+File.separator))
                        throw new SecurityException("Scanned image outside app cache");
                }
                Bitmap page=loadBounded(resolver,uri);
                Bitmap clean=null;
                try {
                    clean=normalizePaper(page);
                    boolean landscape=page.getWidth()>page.getHeight();
                    int pageWidth=landscape?842:595, pageHeight=landscape?595:842;
                    PdfDocument.PageInfo spec=new PdfDocument.PageInfo.Builder(pageWidth,pageHeight,i+1).create();
                    PdfDocument.Page canvasPage=pdf.startPage(spec);
                    try {
                        Canvas canvas=canvasPage.getCanvas();
                        canvas.drawColor(Color.WHITE);
                        float scale=Math.min(pageWidth/(float)clean.getWidth(),pageHeight/(float)clean.getHeight());
                        float x=(pageWidth-clean.getWidth()*scale)/2;
                        float y=(pageHeight-clean.getHeight()*scale)/2;
                        Paint paint=new Paint(Paint.FILTER_BITMAP_FLAG|Paint.DITHER_FLAG);
                        canvas.drawBitmap(clean,null,new RectF(x,y,x+clean.getWidth()*scale,y+clean.getHeight()*scale),paint);
                    }finally{pdf.finishPage(canvasPage);}
                }finally{
                    if(clean!=null&&!clean.isRecycled())clean.recycle();
                    if(!page.isRecycled())page.recycle();
                }
            }
            output=File.createTempFile("rivo_perfectclean_",".pdf",context.getCacheDir());
            try(FileOutputStream stream=new FileOutputStream(output)){
                pdf.writeTo(stream);
                stream.flush();
            }
            if(output.length()<512 || output.length()>200L*1024L*1024L)
                throw new IOException("Generated PDF is invalid or too large");
            finished=true;
            return output;
        }finally{
            pdf.close();
            if(!finished && output!=null)output.delete();
        }
    }

    private static Bitmap loadBounded(ContentResolver resolver,Uri uri) throws IOException {
        BitmapFactory.Options info=new BitmapFactory.Options();
        info.inJustDecodeBounds=true;
        try(InputStream input=resolver.openInputStream(uri)){
            if(input==null)throw new IOException("Image not available");
            BitmapFactory.decodeStream(input,null,info);
        }
        if(info.outWidth<100||info.outHeight<100)
            throw new IOException("Image has invalid dimensions");
        int sample=1;
        while(Math.max(info.outWidth,info.outHeight)/(double)sample>MAX_SIDE
            || (long)Math.ceil(info.outWidth/(double)sample)*Math.ceil(info.outHeight/(double)sample)>MAX_PIXELS) {
            sample*=2;
            if(sample>16)throw new IOException("Image exceeds supported dimensions");
        }
        BitmapFactory.Options decode=new BitmapFactory.Options();
        decode.inSampleSize=sample;
        decode.inPreferredConfig=Bitmap.Config.ARGB_8888;
        try(InputStream input=resolver.openInputStream(uri)){
            if(input==null)throw new IOException("Image not available");
            Bitmap result=BitmapFactory.decodeStream(input,null,decode);
            if(result==null)throw new IOException("Cannot decode scanned image");
            return result;
        }
    }

    /** Per-tile bright paper estimate: upper quantile ignores most text strokes. */
    private static float[][] background(Bitmap image) {
        int width=image.getWidth(),height=image.getHeight();
        float[][] field=new float[GRID][GRID];
        int[] samples=new int[25];
        for(int gy=0;gy<GRID;gy++)for(int gx=0;gx<GRID;gx++){
            int idx=0;
            for(int sy=0;sy<5;sy++)for(int sx=0;sx<5;sx++){
                int px=Math.min(width-1,Math.max(0,(int)(((gx+(sx+.5)/5.0)/GRID)*width)));
                int py=Math.min(height-1,Math.max(0,(int)(((gy+(sy+.5)/5.0)/GRID)*height)));
                int rgb=image.getPixel(px,py);
                samples[idx++]=(Color.red(rgb)*54+Color.green(rgb)*183+Color.blue(rgb)*19)>>8;
            }
            Arrays.sort(samples);
            field[gy][gx]=samples[20]; // 80th percentile = likely white paper
        }
        // Blur sampling artifacts, not the fine ink of the original document.
        float[][] soft=new float[GRID][GRID];
        for(int y=0;y<GRID;y++)for(int x=0;x<GRID;x++){
            float sum=0;int count=0;
            for(int oy=-1;oy<=1;oy++)for(int ox=-1;ox<=1;ox++){
                int yy=Math.max(0,Math.min(GRID-1,y+oy)),xx=Math.max(0,Math.min(GRID-1,x+ox));
                sum+=field[yy][xx];count++;
            }
            soft[y][x]=sum/count;
        }
        return soft;
    }

    static Bitmap normalizePaper(Bitmap input) {
        int width=input.getWidth(),height=input.getHeight();
        float[][] bg=background(input);
        Bitmap out=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);
        int[] row=new int[width];
        for(int y=0;y<height;y++){
            float yf=(float)y/Math.max(1,height-1)*(GRID-1);
            int y0=(int)yf,y1=Math.min(GRID-1,y0+1);
            float fy=yf-y0;
            input.getPixels(row,0,width,0,y,width,1);
            for(int x=0;x<width;x++){
                int pixel=row[x];
                int red=Color.red(pixel),green=Color.green(pixel),blue=Color.blue(pixel);
                int lo=Math.min(red,Math.min(green,blue)),hi=Math.max(red,Math.max(green,blue));
                float lum=(54*red+183*green+19*blue)/256f;
                // Saturated colored ink, red/blue stamps and dark signatures
                // are NEVER changed. Also protect faint gray text below paper.
                if(hi-lo>30||lum<65)continue;
                float xf=(float)x/Math.max(1,width-1)*(GRID-1);
                int x0=(int)xf,x1=Math.min(GRID-1,x0+1);float fx=xf-x0;
                float a=bg[y0][x0]*(1-fx)+bg[y0][x1]*fx;
                float b=bg[y1][x0]*(1-fx)+bg[y1][x1]*fx;
                float paper=a*(1-fy)+b*fy;
                float diff=paper-lum;
                if(diff>=19)continue; // real gray ink or fine pencil line
                float strength=diff<8?1f:Math.max(0f,(19f-diff)/11f);
                float lift=Math.min(69f,Math.max(0f,247f-paper))*strength;
                if(lift<.4)continue;
                row[x]=Color.rgb(Math.min(255,Math.round(red+lift)),
                    Math.min(255,Math.round(green+lift)),
                    Math.min(255,Math.round(blue+lift)));
            }
            out.setPixels(row,0,width,0,y,width,1);
        }
        return out;
    }
}
