package com.ribhlab.ribhmeasure;

import android.Manifest;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.Locale;

public final class GpsMeasureActivity extends BaseActivity implements LocationListener {
    private static final int LOCATION_PERMISSION=124;
    private final ArrayList<Geometry.Pt> points=new ArrayList<>();
    private boolean area,walking;
    private Location current;
    private LocationManager locationManager;
    private TextView accuracy,result,secondary,count;
    private Button walkButton,saveButton;
    private GpsSketchView sketch;
    @Override public void onCreate(Bundle b){super.onCreate(b);area=getIntent().getBooleanExtra("area",true);
        if(b!=null){walking=false;double[] coords=b.getDoubleArray("coords");
            if(coords!=null)for(int i=0;i+1<coords.length;i+=2)points.add(new Geometry.Pt(coords[i],coords[i+1]));}
        locationManager=(LocationManager)getSystemService(LOCATION_SERVICE);render();refresh();
    }
    private void render(){
        LinearLayout root=Ui.vertical(this);root.setBackgroundColor(Ui.BG);
        LinearLayout body=Ui.column(this,area?R.string.gps_area:R.string.gps_distance);
        Ui.desc(body,this,R.string.gps_disclaimer);
        accuracy=Ui.text(this,getString(R.string.gps_waiting),14,Ui.GOLD,true);body.addView(accuracy);Ui.gap(this,body,12);
        sketch=new GpsSketchView(this,area);body.addView(sketch,new LinearLayout.LayoutParams(-1,Ui.dp(this,260)));Ui.gap(this,body,12);
        count=Ui.text(this,"",14,Ui.SUB,false);body.addView(count);
        result=Ui.text(this,"",29,Ui.TEAL,true);body.addView(result);
        secondary=Ui.text(this,"",16,Ui.TEXT,false);body.addView(secondary);Ui.gap(this,body,17);
        Button add=Ui.button(this,R.string.add_point,true);add.setOnClickListener(v->addCurrent(false));body.addView(add,Ui.lp(this,53));Ui.gap(this,body,9);
        walkButton=Ui.button(this,R.string.walk_start,false);walkButton.setOnClickListener(v->{
            if(!hasPermission()){askPermission();return;}
            walking=!walking;
            if(walking&&points.isEmpty())addCurrent(false);
            walkButton.setText(walking?R.string.walk_stop:R.string.walk_start);
        });body.addView(walkButton,Ui.lp(this,53));Ui.gap(this,body,9);
        LinearLayout controls=new LinearLayout(this);controls.setOrientation(LinearLayout.HORIZONTAL);
        Button undo=Ui.button(this,R.string.undo,false);undo.setOnClickListener(v->{if(!points.isEmpty()){points.remove(points.size()-1);refresh();}});
        controls.addView(undo,new LinearLayout.LayoutParams(0,Ui.dp(this,50),1));
        View sep=new View(this);controls.addView(sep,new LinearLayout.LayoutParams(Ui.dp(this,7),1));
        Button clear=Ui.button(this,R.string.clear,false);clear.setOnClickListener(v->{points.clear();walking=false;walkButton.setText(R.string.walk_start);refresh();});
        controls.addView(clear,new LinearLayout.LayoutParams(0,Ui.dp(this,50),1));body.addView(controls);Ui.gap(this,body,14);
        saveButton=Ui.button(this,R.string.save,true);saveButton.setOnClickListener(v->save());body.addView(saveButton,Ui.lp(this,54));Ui.gap(this,body,14);
        Ui.desc(body,this,R.string.hint_gps);
        root.addView(Ui.scroll(this,body),new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
    }
    private boolean hasPermission(){return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED;}
    private void askPermission(){requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION_PERMISSION);}
    @Override protected void onResume(){super.onResume();if(hasPermission())startLocations();else askPermission();}
    private void startLocations(){
        try{
            if(locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER))locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER,1000,1f,this);
            if(locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER))locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER,1500,1f,this);
            if(!locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)&&!locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER))accuracy.setText(R.string.gps_waiting);
        }catch(SecurityException ignored){Ui.toast(this,R.string.gps_permission);}
    }
    @Override protected void onPause(){super.onPause();walking=false;if(walkButton!=null)walkButton.setText(R.string.walk_start);locationManager.removeUpdates(this);}
    @Override public void onRequestPermissionsResult(int req,String[] perms,int[] result){super.onRequestPermissionsResult(req,perms,result);
        if(req==LOCATION_PERMISSION){if(hasPermission())startLocations();else accuracy.setText(R.string.gps_permission);}}
    @Override public void onLocationChanged(Location l){
        if(l==null||!l.hasAccuracy())return;
        if(current==null||l.getAccuracy()<current.getAccuracy()||l.getElapsedRealtimeNanos()-current.getElapsedRealtimeNanos()>5000000000L)current=l;
        accuracy.setText(getString(R.string.gps_accuracy)+": "+String.format(Locale.getDefault(),"±%.0f m",current.getAccuracy()));
        accuracy.setTextColor(current.getAccuracy()<=20?Ui.TEAL:Ui.GOLD);
        if(walking&&l.getAccuracy()<=25f&&isFresh(l))addPoint(l,true);
    }
    private boolean isFresh(Location l){return (SystemClock.elapsedRealtimeNanos()-l.getElapsedRealtimeNanos())/1000000<15000;}
    private void addCurrent(boolean automatic){
        if(!hasPermission()){askPermission();return;}
        if(current==null||!isFresh(current)){Ui.toast(this,R.string.gps_waiting);return;}
        if(current.getAccuracy()>35){Ui.toast(this,R.string.poor_accuracy);return;}
        addPoint(current,automatic);
    }
    private void addPoint(Location loc,boolean automatic){
        Geometry.Pt p=new Geometry.Pt(loc.getLatitude(),loc.getLongitude());
        if(!points.isEmpty()){
            double d=Geometry.distance(points.get(points.size()-1),p);
            if(d<(automatic?5.0:1.0)){if(!automatic)Ui.toast(this,R.string.record_more);return;}
        }
        points.add(p);refresh();
    }
    private void refresh(){
        count.setText(getString(R.string.point_count)+": "+points.size());sketch.setPoints(points);
        double length=Geometry.path(points);
        if(area){double a=Geometry.area(points),per=Geometry.perimeter(points);
            result.setText(getString(R.string.area)+": "+Ui.area(this,a));
            secondary.setText(getString(R.string.perimeter)+": "+Ui.length(this,per));
            saveButton.setEnabled(points.size()>=3);saveButton.setAlpha(points.size()>=3?1:.5f);
        }else{
            result.setText(getString(R.string.route_distance)+": "+Ui.length(this,length));
            double direct=points.size()>=2?Geometry.distance(points.get(0),points.get(points.size()-1)):0;
            secondary.setText(getString(R.string.straight_distance)+": "+Ui.length(this,direct));
            saveButton.setEnabled(points.size()>=2);saveButton.setAlpha(points.size()>=2?1:.5f);
        }
    }
    private void save(){
        if(points.size()<(area?3:2)){Ui.toast(this,area?R.string.need_three:R.string.no_points);return;}
        walking=false;walkButton.setText(R.string.walk_start);
        double value=area?Geometry.area(points):Geometry.path(points);
        Measurements.add(this,area?"GPS Area":"GPS Distance",value,area?"m²":"m",points.size()+" GPS points");
    }
    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);
        double[] arr=new double[points.size()*2];for(int i=0;i<points.size();i++){arr[i*2]=points.get(i).lat;arr[i*2+1]=points.get(i).lon;}state.putDoubleArray("coords",arr);
    }
}
