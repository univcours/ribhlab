package com.ribhlab.ribhmeasure;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class HistoryActivity extends BaseActivity {
    private static final int EXPORT=923;
    @Override protected void onCreate(Bundle b){super.onCreate(b);render();}
    private void render(){
        LinearLayout root=Ui.vertical(this);root.setBackgroundColor(Ui.BG);
        LinearLayout body=Ui.column(this,R.string.history);
        Button export=Ui.button(this,R.string.export_csv,true);export.setOnClickListener(v->export());body.addView(export,Ui.lp(this,53));Ui.gap(this,body,10);
        Button clear=Ui.button(this,R.string.delete_all,false);clear.setOnClickListener(v->new android.app.AlertDialog.Builder(this)
            .setTitle(R.string.delete_all).setPositiveButton(R.string.ok,(d,w)->{Measurements.deleteAll(this);Ui.toast(this,R.string.history_cleared);render();})
            .setNegativeButton(R.string.cancel,null).show());
        body.addView(clear,Ui.lp(this,50));Ui.gap(this,body,17);
        JSONArray saved=Measurements.list(this);
        if(saved.length()==0)body.addView(Ui.text(this,getString(R.string.nothing_saved),15,Ui.SUB,false));
        for(int i=0;i<saved.length();i++){
            JSONObject item=saved.optJSONObject(i);if(item==null)continue;
            LinearLayout card=Ui.card(this);
            String type=item.optString("type");double v=item.optDouble("value");String unit=item.optString("unit");
            String measured="m²".equals(unit)?Ui.area(this,v):"m".equals(unit)?Ui.length(this,v):"cm".equals(unit)?Ui.length(this,v/100):v+" "+unit;
            card.addView(Ui.text(this,type+" — "+measured,17,Ui.TEXT,true));
            card.addView(Ui.text(this,new SimpleDateFormat("yyyy-MM-dd HH:mm",Locale.getDefault()).format(new Date(item.optLong("time"))),13,Ui.SUB,false));
            card.addView(Ui.text(this,item.optString("details"),12,Ui.SUB,false));
            body.addView(card,Ui.lp(this,-2));Ui.gap(this,body,10);
        }
        root.addView(Ui.scroll(this,body),new LinearLayout.LayoutParams(-1,0,1));addBanner(root);setContentView(root);
    }
    private void export(){Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("text/csv");i.putExtra(Intent.EXTRA_TITLE,"RibhMeasure-history.csv");startActivityForResult(i,EXPORT);}
    @Override protected void onActivityResult(int req,int res,Intent intent){super.onActivityResult(req,res,intent);
        if(req==EXPORT&&res==RESULT_OK&&intent!=null&&intent.getData()!=null){
            try(OutputStream out=getContentResolver().openOutputStream(intent.getData())){
                if(out==null)throw new IllegalStateException("No output stream");
                out.write(Measurements.csv(this).getBytes(StandardCharsets.UTF_8));Ui.toast(this,R.string.saved);
            }catch(Exception e){Ui.toast(this,R.string.generic_error);}
        }
    }
}
