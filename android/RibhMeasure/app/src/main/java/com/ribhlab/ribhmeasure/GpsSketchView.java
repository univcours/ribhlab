package com.ribhlab.ribhmeasure;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.view.View;
import java.util.ArrayList;
import java.util.List;

/** Offline vector sketch of GPS points: not a street map. */
final class GpsSketchView extends View {
    private final Paint p=new Paint(3);
    private List<Geometry.Pt> points=new ArrayList<>();
    private boolean area;
    GpsSketchView(Context c,boolean area){super(c);this.area=area;setMinimumHeight(Ui.dp(c,230));}
    void setPoints(List<Geometry.Pt> list){points=new ArrayList<>(list);invalidate();}
    @Override protected void onDraw(Canvas c){
        super.onDraw(c);int w=getWidth(),h=getHeight();
        p.setColor(Ui.CARD);p.setStyle(Paint.Style.FILL);c.drawRoundRect(0,0,w,h,Ui.dp(getContext(),16),Ui.dp(getContext(),16),p);
        p.setColor(0xff25455a);p.setStrokeWidth(Ui.dp(getContext(),1));
        for(int i=1;i<6;i++){c.drawLine(w*i/6f,0,w*i/6f,h,p);c.drawLine(0,h*i/6f,w,h*i/6f,p);}
        if(points.size()==0){p.setColor(Ui.SUB);p.setTextSize(Ui.dp(getContext(),14));c.drawText("GPS",w/2f-Ui.dp(getContext(),14),h/2f,p);return;}
        double lat0=0,lon0=0;for(Geometry.Pt x:points){lat0+=x.lat;lon0+=x.lon;}
        lat0=Math.toRadians(lat0/points.size());lon0/=points.size();
        float[] xs=new float[points.size()],ys=new float[points.size()];
        float minx=Float.MAX_VALUE,miny=Float.MAX_VALUE,maxx=-Float.MAX_VALUE,maxy=-Float.MAX_VALUE;
        for(int i=0;i<points.size();i++){
            Geometry.Pt t=points.get(i);xs[i]=(float)((t.lon-lon0)*Math.cos(lat0));ys[i]=(float)t.lat;
            minx=Math.min(minx,xs[i]);maxx=Math.max(maxx,xs[i]);miny=Math.min(miny,ys[i]);maxy=Math.max(maxy,ys[i]);
        }
        float spreadX=Math.max(maxx-minx,0.000015f),spreadY=Math.max(maxy-miny,0.000015f);
        float padding=Ui.dp(getContext(),34);
        float scale=Math.min((w-2*padding)/spreadX,(h-2*padding)/spreadY);
        float centerX=(maxx+minx)*.5f,centerY=(maxy+miny)*.5f;
        for(int i=0;i<points.size();i++){xs[i]=w/2f+(xs[i]-centerX)*scale;ys[i]=h/2f-(ys[i]-centerY)*scale;}
        p.setStyle(Paint.Style.STROKE);p.setColor(Ui.TEAL);p.setStrokeWidth(Ui.dp(getContext(),3));
        for(int i=1;i<points.size();i++)c.drawLine(xs[i-1],ys[i-1],xs[i],ys[i],p);
        if(area&&points.size()>=3)c.drawLine(xs[points.size()-1],ys[points.size()-1],xs[0],ys[0],p);
        p.setStyle(Paint.Style.FILL);p.setTextSize(Ui.dp(getContext(),12));
        for(int i=0;i<points.size();i++){
            p.setColor(Ui.TEAL);c.drawCircle(xs[i],ys[i],Ui.dp(getContext(),5),p);
            p.setColor(Ui.TEXT);c.drawText(""+(i+1),xs[i]+Ui.dp(getContext(),7),ys[i]-Ui.dp(getContext(),7),p);
        }
    }
}
