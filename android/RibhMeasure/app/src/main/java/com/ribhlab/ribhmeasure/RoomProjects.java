package com.ribhlab.ribhmeasure;
import android.content.Context;
import org.json.*;
final class RoomProjects {
 static JSONArray load(Context c){try{return new JSONArray(c.getSharedPreferences("room_projects_v1",0).getString("data","[]"));}catch(JSONException e){return new JSONArray();}}
 static void save(Context c,String name,float[][] a,float h,boolean manual)throws JSONException{if(!RoomMath.valid(a))throw new JSONException("Invalid outline");JSONArray all=load(c),coords=new JSONArray();for(float[] p:a){coords.put((double)p[0]);coords.put((double)p[1]);}JSONObject item=new JSONObject();item.put("id",java.util.UUID.randomUUID().toString());item.put("name",name.length()>100?name.substring(0,100):name);item.put("time",System.currentTimeMillis());item.put("outline",coords);item.put("height",Float.isFinite(h)&&h>0?(Object)(double)h:JSONObject.NULL);item.put("manual",manual);JSONArray result=new JSONArray();result.put(item);for(int i=0;i<all.length()&&i<199;i++){Object o=all.opt(i);if(o!=null)result.put(o);}if(!c.getSharedPreferences("room_projects_v1",0).edit().putString("data",result.toString()).commit())throw new JSONException("Storage write failed");}
 static void delete(Context c,String id){JSONArray all=load(c),result=new JSONArray();for(int i=0;i<all.length();i++){JSONObject o=all.optJSONObject(i);if(o!=null&&!id.equals(o.optString("id")))result.put(o);}c.getSharedPreferences("room_projects_v1",0).edit().putString("data",result.toString()).apply();}
 static float[] coordinates(JSONObject o){JSONArray a=o.optJSONArray("outline");if(a==null||a.length()<6||a.length()>60||a.length()%2!=0)return null;float[] f=new float[a.length()];for(int i=0;i<f.length;i++){f[i]=(float)a.optDouble(i,Double.NaN);if(!Float.isFinite(f[i]))return null;}return f;}
}
