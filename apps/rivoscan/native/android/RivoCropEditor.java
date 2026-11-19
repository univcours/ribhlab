package com.ribhlab.rivoscan;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.DashPathEffect;
import android.graphics.Rect;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.view.View;
import org.opencv.core.Point;

/** Interactive four-corner crop editor with a real image loupe during precise dragging. */
public final class RivoCropEditor extends View {
    private Bitmap bitmap;
    private Point[] corners=RivoEdgeDetector.fallback();
    private float left,top,scale;
    private int selected=-1;
    private int activePointerId=-1;
    private double startCornerX,startCornerY;
    // Preserve the touch-to-handle offset so the document corner never jumps under a finger.
    private float touchOffsetX,touchOffsetY;
    private boolean detected=false;
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint loupePaint=new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final Paint decoration=new Paint(Paint.ANTI_ALIAS_FLAG);

    public RivoCropEditor(Context ctx){super(ctx);setBackgroundColor(Color.rgb(5,46,52));}
    private float dp(float n){return n*getResources().getDisplayMetrics().density;}

    public void setDocument(Bitmap source,Point[] detected){
        bitmap=source;this.detected=detected!=null&&detected.length==4;
        Point[] initial=this.detected?detected:RivoEdgeDetector.fallback();
        corners=new Point[4];
        for(int i=0;i<4;i++)corners[i]=new Point(initial[i].x,initial[i].y);
        selected=-1;activePointerId=-1;invalidate();
    }
    public Point[] getCorners(){return corners;}
    public void useAutoCorners(){
        if(bitmap==null)return;
        Point[] result=RivoEdgeDetector.detect(bitmap);
        setDocument(bitmap,result);
    }
    private float px(Point p){return left+(float)p.x*bitmap.getWidth()*scale;}
    private float py(Point p){return top+(float)p.y*bitmap.getHeight()*scale;}
    @Override protected void onDraw(Canvas canvas){
        super.onDraw(canvas);
        if(bitmap==null||bitmap.isRecycled())return;
        scale=Math.min(getWidth()/(float)bitmap.getWidth(),getHeight()/(float)bitmap.getHeight());
        float width=bitmap.getWidth()*scale,height=bitmap.getHeight()*scale;
        left=(getWidth()-width)/2f;top=(getHeight()-height)/2f;
        paint.setStyle(Paint.Style.FILL);paint.setColor(Color.WHITE);paint.setAlpha(255);
        canvas.drawBitmap(bitmap,null,new RectF(left,top,left+width,top+height),paint);
        Path path=new Path();path.moveTo(px(corners[0]),py(corners[0]));
        for(int i=1;i<4;i++)path.lineTo(px(corners[i]),py(corners[i]));
        path.close();
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(detected?Color.argb(29,49,106,235):Color.argb(12,49,106,235));
        canvas.drawPath(path,paint);
        paint.setColor(detected?Color.rgb(32,220,198):Color.rgb(110,232,211));
        paint.setStrokeWidth(dp(2.5f));paint.setStyle(Paint.Style.STROKE);
        paint.setPathEffect(detected?null:new DashPathEffect(new float[]{dp(9),dp(6)},0));
        canvas.drawPath(path,paint);
        paint.setPathEffect(null);
        paint.setStyle(Paint.Style.FILL);
        for(int i=0;i<4;i++){
            paint.setColor(Color.WHITE);canvas.drawCircle(px(corners[i]),py(corners[i]),dp(10),paint);
            paint.setColor(Color.rgb(13,152,148));canvas.drawCircle(px(corners[i]),py(corners[i]),dp(7),paint);
        }
        if(selected>=0)drawLoupe(canvas);
    }

    /** Magnifies actual bitmap pixels under the selected corner, not a scaled screenshot.
     * Keep the preview on the opposite side of the image and away from the finger. */
    private void drawLoupe(Canvas canvas){
        Point corner=corners[selected];
        float radius=Math.min(dp(64),Math.max(dp(43),getWidth()*.19f));
        float margin=dp(16);
        float targetX=px(corner),targetY=py(corner);
        float cx=targetX<getWidth()/2f?getWidth()-radius-margin:radius+margin;
        // Avoid covering whichever corner the finger is currently dragging.
        float cy=targetY<getHeight()*.42f?getHeight()-radius-margin:radius+margin;
        cy=Math.max(radius+margin,Math.min(getHeight()-radius-margin,cy));
        float sourceX=(float)corner.x*bitmap.getWidth();
        float sourceY=(float)corner.y*bitmap.getHeight();
        // About 7-10x relative to the fitted page view on typical phone screens.
        float sourceRadius=Math.max(25f,Math.min(bitmap.getWidth(),bitmap.getHeight())*.045f);
        float x0=Math.max(0,sourceX-sourceRadius),y0=Math.max(0,sourceY-sourceRadius);
        float x1=Math.min(bitmap.getWidth(),sourceX+sourceRadius),y1=Math.min(bitmap.getHeight(),sourceY+sourceRadius);
        if(x1<=x0||y1<=y0)return;

        decoration.setStyle(Paint.Style.FILL);decoration.setColor(Color.rgb(6,48,53));
        canvas.drawCircle(cx,cy,radius+dp(5),decoration);
        Path clip=new Path();clip.addCircle(cx,cy,radius,Path.Direction.CW);
        canvas.save();canvas.clipPath(clip);
        // Keep the source point at the exact center, including at the photo edges.
        float ratio=radius/sourceRadius;
        Rect src=new Rect((int)x0,(int)y0,(int)Math.ceil(x1),(int)Math.ceil(y1));
        RectF dst=new RectF(cx+(x0-sourceX)*ratio,cy+(y0-sourceY)*ratio,
            cx+(x1-sourceX)*ratio,cy+(y1-sourceY)*ratio);
        decoration.setColor(Color.rgb(225,230,237));
        canvas.drawCircle(cx,cy,radius,decoration);
        canvas.drawBitmap(bitmap,src,dst,loupePaint);
        decoration.setStyle(Paint.Style.STROKE);
        decoration.setStrokeWidth(dp(1.3f));decoration.setColor(Color.WHITE);
        canvas.drawLine(cx-radius,cy,cx+radius,cy,decoration);
        canvas.drawLine(cx,cy-radius,cx,cy+radius,decoration);
        decoration.setStrokeWidth(dp(2));decoration.setColor(Color.rgb(11,162,151));
        canvas.drawCircle(cx,cy,dp(5),decoration);
        canvas.restore();
        decoration.setStrokeWidth(dp(3));decoration.setStyle(Paint.Style.STROKE);
        decoration.setColor(Color.WHITE);canvas.drawCircle(cx,cy,radius,decoration);
        decoration.setStrokeWidth(dp(2));decoration.setColor(Color.rgb(32,220,198));
        canvas.drawCircle(cx,cy,radius+dp(3),decoration);
        decoration.setStyle(Paint.Style.FILL);
    }
    /**
     * Keep the page corners in TL, TR, BR, BL order and prevent folds or
     * crossed handles that would generate a degenerate perspective transform.
     */
    private boolean validMove(int moving,double x,double y){
        double[] xs=new double[4],ys=new double[4];
        for(int i=0;i<4;i++){
            xs[i]=i==moving?x:corners[i].x;
            ys[i]=i==moving?y:corners[i].y;
        }
        double signedArea=0;
        for(int i=0;i<4;i++){
            int next=(i+1)%4;
            signedArea+=xs[i]*ys[next]-xs[next]*ys[i];
            double dx=xs[next]-xs[i],dy=ys[next]-ys[i];
            if(dx*dx+dy*dy<.0004)return false;
        }
        if(signedArea<.024)return false;
        // The four consecutive turns must stay convex in image coordinates.
        for(int i=0;i<4;i++){
            int b=(i+1)%4,c=(i+2)%4;
            double cross=(xs[b]-xs[i])*(ys[c]-ys[b])
                -(ys[b]-ys[i])*(xs[c]-xs[b]);
            if(cross<=.0002)return false;
        }
        return true;
    }

    private void finishDrag(boolean cancelled){
        if(selected<0)return;
        if(cancelled){
            corners[selected].x=startCornerX;
            corners[selected].y=startCornerY;
        }else performClick();
        selected=-1;
        activePointerId=-1;
        invalidate();
    }

    @Override public boolean performClick(){
        super.performClick();
        return true;
    }

    @Override public boolean onTouchEvent(MotionEvent event){
        if(bitmap==null||bitmap.isRecycled())return false;
        int action=event.getActionMasked();
        if(action==MotionEvent.ACTION_DOWN){
            if(scale<=0)return false;
            double best=Double.MAX_VALUE;
            selected=-1;
            for(int i=0;i<4;i++){
                double d=Math.hypot(event.getX()-px(corners[i]),event.getY()-py(corners[i]));
                if(d<best){best=d;selected=i;}
            }
            if(best>dp(60)){selected=-1;return false;}
            activePointerId=event.getPointerId(0);
            startCornerX=corners[selected].x;
            startCornerY=corners[selected].y;
            touchOffsetX=px(corners[selected])-event.getX();
            touchOffsetY=py(corners[selected])-event.getY();
            if(getParent()!=null)getParent().requestDisallowInterceptTouchEvent(true);
            invalidate();
            return true;
        }
        if(selected<0)return false;
        if(action==MotionEvent.ACTION_MOVE){
            int pointer=event.findPointerIndex(activePointerId);
            if(pointer<0||scale<=0)return true;
            double x=(event.getX(pointer)+touchOffsetX-left)/(bitmap.getWidth()*scale);
            double y=(event.getY(pointer)+touchOffsetY-top)/(bitmap.getHeight()*scale);
            x=Math.max(0,Math.min(1,x));
            y=Math.max(0,Math.min(1,y));
            if(validMove(selected,x,y)){
                corners[selected].x=x;
                corners[selected].y=y;
                invalidate();
            }
            return true;
        }
        if(action==MotionEvent.ACTION_POINTER_UP){
            if(event.getPointerId(event.getActionIndex())==activePointerId)finishDrag(false);
            return true;
        }
        if(action==MotionEvent.ACTION_UP){finishDrag(false);return true;}
        if(action==MotionEvent.ACTION_CANCEL){finishDrag(true);return true;}
        return true;
    }
}
