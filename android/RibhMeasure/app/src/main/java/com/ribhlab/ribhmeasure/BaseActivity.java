package com.ribhlab.ribhmeasure;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.os.Build;
import android.widget.LinearLayout;

public abstract class BaseActivity extends Activity {
    @Override protected void attachBaseContext(Context base){super.attachBaseContext(Prefs.locale(base));}
    @Override protected void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Ui.BG);getWindow().setNavigationBarColor(Ui.BG);}
    @Override public void setContentView(View root){
        // Android 15/16 may enforce edge-to-edge drawing: keep controls out of system bars.
        root.setOnApplyWindowInsetsListener((view,insets)->{
            if(Build.VERSION.SDK_INT>=30){
                android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(i.left,i.top,i.right,i.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        super.setContentView(root);
    }
    void addBanner(LinearLayout root){ Ads.addBanner(this,root); }
}
