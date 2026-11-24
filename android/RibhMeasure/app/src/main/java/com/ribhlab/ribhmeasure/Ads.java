package com.ribhlab.ribhmeasure;

import android.app.Activity;
import android.os.SystemClock;
import android.util.Log;
import android.view.Gravity;
import android.widget.LinearLayout;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

/** Consent first. Test IDs by default; no ad is shown in the middle of a measurement. */
final class Ads {
    private static ConsentInformation consent;
    private static boolean initialized=false,loadingInterstitial=false;
    private static InterstitialAd interstitial;
    private static long lastShownElapsed=0;
    private static int completed=0;
    static void setup(Activity a){
        if(consent==null)consent=UserMessagingPlatform.getConsentInformation(a);
        ConsentRequestParameters parameters=new ConsentRequestParameters.Builder().build();
        consent.requestConsentInfoUpdate(a,parameters,()->{
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(a,formError->{
                if(formError!=null)Log.w("RibhMeasure","Consent form: "+formError.getMessage());
                initializeIfAllowed(a);
            });
            initializeIfAllowed(a);
        },error->{Log.w("RibhMeasure","Consent update: "+error.getMessage());initializeIfAllowed(a);});
        initializeIfAllowed(a);
    }
    static void initializeIfAllowed(Activity a){
        if(consent==null||!consent.canRequestAds()||initialized)return;
        initialized=true;
        if(a instanceof MainActivity){
            a.getWindow().getDecorView().post(()->{
                if(!a.isFinishing()&&!a.isDestroyed())((MainActivity)a).render();
            });
        }
        MobileAds.initialize(a,unused->{});
        preloadInterstitial(a);
    }
    static boolean permitted(){return consent!=null&&consent.canRequestAds()&&initialized;}
    static void addBanner(Activity a,LinearLayout parent){
        if(!permitted())return;
        AdView ad=new AdView(a);
        ad.setAdUnitId(BuildConfig.ADMOB_BANNER_ID);
        ad.setAdSize(AdSize.BANNER);
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.gravity=Gravity.CENTER_HORIZONTAL;
        parent.addView(ad,p);
        ad.loadAd(new AdRequest.Builder().build());
    }
    static void preloadInterstitial(Activity a){
        if(!permitted()||loadingInterstitial||interstitial!=null)return;
        loadingInterstitial=true;
        InterstitialAd.load(a,BuildConfig.ADMOB_INTERSTITIAL_ID,new AdRequest.Builder().build(),new InterstitialAdLoadCallback(){
            @Override public void onAdLoaded(InterstitialAd ad){interstitial=ad;loadingInterstitial=false;}
            @Override public void onAdFailedToLoad(LoadAdError error){loadingInterstitial=false;Log.w("RibhMeasure","Interstitial failed: "+error.getMessage());}
        });
    }
    static void measurementCompleted(BaseActivity a){
        completed++;
        if(completed%4!=0||interstitial==null||!permitted())return;
        long now=SystemClock.elapsedRealtime();
        if(lastShownElapsed!=0&&now-lastShownElapsed<120000)return;
        lastShownElapsed=now;
        InterstitialAd ad=interstitial;interstitial=null;
        ad.setFullScreenContentCallback(new FullScreenContentCallback(){
            @Override public void onAdDismissedFullScreenContent(){preloadInterstitial(a);}
            @Override public void onAdFailedToShowFullScreenContent(AdError error){preloadInterstitial(a);}
        });
        ad.show(a);
    }
    static void showPrivacy(Activity a){
        if(consent==null||consent.getPrivacyOptionsRequirementStatus()!=ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED){
            Ui.toast(a,R.string.consent_unavailable);return;
        }
        UserMessagingPlatform.showPrivacyOptionsForm(a,error->{
            if(error!=null)Log.w("RibhMeasure","Privacy form: "+error.getMessage());
        });
    }
}
