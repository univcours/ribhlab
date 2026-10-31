package com.ribhlab.rivoscan;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.DashPathEffect;
import android.view.MotionEvent;
import android.view.View;
import org.opencv.core.Point;

/** Interactive four-corner crop overlay. Fingers drag the highlighted corner handles. */
public final class RivoCropEditor extends View {
    private Bitmap bitmap;
    private Point[] corners=RivoEdgeDetector.fallback();
    private float left,top,scale;
    private int selected=-1;
    private boolean detected=false;
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);

    public RivoCropEditor(Context ctx){super(ctx);setBackgroundColor(Color.rgb(20,27,43));}

    public void setDocument(Bitmap source,Point[] detected){
        bitmap=source;this.detected=detected!=null;corners=detected!=null?detected:RivoEdgeDetector.fallback();
        invalidate();
    }
    public Point[] getCorners(){return corners;}
    public void useAutoCorners(){
        if(bitmap==null)return;
        Point[] result=RivoEdgeDetector.detect(bitmap);
        detected=result!=null;corners=result!=null?result:RivoEdgeDetector.fallback();invalidate();
    }
    private float px(Point p){return left+(float)p.x*bitmap.getWidth()*scale;}
    private float py(Point p){return top+(float)p.y*bitmap.getHeight()*scale;}
    @Override protected void onDraw(Canvas canvas){
        super.onDraw(canvas);
        if(bitmap==null)return;
        scale=Math.min(getWidth()/(float)bitmap.getWidth(),getHeight()/(float)bitmap.getHeight());
        float width=bitmap.getWidth()*scale,height=bitmap.getHeight()*scale;
        left=(getWidth()-width)/2f;top=(getHeight()-height)/2f;
        paint.setStyle(Paint.Style.FILL);paint.setColor(Color.WHITE);paint.setAlpha(255);
        canvas.drawBitmap(bitmap,null,new android.graphics.RectF(left,top,left+width,top+height),paint);
        Path path=new Path();path.moveTo(px(corners[0]),py(corners[0]));
        for(int i=1;i<4;i++)path.lineTo(px(corners[i]),py(corners[i]));path.close();
        paint.setStyle(Paint.Style.FILL);paint.setColor(detected?Color.argb(29,49,106,235):Color.argb(12,49,106,235));canvas.drawPath(path,paint);
        paint.setColor(detected?Color.rgb(61,134,255):Color.rgb(122,162,243));paint.setStrokeWidth(5);paint.setStyle(Paint.Style.STROKE);
        paint.setPathEffect(detected?null:new DashPathEffect(new float[]{18,11},0));
        canvas.drawPath(path,paint);
        paint.setPathEffect(null);
        paint.setStyle(Paint.Style.FILL);
        for(int i=0;i<4;i++){
            paint.setColor(Color.WHITE);canvas.drawCircle(px(corners[i]),py(corners[i]),19,paint);
            paint.setColor(Color.rgb(49,91,219));canvas.drawCircle(px(corners[i]),py(corners[i]),13,paint);
        }
    }
    @Override public boolean onTouchEvent(MotionEvent event){
        if(bitmap==null)return false;
        if(event.getActionMasked()==MotionEvent.ACTION_DOWN){
            double best=Double.MAX_VALUE;selected=-1;
            for(int i=0;i<4;i++){
                double d=Math.hypot(event.getX()-px(corners[i]),event.getY()-py(corners[i]));
                if(d<best){best=d;selected=i;}
            }
            if(best>100)selected=-1;
            return selected>=0;
        }
        if(event.getActionMasked()==MotionEvent.ACTION_MOVE&&selected>=0){
            double x=(event.getX()-left)/(bitmap.getWidth()*scale);
            double y=(event.getY()-top)/(bitmap.getHeight()*scale);
            corners[selected].x=Math.max(0,Math.min(1,x));
            corners[selected].y=Math.max(0,Math.min(1,y));
            invalidate();return true;
        }
        if(event.getActionMasked()==MotionEvent.ACTION_UP||event.getActionMasked()==MotionEvent.ACTION_CANCEL){selected=-1;return true;}
        return true;
    }
}
