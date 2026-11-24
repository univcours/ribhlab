package com.ribhlab.ribhmeasure;

import java.util.*;

/** Reconstructs the boundary from finite observed wall segments, without assuming convexity.
 * The sign of a wall normal is irrelevant: the tangent interval defines its endpoints.
 * Ambiguous endpoint pairs and disconnected observations must not create a room. */
final class WallLoop {
    private static final double MIN_EDGE = .40, MAX_GAP = .65, PARALLEL = .12;
    private static final class Wall {
        final double nx,nz,d,lo,hi;
        Wall(float[] w) {nx=w[0];nz=w[1];d=w[2];lo=w[3];hi=w[4];}
        double tangent(double x,double z){return -nz*x+nx*z;}
        double end(int side){return side==0?lo:hi;}
        double length(){return hi-lo;}
    }
    private static final class Join {
        int other; float[] point; double score;
        Join(int other,float[] point,double score){this.other=other;this.point=point;this.score=score;}
    }

    static float[][] solve(List<float[]> observations,float x,float z) {
        if(!Float.isFinite(x)||!Float.isFinite(z))return empty();
        ArrayList<Wall> walls=new ArrayList<>();
        for(float[] v:observations){
            if(v==null||v.length<5)continue;
            boolean valid=true;for(int i=0;i<5;i++)valid&=Float.isFinite(v[i]);if(!valid)continue;
            Wall w=new Wall(v); if(w.length()<MIN_EDGE||Math.abs(Math.hypot(w.nx,w.nz)-1)>.03)continue;
            boolean duplicate=false;
            for(int i=0;i<walls.size();i++){
                Wall a=walls.get(i);double dot=a.nx*w.nx+a.nz*w.nz;
                if(Math.abs(dot)<.996||Math.abs(a.d-Math.copySign(1,dot)*w.d)>.16)continue;
                double low=dot>0?w.lo:-w.hi,high=dot>0?w.hi:-w.lo;
                if(Math.min(high,a.hi)-Math.max(low,a.lo)<-.15)continue;
                walls.set(i,new Wall(new float[]{(float)a.nx,(float)a.nz,(float)a.d,(float)Math.min(low,a.lo),(float)Math.max(high,a.hi)}));duplicate=true;break;
            }
            if(!duplicate)walls.add(w);
        }
        int n=walls.size(); if(n<3||n>30)return empty();
        Join[] joins=new Join[2*n];boolean[] ambiguous=new boolean[2*n];
        for(int i=0;i<n;i++)for(int j=i+1;j<n;j++){
            Wall a=walls.get(i),b=walls.get(j);double det=a.nx*b.nz-b.nx*a.nz;
            if(Math.abs(det)<PARALLEL)continue;
            double px=(a.d*b.nz-b.d*a.nz)/det,pz=(a.nx*b.d-b.nx*a.d)/det;
            double at=a.tangent(px,pz),bt=b.tangent(px,pz);
            int sa=Math.abs(at-a.lo)<Math.abs(at-a.hi)?0:1,sb=Math.abs(bt-b.lo)<Math.abs(bt-b.hi)?0:1;
            double ga=Math.abs(at-a.end(sa)),gb=Math.abs(bt-b.end(sb));
            double ta=Math.min(MAX_GAP,Math.max(.23,a.length()*.28)),tb=Math.min(MAX_GAP,Math.max(.23,b.length()*.28));
            if(ga>ta||gb>tb)continue;
            float[] p={(float)px,(float)pz};double score=ga+gb;
            offer(joins,ambiguous,2*i+sa,2*j+sb,p,score);offer(joins,ambiguous,2*j+sb,2*i+sa,p,score);
        }
        for(int i=0;i<joins.length;i++){
            Join j=joins[i];if(j==null||ambiguous[i]||joins[j.other]==null||joins[j.other].other!=i)return empty();
        }
        ArrayList<float[]> corners=new ArrayList<>();boolean[] visited=new boolean[n];int entry=0;
        for(int k=0;k<n;k++){
            int wall=entry/2;if(visited[wall])return empty();visited[wall]=true;
            corners.add(joins[entry].point);
            int exit=entry^1;float[] p=joins[entry].point,q=joins[exit].point;
            if(Math.hypot(p[0]-q[0],p[1]-q[1])<MIN_EDGE)return empty();
            entry=joins[exit].other;
        }
        if(entry!=0)return empty();
        float[][] out=corners.toArray(new float[0][]);
        double area=RoomMath.area(out);return area>=1&&area<=400&&RoomMath.valid(out)&&contains(out,x,z)?out:empty();
    }
    private static void offer(Join[] joins,boolean[] ambiguous,int i,int other,float[] p,double s){
        Join prev=joins[i];
        if(prev==null||s<prev.score-.07){joins[i]=new Join(other,p,s);ambiguous[i]=false;}
        else if(Math.abs(s-prev.score)<=.07&&prev.other!=other)ambiguous[i]=true;
    }
    static boolean contains(float[][] p,float x,float z){
        boolean inside=false;for(int i=0,j=p.length-1;i<p.length;j=i++){
            float[] a=p[i],b=p[j];
            if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
        }return inside;
    }
    private static float[][] empty(){return new float[0][];}
}
