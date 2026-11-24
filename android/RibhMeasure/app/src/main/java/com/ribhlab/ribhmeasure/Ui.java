package com.ribhlab.ribhmeasure;

import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.util.Locale;

final class Ui {
    static final int BG=0xff07111e, CARD=0xff122336, CARD2=0xff172b40, TEXT=0xffeef9ff, SUB=0xffa6b9c9, TEAL=0xff10bca8, GOLD=0xffffca70;
    static int dp(Context c,float n) { return (int)(n*c.getResources().getDisplayMetrics().density + 0.5f); }
    static GradientDrawable shape(int color,int radius) {
        GradientDrawable x=new GradientDrawable(); x.setColor(color); x.setCornerRadius(radius); return x;
    }
    static TextView text(Context c, CharSequence t,int sp,int color,boolean bold) {
        TextView v=new TextView(c); v.setText(t); v.setTextSize(sp); v.setTextColor(color);
        if(bold)v.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        v.setGravity(Gravity.CENTER_VERTICAL); return v;
    }
    static LinearLayout vertical(Context c){ LinearLayout v=new LinearLayout(c);v.setOrientation(LinearLayout.VERTICAL);return v; }
    static LinearLayout.LayoutParams lp(Context c,int height){return new LinearLayout.LayoutParams(-1,height<0?height:dp(c,height));}
    static void pad(View v,int a){v.setPadding(dp(v.getContext(),a),dp(v.getContext(),a),dp(v.getContext(),a),dp(v.getContext(),a));}
    static Button button(Context c,int textId,boolean primary){
        Button b=new Button(c); b.setText(textId); b.setAllCaps(false); b.setTextSize(15);
        b.setTextColor(primary?BG:TEXT); b.setBackground(shape(primary?TEAL:CARD2,dp(c,14)));
        b.setMinHeight(dp(c,52));return b;
    }
    static LinearLayout card(Context c){ LinearLayout l=vertical(c);l.setBackground(shape(CARD,dp(c,18)));pad(l,16);return l; }
    static void gap(Context c,LinearLayout l,int height){ View v=new View(c);l.addView(v,new LinearLayout.LayoutParams(1,dp(c,height))); }
    static void toast(Context c,int res){Toast.makeText(c,res,Toast.LENGTH_SHORT).show();}
    static LinearLayout column(Activity a, int headerRes){
        LinearLayout l=vertical(a); l.setBackgroundColor(BG);pad(l,18);
        TextView title=text(a,a.getString(headerRes),27,TEXT,true);l.addView(title,lp(a,48));gap(a,l,13);return l;
    }
    static void title(LinearLayout l,Context c,int id){l.addView(text(c,c.getString(id),17,TEXT,true));gap(c,l,8);}
    static void desc(LinearLayout l,Context c,int id){TextView t=text(c,c.getString(id),13,SUB,false);l.addView(t);gap(c,l,13);}
    static ScrollView scroll(Context c,View content){ScrollView s=new ScrollView(c);s.setFillViewport(true);s.addView(content);return s;}
    static String length(Context c,double meters){
        boolean imp=Prefs.imperial(c);double n=imp?meters*3.280839895:meters;
        return String.format(Locale.getDefault(),"%,.2f %s",n,imp?"ft":"m");
    }
    static String area(Context c,double squareMeters){
        boolean imp=Prefs.imperial(c);double n=imp?squareMeters*10.763910417:squareMeters;
        return String.format(Locale.getDefault(),"%,.2f %s",n,imp?"ft²":"m²");
    }
}
