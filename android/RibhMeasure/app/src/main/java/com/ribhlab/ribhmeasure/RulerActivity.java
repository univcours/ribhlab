package com.ribhlab.ribhmeasure;

import android.graphics.Canvas;
import android.graphics.Paint;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import java.util.Locale;

public final class RulerActivity extends BaseActivity {
    private TextView result;
    private RulerView ruler;
    @Override public void onCreate(Bundle state){super.onCreate(state);
        LinearLayout body=Ui.column(this,R.string.ruler);
        Ui.desc(body,this,R.string.calibration_note);
        result=Ui.text(this,"",27,Ui.TEAL,true);body.addView(result);Ui.gap(this,body,10);
        ruler=new RulerView();body.addView(ruler,new LinearLayout.LayoutParams(-1,Ui.dp(this,290)));Ui.gap(this,body,20);
        Ui.title(body,this,R.string.calibration);
        SeekBar seek=new SeekBar(this);seek.setMax(400);seek.setProgress(Math.round((Prefs.rulerFactor(this)-.8f)*1000));
        body.addView(seek,Ui.lp(this,45));
        seek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            public void onProgressChanged(SeekBar b,int value,boolean user){
                float factor=.8f+value/1000f;Prefs.db(RulerActivity.this).edit().putFloat("ruler_calibration",factor).apply();
                ruler.invalidate();refresh();
            }
            public void onStartTrackingTouch(SeekBar b){}public void onStopTrackingTouch(SeekBar b){}
        });
        Ui.gap(this,body,15);
        android.widget.Button save=Ui.button(this,R.string.save,true);save.setOnClickListener(v->Measurements.add(this,"Screen ruler",ruler.distanceCm(),"cm","Calibrated screen measurement"));body.addView(save,Ui.lp(this,54));
        Ui.gap(this,body,18);Ui.desc(body,this,R.string.calibration_note);
        LinearLayout outer=Ui.vertical(this);outer.setBackgroundColor(Ui.BG);
        outer.addView(Ui.scroll(this,body),new LinearLayout.LayoutParams(-1,0,1));setContentView(outer);refresh();
    }
    private void refresh(){if(result!=null&&ruler!=null)result.setText(getString(R.string.display_length)+": "+Ui.length(this,ruler.distanceCm()/100));}
    private final class RulerView extends View {
        private final Paint p=new Paint(3);private float first=.15f,second=.78f;private int selected=1;
        RulerView(){super(RulerActivity.this);setBackground(Ui.shape(Ui.CARD,Ui.dp(RulerActivity.this,18)));}
        @Override protected void onSizeChanged(int w,int h,int oldW,int oldH){super.onSizeChanged(w,h,oldW,oldH);refresh();}
        double distanceCm(){return Math.abs(first-second)*Math.max(1,getWidth())/getResources().getDisplayMetrics().xdpi*2.54/Prefs.rulerFactor(RulerActivity.this);}
        @Override protected void onDraw(Canvas c){super.onDraw(c);int w=getWidth(),h=getHeight();
            float dpi=getResources().getDisplayMetrics().xdpi*Prefs.rulerFactor(RulerActivity.this);
            float pixelsPerMm=dpi/25.4f;
            float y=h*.32f;
            p.setColor(Ui.SUB);p.setStrokeWidth(Ui.dp(RulerActivity.this,1));
            if(pixelsPerMm>0){int ticks=(int)(w/pixelsPerMm);
                for(int i=0;i<=ticks;i++){
                    float x=i*pixelsPerMm;float length=i%10==0?Ui.dp(RulerActivity.this,31):i%5==0?Ui.dp(RulerActivity.this,20):Ui.dp(RulerActivity.this,11);
                    c.drawLine(x,y,x,y+length,p);
                    if(i%10==0){p.setTextSize(Ui.dp(RulerActivity.this,11));c.drawText(""+(i/10),x+Ui.dp(RulerActivity.this,2),y-Ui.dp(RulerActivity.this,8),p);}
                }
            }
            float a=first*w,b=second*w;
            p.setColor(Ui.TEAL);p.setStrokeWidth(Ui.dp(RulerActivity.this,3));c.drawLine(a,h*.61f,b,h*.61f,p);
            for(int i=0;i<2;i++){
                float x=i==0?a:b;p.setColor(i==0?Ui.GOLD:Ui.TEAL);
                c.drawLine(x,h*.49f,x,h*.82f,p);c.drawCircle(x,h*.62f,Ui.dp(RulerActivity.this,11),p);
            }
            p.setTextSize(Ui.dp(RulerActivity.this,15));p.setColor(Ui.TEXT);c.drawText("cm",Ui.dp(RulerActivity.this,12),h-Ui.dp(RulerActivity.this,14),p);
        }
        @Override public boolean onTouchEvent(MotionEvent e){float x=Math.max(0,Math.min(1,e.getX()/Math.max(1f,getWidth())));
            if(e.getAction()==MotionEvent.ACTION_DOWN){selected=Math.abs(x-first)<Math.abs(x-second)?0:1;return true;}
            if(e.getAction()==MotionEvent.ACTION_MOVE||e.getAction()==MotionEvent.ACTION_UP){if(selected==0)first=x;else second=x;invalidate();refresh();return true;}return true;
        }
    }
}
