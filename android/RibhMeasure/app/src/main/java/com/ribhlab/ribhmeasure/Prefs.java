package com.ribhlab.ribhmeasure;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import java.util.Locale;

final class Prefs {
    static SharedPreferences db(Context c){ return c.getSharedPreferences("measure_settings",Context.MODE_PRIVATE); }
    static String lang(Context c){return db(c).getString("language", "en");}
    static boolean imperial(Context c){return db(c).getBoolean("imperial",false);}
    static float rulerFactor(Context c){return db(c).getFloat("ruler_calibration",1.0f);}
    static Context locale(Context c){
        Configuration cfg=new Configuration(c.getResources().getConfiguration());
        Locale loc=new Locale(lang(c));cfg.setLocale(loc);cfg.setLayoutDirection(loc);
        return c.createConfigurationContext(cfg);
    }
}
