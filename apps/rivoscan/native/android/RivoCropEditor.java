package com.ribhlab.rivoscan;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
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
    private boolean detected=false;
    private boolean manuallyAdjusted=false;
    private int cornerRevision=0;
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint loupePaint=new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final Paint decoration=new Paint(Paint.ANTI_ALIAS_FLAG);

    public RivoCropEditor(Context ctx){super(ctx);setBackgroundColor(Color.rgb(5,46,52));}
    private float dp(float n){return n*getResources().getDisplayMetrics().density;}

    public void setDocument(Bitmap source,Point[] detected){
        bitmap=source;this.detected=detected!=null;
        corners=detected!=null?detected:RivoEdgeDetector.fallback();
        selected=-1;manuallyAdjusted=false;cornerRevision++;invalidate();
    }
    public int getCornerRevision(){return cornerRevision;}
    public Bitmap getDocument(){return bitmap;}
    /** Preserve manual drag against stale automatic edge detection. */
    public boolean updateDetectedCorners(Point[] result,boolean forced){
        if(bitmap==null||bitmap.isRecycled()||(!forced&&manuallyAdjusted))return false;
        if(result==null)return false;
        detected=true;
        corners=result;
        selected=-1;manuallyAdjusted=false;cornerRevision++;invalidate();return true;
    }
    public Point[] getCorners(){return corners;}
    public void useAutoCorners(){
        if(bitmap==null)return;
        Point[] result=RivoEdgeDetector.detect(bitmap);
        updateDetectedCorners(result,true);
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
        // A continuous turquoise outline avoids the confusing dashed guide.
        paint.setPathEffect(null);
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
    private boolean isValidMove(int moved,double x,double y){
        double[] ax=new double[4],ay=new double[4];
        for(int i=0;i<4;i++){
            ax[i]=i==moved?x:corners[i].x;
            ay[i]=i==moved?y:corners[i].y;
        }
        double sign=0,area=0;
        for(int i=0;i<4;i++){
            int next=(i+1)%4,following=(i+2)%4;
            double dx=ax[next]-ax[i],dy=ay[next]-ay[i];
            if(Math.hypot(dx,dy)<.026)return false;
            double cross=dx*(ay[following]-ay[next])-dy*(ax[following]-ax[next]);
            if(Math.abs(cross)<.0005)return false;
            if(sign==0)sign=Math.signum(cross);
            else if(Math.signum(cross)!=sign)return false;
            area+=ax[i]*ay[next]-ax[next]*ay[i];
        }
        return Math.abs(area)>.025;
    }
    @Override public boolean onTouchEvent(MotionEvent event){
        if(bitmap==null||bitmap.isRecycled())return false;
        int action=event.getActionMasked();
        if(action==MotionEvent.ACTION_DOWN){
            double best=Double.MAX_VALUE;selected=-1;
            for(int i=0;i<4;i++){
                double d=Math.hypot(event.getX()-px(corners[i]),event.getY()-py(corners[i]));
                if(d<best){best=d;selected=i;}
            }
            if(best>dp(60))selected=-1;
            if(selected>=0){getParent().requestDisallowInterceptTouchEvent(true);invalidate();return true;}
            return false;
        }
        if(action==MotionEvent.ACTION_MOVE&&selected>=0){
            if(scale<=0)return true;
            double x=(event.getX()-left)/(bitmap.getWidth()*scale);
            double y=(event.getY()-top)/(bitmap.getHeight()*scale);
            // Keep the crop convex and non-degenerate so perspective
            // correction never silently flips or loses the chosen target.
            double nextX=Math.max(0,Math.min(1,x));
            double nextY=Math.max(0,Math.min(1,y));
            if(isValidMove(selected,nextX,nextY)){
                corners[selected].x=nextX;
                corners[selected].y=nextY;
                manuallyAdjusted=true;cornerRevision++;invalidate();
            }
            return true;
        }
        if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_CANCEL){
            selected=-1;invalidate();return true;
        }
        return selected>=0;
    }
}
