package com.ribhlab.ribhmeasure;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.view.MotionEvent;
import android.view.View;
import java.util.ArrayList;

/** Calibrated image measurement: four taps, in original bitmap pixel coordinates. */
final class PhotoMeasureView extends View {
    interface Listener{void onPointsChanged(int count);}
    private Bitmap bitmap;
    private final Paint paint=new Paint(3);
    private final ArrayList<Float> taps=new ArrayList<>();
    private Listener listener;
    private float scale,offsetX,offsetY;
    PhotoMeasureView(Context c){super(c);setMinimumHeight(Ui.dp(c,340));}
    void setListener(Listener l){listener=l;}
    void setImage(Bitmap b){bitmap=b;taps.clear();invalidate();notifyListener();}
    void reset(){taps.clear();invalidate();notifyListener();}
    int count(){return taps.size()/2;}
    float[] coords(){float[] x=new float[taps.size()];for(int i=0;i<x.length;i++)x[i]=taps.get(i);return x;}
    @Override protected void onDraw(Canvas c){
        super.onDraw(c);int w=getWidth(),h=getHeight();
        paint.setColor(Ui.CARD);paint.setStyle(Paint.Style.FILL);c.drawRoundRect(0,0,w,h,Ui.dp(getContext(),16),Ui.dp(getContext(),16),paint);
        if(bitmap==null)return;
        scale=Math.min((float)w/bitmap.getWidth(),(float)h/bitmap.getHeight());
        offsetX=(w-bitmap.getWidth()*scale)/2f;offsetY=(h-bitmap.getHeight()*scale)/2f;
        c.save();c.translate(offsetX,offsetY);c.scale(scale,scale);paint.setColor(0xffffffff);
        c.drawBitmap(bitmap,0,0,paint);c.restore();
        for(int i=0;i<count();i++){
            float x=offsetX+taps.get(i*2)*scale,y=offsetY+taps.get(i*2+1)*scale;
            paint.setColor(i<2?Ui.GOLD:Ui.TEAL);paint.setStrokeWidth(Ui.dp(getContext(),3));
            c.drawCircle(x,y,Ui.dp(getContext(),6),paint);
            c.drawLine(x-Ui.dp(getContext(),10),y,x+Ui.dp(getContext(),10),y,paint);
            c.drawLine(x,y-Ui.dp(getContext(),10),x,y+Ui.dp(getContext(),10),paint);
            paint.setColor(Ui.TEXT);paint.setTextSize(Ui.dp(getContext(),15));c.drawText(""+(i+1),x+Ui.dp(getContext(),8),y-Ui.dp(getContext(),8),paint);
        }
        for(int i=0;i+1<count();i+=2){
            paint.setColor(i==0?Ui.GOLD:Ui.TEAL);paint.setStrokeWidth(Ui.dp(getContext(),3));
            c.drawLine(offsetX+taps.get(i*2)*scale,offsetY+taps.get(i*2+1)*scale,
                offsetX+taps.get((i+1)*2)*scale,offsetY+taps.get((i+1)*2+1)*scale,paint);
        }
    }
    @Override public boolean onTouchEvent(MotionEvent event){
        if(event.getAction()!=MotionEvent.ACTION_UP)return true;
        if(bitmap==null||count()>=4||scale<=0)return true;
        float x=(event.getX()-offsetX)/scale,y=(event.getY()-offsetY)/scale;
        if(x<0||y<0||x>bitmap.getWidth()||y>bitmap.getHeight())return true;
        taps.add(x);taps.add(y);invalidate();notifyListener();return true;
    }
    private void notifyListener(){if(listener!=null)listener.onPointsChanged(count());}
}
