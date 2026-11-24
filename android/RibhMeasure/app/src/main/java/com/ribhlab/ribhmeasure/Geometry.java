package com.ribhlab.ribhmeasure;

import java.util.List;

/** Small-area local tangent plane; not a substitute for geodetic cadastral survey. */
public final class Geometry {
    private static final double R=6371008.8;
    public static final class Pt {
        public final double lat,lon;
        public Pt(double lat,double lon){this.lat=lat;this.lon=lon;}
    }
    public static double distance(Pt a,Pt b){
        double p1=Math.toRadians(a.lat),p2=Math.toRadians(b.lat);
        double dp=p2-p1,dl=Math.toRadians(b.lon-a.lon);
        double x=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
        return 2*R*Math.atan2(Math.sqrt(Math.max(0,x)),Math.sqrt(Math.max(0,1-x)));
    }
    public static double path(List<Pt> p){double d=0;for(int i=1;i<p.size();i++)d+=distance(p.get(i-1),p.get(i));return d;}
    public static double perimeter(List<Pt> p){ if(p.size()<3)return 0;return path(p)+distance(p.get(p.size()-1),p.get(0)); }
    public static double area(List<Pt> p){
        if(p.size()<3)return 0;
        double lat0=0,lon0=0;
        for(Pt v:p){lat0+=v.lat;lon0+=v.lon;}
        lat0=Math.toRadians(lat0/p.size());lon0=Math.toRadians(lon0/p.size());
        double sum=0;
        for(int i=0;i<p.size();i++){
            Pt a=p.get(i),b=p.get((i+1)%p.size());
            double ax=R*(Math.toRadians(a.lon)-lon0)*Math.cos(lat0);
            double ay=R*(Math.toRadians(a.lat)-lat0);
            double bx=R*(Math.toRadians(b.lon)-lon0)*Math.cos(lat0);
            double by=R*(Math.toRadians(b.lat)-lat0);
            sum+=ax*by-bx*ay;
        }
        return Math.abs(sum)*0.5;
    }
    public static double scaledPhotoLength(double referenceCm,float[] p){
        if(referenceCm<=0||p.length!=8)return Double.NaN;
        double ref=Math.hypot(p[2]-p[0],p[3]-p[1]);
        if(ref<1)return Double.NaN;
        return referenceCm*Math.hypot(p[6]-p[4],p[7]-p[5])/ref;
    }
}
