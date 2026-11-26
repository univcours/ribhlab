package com.ribhlab.ribhmeasure;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

final class Measurements {
    static final String KEY="measurements_history";
    static JSONArray list(Context c){try{return new JSONArray(Prefs.db(c).getString(KEY,"[]"));}catch(Exception e){return new JSONArray();}}
    static void add(Context c,String type,double value,String unit,String details){
        try {
            JSONArray orig=list(c),out=new JSONArray();JSONObject item=new JSONObject();
            item.put("type",type);item.put("value",value);item.put("unit",unit);
            item.put("time",System.currentTimeMillis());item.put("details",details);
            out.put(item);
            for(int i=0;i<Math.min(199,orig.length());i++)out.put(orig.get(i));
            Prefs.db(c).edit().putString(KEY,out.toString()).apply();
            Ui.toast(c,R.string.measurement_saved);
            if(c instanceof android.app.Activity) Ads.measurementCompleted((android.app.Activity)c);
        }catch(Exception ignored){Ui.toast(c,R.string.generic_error);}
    }
    static void deleteAll(Context c){Prefs.db(c).edit().remove(KEY).apply();}
    static String csv(Context c){
        JSONArray a=list(c);StringBuilder s=new StringBuilder("date,type,value,unit,details\n");
        for(int i=0;i<a.length();i++){
            JSONObject v=a.optJSONObject(i);if(v==null)continue;
            String date=new SimpleDateFormat("yyyy-MM-dd HH:mm:ss",Locale.US).format(new Date(v.optLong("time")));
            s.append(escape(date)).append(',').append(escape(v.optString("type"))).append(',')
                .append(v.optDouble("value")).append(',').append(escape(v.optString("unit"))).append(',')
                .append(escape(v.optString("details"))).append('\n');
        }return s.toString();
    }
    private static String escape(String s){return '"'+s.replace("\"","\"\"")+'"';}
}
