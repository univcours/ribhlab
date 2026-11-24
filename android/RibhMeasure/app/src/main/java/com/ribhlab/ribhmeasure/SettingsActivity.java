package com.ribhlab.ribhmeasure;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;

public final class SettingsActivity extends BaseActivity {
    @Override protected void onCreate(Bundle b){super.onCreate(b);render();}
    private void render(){
        LinearLayout root=Ui.vertical(this);root.setBackgroundColor(Ui.BG);
        LinearLayout body=Ui.column(this,R.string.settings);
        Ui.title(body,this,R.string.language);
        RadioGroup language=new RadioGroup(this);
        RadioButton en=radio(R.string.english),ar=radio(R.string.arabic),fr=radio(R.string.french);
        language.addView(en);language.addView(ar);language.addView(fr);(Prefs.lang(this).equals("ar")?ar:Prefs.lang(this).equals("fr")?fr:en).setChecked(true);
        language.setOnCheckedChangeListener((g,id)->{
            String v=ar.isChecked()?"ar":fr.isChecked()?"fr":"en";
            if(!Prefs.lang(this).equals(v)){
                Prefs.db(this).edit().putString("language",v).apply();
                Intent i=new Intent(this,MainActivity.class);i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK|Intent.FLAG_ACTIVITY_NEW_TASK);startActivity(i);finish();
            }
        });
        body.addView(language);Ui.gap(this,body,15);
        Ui.title(body,this,R.string.unit_system);
        RadioGroup units=new RadioGroup(this);
        RadioButton metric=radio(R.string.metric),imperial=radio(R.string.imperial);
        units.addView(metric);units.addView(imperial);(Prefs.imperial(this)?imperial:metric).setChecked(true);
        units.setOnCheckedChangeListener((g,id)->Prefs.db(this).edit().putBoolean("imperial",imperial.isChecked()).apply());
        body.addView(units);Ui.gap(this,body,22);
        Ui.title(body,this,R.string.privacy);
        Ui.desc(body,this,R.string.privacy_note);
        Button options=Ui.button(this,R.string.consent_options,false);options.setOnClickListener(v->Ads.showPrivacy(this));
        body.addView(options,Ui.lp(this,52));Ui.gap(this,body,14);
        Button privacy=Ui.button(this,R.string.privacy_policy,false);
        privacy.setOnClickListener(v->{
            Intent i=new Intent(Intent.ACTION_VIEW,android.net.Uri.parse(getString(R.string.privacy_policy_url)));
            try{startActivity(i);}catch(Exception e){Ui.toast(this,R.string.generic_error);}
        });
        body.addView(privacy,Ui.lp(this,52));Ui.gap(this,body,18);
        Ui.desc(body,this,R.string.ad_placement);
        if(BuildConfig.DEMO_ADS)Ui.desc(body,this,R.string.ads_demo);
        root.addView(Ui.scroll(this,body),new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
    }
    private RadioButton radio(int id){RadioButton b=new RadioButton(this);b.setText(id);b.setTextColor(Ui.TEXT);b.setTextSize(17);b.setPadding(0,Ui.dp(this,6),0,Ui.dp(this,6));return b;}
}
