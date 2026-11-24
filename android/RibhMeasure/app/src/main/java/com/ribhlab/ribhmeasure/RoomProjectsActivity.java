package com.ribhlab.ribhmeasure;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.view.*;
import android.widget.*;
import java.util.Locale;
import org.json.*;
public final class RoomProjectsActivity extends Activity{
 String tr(String en,String fr,String ar){String l=getResources().getConfiguration().getLocales().get(0).getLanguage();return l.equals("ar")?ar:l.equals("fr")?fr:en;}
 int dp(float d){return Math.round(d*getResources().getDisplayMetrics().density);}
 @Override protected void attachBaseContext(android.content.Context base){super.attachBaseContext(Prefs.locale(base));}
 @Override public void onCreate(Bundle b){super.onCreate(b);}
 @Override protected void onResume(){super.onResume();render();}
 void render(){ScrollView sc=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(0xff07111e);root.setPadding(dp(18),dp(18),dp(18),dp(18));sc.addView(root);sc.setOnApplyWindowInsetsListener((v,i)->{v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());return i;});TextView title=label(tr("Room projects","Mes projets","مشاريع الغرف"),24);root.addView(title);JSONArray all=RoomProjects.load(this);if(all.length()==0)root.addView(label(tr("No saved rooms yet.","Aucune pièce enregistrée.","لا توجد غرف محفوظة بعد."),16));
 for(int i=0;i<all.length();i++){JSONObject o=all.optJSONObject(i);if(o==null)continue;float[] flat=RoomProjects.coordinates(o);if(flat==null)continue;float[][] a=new float[flat.length/2][2];for(int j=0;j<a.length;j++){a[j][0]=flat[2*j];a[j][1]=flat[2*j+1];}if(!RoomMath.valid(a))continue;float h=(float)o.optDouble("height",Double.NaN);boolean manual=o.optBoolean("manual",false);LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(dp(14),dp(12),dp(14),dp(10));android.graphics.drawable.GradientDrawable bg=new android.graphics.drawable.GradientDrawable();bg.setColor(0xff133039);bg.setCornerRadius(dp(18));card.setBackground(bg);LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(-1,-2);cp.setMargins(0,dp(10),0,0);root.addView(card,cp);card.addView(label(o.optString("name","Room"),20));card.addView(label(String.format(Locale.US,"%.2f m² · %.2f m · %s",RoomMath.area(a),RoomMath.perimeter(a),manual?tr("Manual","Manuel","يدوي"):"AR"),15));LinearLayout buttons=new LinearLayout(this);card.addView(buttons);Button open=new Button(this);open.setText(tr("Open","Ouvrir","فتح"));buttons.addView(open,new LinearLayout.LayoutParams(0,dp(52),1));open.setOnClickListener(v->{Intent in=new Intent(this,RoomPlanActivity.class);in.putExtra("outline",flat);in.putExtra("height",h);in.putExtra("manual",manual);startActivity(in);});Button del=new Button(this);del.setText(tr("Delete","Supprimer","حذف"));buttons.addView(del,new LinearLayout.LayoutParams(0,dp(52),1));del.setOnClickListener(v->new android.app.AlertDialog.Builder(this).setMessage(tr("Delete this saved room?","Supprimer cette pièce ?","حذف هذه الغرفة المحفوظة؟")).setNegativeButton(android.R.string.cancel,null).setPositiveButton(android.R.string.ok,(d,w)->{RoomProjects.delete(this,o.optString("id"));render();}).show());}setContentView(sc);}
 TextView label(String t,int n){TextView v=new TextView(this);v.setText(t);v.setTextSize(n);v.setTextColor(0xffe5f4f4);return v;}
}
