package com.ribhlab.ribhmeasure;

import android.app.Activity;
import android.os.SystemClock;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import com.google.android.gms.ads.*;
import com.google.android.gms.ads.interstitial.*;
import com.google.android.ump.*;

/** Consent first. Banners stay in a dedicated, clipped bottom container.
 * Full-screen ads only at the return-to-home transition after completed work. */
final class Ads {
    private static ConsentInformation consent;
    private static boolean initialized=false, initializing=false, loadingInterstitial=false, showing=false;
    private static InterstitialAd interstitial;
    private static long lastShownElapsed=0, nextLoadAllowed=0;
    private static int completed=0;
    static void setup(Activity a){
        if(BuildConfig.DEMO_ADS)return;
        if(consent==null)consent=UserMessagingPlatform.getConsentInformation(a);
        consent.requestConsentInfoUpdate(a,new ConsentRequestParameters.Builder().build(),()->{
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(a,error->{
                if(error!=null)Log.w("RivoMeasure","Consent: "+error.getMessage());
                initializeIfAllowed(a);
                refresh(a);
            });
            initializeIfAllowed(a);
        },error->{Log.w("RivoMeasure","Consent update: "+error.getMessage());initializeIfAllowed(a);refresh(a);});
        initializeIfAllowed(a);
    }
    private static void refresh(Activity a){
        if(a instanceof MainActivity&&!a.isFinishing()&&!a.isDestroyed())
            a.runOnUiThread(()->((MainActivity)a).render());
    }
    static void initializeIfAllowed(Activity a){
        if(BuildConfig.DEMO_ADS||consent==null||!consent.canRequestAds()||initialized||initializing)return;
        initializing=true;
        MobileAds.initialize(a.getApplicationContext(),unused->a.runOnUiThread(()->{
            initializing=false;initialized=true;refresh(a);preloadInterstitial(a);
        }));
    }
    static boolean permitted(){return !BuildConfig.DEMO_ADS&&consent!=null&&consent.canRequestAds()&&initialized;}
    static void addBanner(Activity a,LinearLayout parent){
        if(!permitted())return;
        FrameLayout slot=new FrameLayout(a);
        slot.setClipChildren(true);slot.setClipToPadding(true);
        parent.setClipChildren(true);parent.setClipToPadding(true);
        int gap=Math.round(8*a.getResources().getDisplayMetrics().density);
        // Reserve a real dock height before measuring the first native ad. A zero-height
        // AndroidView inside Compose Scaffold may never receive a visible layout pass.
        int fallbackHeight=Math.round(50*a.getResources().getDisplayMetrics().density);
        LinearLayout.LayoutParams outer=new LinearLayout.LayoutParams(-1,fallbackHeight);
        outer.topMargin=gap;parent.addView(slot,outer);
        slot.addOnLayoutChangeListener(new View.OnLayoutChangeListener(){
            private AdView current;
            private int lastWidth=0;
            @Override public void onLayoutChange(View v,int l,int t,int r,int b,int ol,int ot,int or_,int ob){
                if(!permitted()||a.isFinishing()||a.isDestroyed())return;
                float density=a.getResources().getDisplayMetrics().density;
                int px=slot.getWidth()-slot.getPaddingLeft()-slot.getPaddingRight();
                int dp=(int)Math.floor(px/density);
                if(dp<320||dp==lastWidth)return;
                lastWidth=dp;
                if(current!=null){current.destroy();slot.removeView(current);}
                AdSize size=AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(a,dp);
                int height=size.getHeightInPixels(a),width=size.getWidthInPixels(a);
                if(height<=0||height>Math.round(90*density)||width<=0||width>px)return;
                AdView ad=new AdView(a);current=ad;
                ad.setAdUnitId(BuildConfig.ADMOB_BANNER_ID);ad.setAdSize(size);
                FrameLayout.LayoutParams child=new FrameLayout.LayoutParams(width,height,Gravity.CENTER);
                slot.addView(ad,child);
                android.view.ViewGroup.LayoutParams lp=slot.getLayoutParams();
                lp.height=height;slot.setLayoutParams(lp);
                ad.loadAd(new AdRequest.Builder().build());
            }
        });
        slot.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener(){
            @Override public void onViewAttachedToWindow(View v){}
            @Override public void onViewDetachedFromWindow(View v){
                for(int i=0;i<slot.getChildCount();i++)if(slot.getChildAt(i) instanceof AdView)((AdView)slot.getChildAt(i)).destroy();
            }
        });
    }
    static void preloadInterstitial(Activity a){
        if(!permitted()||loadingInterstitial||interstitial!=null||showing||SystemClock.elapsedRealtime()<nextLoadAllowed)return;
        loadingInterstitial=true;
        InterstitialAd.load(a.getApplicationContext(),BuildConfig.ADMOB_INTERSTITIAL_ID,new AdRequest.Builder().build(),new InterstitialAdLoadCallback(){
            @Override public void onAdLoaded(InterstitialAd ad){interstitial=ad;loadingInterstitial=false;}
            @Override public void onAdFailedToLoad(LoadAdError error){loadingInterstitial=false;nextLoadAllowed=SystemClock.elapsedRealtime()+60000;Log.w("RivoMeasure","Interstitial: "+error.getMessage());}
        });
    }
    static void measurementCompleted(Activity a){if(permitted())completed++;}
    static void returnedHome(MainActivity a){
        if(!permitted()||a.isFinishing()||a.isDestroyed()||showing)return;
        long now=SystemClock.elapsedRealtime();
        if(completed<3||interstitial==null||(lastShownElapsed!=0&&now-lastShownElapsed<180000)){
            preloadInterstitial(a);return;
        }
        InterstitialAd ad=interstitial;interstitial=null;showing=true;
        ad.setFullScreenContentCallback(new FullScreenContentCallback(){
            @Override public void onAdShowedFullScreenContent(){lastShownElapsed=SystemClock.elapsedRealtime();completed=0;}
            @Override public void onAdDismissedFullScreenContent(){showing=false;preloadInterstitial(a);}
            @Override public void onAdFailedToShowFullScreenContent(AdError error){showing=false;nextLoadAllowed=SystemClock.elapsedRealtime()+60000;Log.w("RivoMeasure","Show: "+error.getMessage());}
        });
        ad.show(a);
    }
    static void showPrivacy(Activity a){
        if(consent==null||consent.getPrivacyOptionsRequirementStatus()!=ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED){
            Ui.toast(a,R.string.consent_unavailable);return;
        }
        UserMessagingPlatform.showPrivacyOptionsForm(a,error->{
            if(error!=null)Log.w("RivoMeasure","Privacy: "+error.getMessage());
            if(!consent.canRequestAds())interstitial=null;
            initializeIfAllowed(a);refresh(a);
        });
    }
}
