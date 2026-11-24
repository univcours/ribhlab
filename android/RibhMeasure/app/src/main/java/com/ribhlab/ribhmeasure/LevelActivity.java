package com.ribhlab.ribhmeasure;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.Locale;

public final class LevelActivity extends BaseActivity implements SensorEventListener {
    private SensorManager sensorManager;private Sensor accel;
    private TextView angles;
    private Bubble bubble;
    @Override public void onCreate(Bundle b){super.onCreate(b);
        sensorManager=(SensorManager)getSystemService(SENSOR_SERVICE);accel=sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        LinearLayout root=Ui.vertical(this);root.setBackgroundColor(Ui.BG);
        LinearLayout body=Ui.column(this,R.string.level);
        Ui.desc(body,this,R.string.level_note);
        bubble=new Bubble(this);body.addView(bubble,new LinearLayout.LayoutParams(-1,Ui.dp(this,330)));
        Ui.gap(this,body,17);angles=Ui.text(this,"",22,Ui.TEAL,true);body.addView(angles);
        if(accel==null)body.addView(Ui.text(this,getString(R.string.level_unavailable),14,Ui.GOLD,true));
        root.addView(Ui.scroll(this,body),new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
    }
    @Override protected void onResume(){super.onResume();if(accel!=null)sensorManager.registerListener(this,accel,SensorManager.SENSOR_DELAY_UI);}
    @Override protected void onPause(){super.onPause();sensorManager.unregisterListener(this);}
    @Override public void onAccuracyChanged(Sensor s,int a){}
    @Override public void onSensorChanged(SensorEvent e){
        if(e.sensor.getType()!=Sensor.TYPE_ACCELEROMETER)return;
        // Assumes screen-facing-up and phone lying flat for a surface level.
        double x=e.values[0],y=e.values[1],z=e.values[2];
        double roll=Math.toDegrees(Math.atan2(x,Math.sqrt(y*y+z*z)));
        double pitch=Math.toDegrees(Math.atan2(y,Math.sqrt(x*x+z*z)));
        bubble.setAngles((float)roll,(float)pitch);
        angles.setText(String.format(Locale.getDefault(),"%s: %.1f°    %s: %.1f°",getString(R.string.roll),roll,getString(R.string.pitch),pitch));
    }
    private static final class Bubble extends View {
        private float roll,pitch;
        private final Paint p=new Paint(3);
        Bubble(Context c){super(c);}
        void setAngles(float r,float t){roll=r;pitch=t;invalidate();}
        @Override protected void onDraw(Canvas c){super.onDraw(c);float size=Math.min(getWidth(),getHeight())*.75f;
            float cx=getWidth()/2f,cy=getHeight()/2f;
            p.setStyle(Paint.Style.FILL);p.setColor(Ui.CARD);c.drawCircle(cx,cy,size/2+Ui.dp(getContext(),16),p);
            p.setColor(Ui.CARD2);c.drawCircle(cx,cy,size/2,p);
            p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(Ui.dp(getContext(),2));p.setColor(Ui.SUB);
            c.drawCircle(cx,cy,size/4,p);c.drawLine(cx-size/2,cy,cx+size/2,cy,p);c.drawLine(cx,cy-size/2,cx,cy+size/2,p);
            p.setStyle(Paint.Style.FILL);p.setColor(Math.abs(roll)<2&&Math.abs(pitch)<2?Ui.TEAL:Ui.GOLD);
            float bx=cx+Math.max(-1,Math.min(1,roll/25f))*size*.37f;
            float by=cy+Math.max(-1,Math.min(1,pitch/25f))*size*.37f;
            c.drawCircle(bx,by,Ui.dp(getContext(),20),p);
        }
    }
}
