package com.ribhlab.rivotalk

import android.app.Activity
import android.content.pm.ApplicationInfo
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.*
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

class RivoAds(private val activity: ComponentActivity) {
    private val consent=UserMessagingPlatform.getConsentInformation(activity)
    private val test=(activity.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE)!=0
    val bannerId=if(test) "ca-app-pub-3940256099942544/6300978111" else "ca-app-pub-7945572016731367/2047988844"
    private val interstitialId=if(test) "ca-app-pub-3940256099942544/1033173712" else "ca-app-pub-7945572016731367/8418276872"
    var ready by mutableStateOf(false); private set
    var privacyRequired by mutableStateOf(false); private set
    private var requesting=false
    private var consentUpdated=false
    private var initializing=false
    private var initialized=false
    private var destroyed=false
    private var loading=false
    private var interstitial:InterstitialAd?=null
    private var completedSessions=0
    private var lastShown=SystemClock.elapsedRealtime()
    private fun idle()=SessionHolder.get(activity).state.value.role=="idle"
    private fun usable()=!destroyed && !activity.isFinishing && !activity.isDestroyed
    private fun updateChoices(){
        privacyRequired=consent.privacyOptionsRequirementStatus==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
        if(!consent.canRequestAds()){ready=false;interstitial=null;return}
        if(initialized){ready=true;preload();return}
        if(initializing || !usable())return
        initializing=true
        Thread{
            MobileAds.initialize(activity.applicationContext){
                activity.runOnUiThread{
                    initializing=false
                    initialized=true
                    if(usable()&&consent.canRequestAds()){ready=true;preload()}
                }
            }
        }.start()
    }
    fun requestConsentWhenIdle(){
        if(!usable()||!idle()||requesting)return
        if(consentUpdated){updateChoices();return}
        requesting=true
        consent.requestConsentInfoUpdate(activity,ConsentRequestParameters.Builder().build(),{
            if(!usable()){requesting=false;return@requestConsentInfoUpdate}
            if(!idle()){requesting=false;return@requestConsentInfoUpdate}
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity){
                requesting=false;consentUpdated=true
                if(usable())updateChoices()
            }
        },{
            requesting=false
            if(usable())updateChoices()
        })
    }
    fun privacyOptions(){
        if(!usable()||!idle()||!privacyRequired)return
        interstitial=null;ready=false
        UserMessagingPlatform.showPrivacyOptionsForm(activity){if(usable())updateChoices()}
    }
    private fun preload(){
        if(!ready||!usable()||!idle()||loading||interstitial!=null)return
        loading=true
        InterstitialAd.load(activity,interstitialId,AdRequest.Builder().build(),object:InterstitialAdLoadCallback(){
            override fun onAdLoaded(ad:InterstitialAd){loading=false;if(usable()&&ready)interstitial=ad}
            override fun onAdFailedToLoad(error:LoadAdError){loading=false;interstitial=null}
        })
    }
    fun onSessionFinished(duration:Long){
        if(duration<120_000L||!usable()||!idle()||!ready||!consent.canRequestAds())return
        completedSessions++
        val now=SystemClock.elapsedRealtime()
        if(completedSessions<3||now-lastShown<300_000L){preload();return}
        val ad=interstitial?:run{preload();return}
        if(!activity.lifecycle.currentState.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED))return
        interstitial=null;completedSessions=0;lastShown=now
        ad.fullScreenContentCallback=object:FullScreenContentCallback(){
            override fun onAdDismissedFullScreenContent(){preload()}
            override fun onAdFailedToShowFullScreenContent(error:AdError){preload()}
        }
        ad.show(activity)
    }
    fun destroy(){destroyed=true;ready=false;interstitial=null}
}

@Composable
fun RivoBanner(ads:RivoAds){
    BoxWithConstraints(Modifier.fillMaxWidth().navigationBarsPadding().clipToBounds(),contentAlignment=Alignment.Center){
        if(maxWidth>=320.dp){
            val context=androidx.compose.ui.platform.LocalContext.current
            var loaded by remember{mutableStateOf(false)}
            val view=remember(context,ads.bannerId){AdView(context).apply{
                setAdSize(AdSize.BANNER)
                adUnitId=ads.bannerId
                adListener=object:AdListener(){
                    override fun onAdLoaded(){loaded=true}
                    override fun onAdFailedToLoad(error:LoadAdError){loaded=false}
                }
                loadAd(AdRequest.Builder().build())
            }}
            val owner=androidx.lifecycle.compose.LocalLifecycleOwner.current
            DisposableEffect(view,owner){
                val observer=androidx.lifecycle.LifecycleEventObserver{_,event->
                    when(event){
                        androidx.lifecycle.Lifecycle.Event.ON_RESUME->view.resume()
                        androidx.lifecycle.Lifecycle.Event.ON_PAUSE->view.pause()
                        else->Unit
                    }
                }
                owner.lifecycle.addObserver(observer)
                onDispose{owner.lifecycle.removeObserver(observer);view.destroy()}
            }
            Surface(color=MaterialTheme.colorScheme.surfaceContainerLow,modifier=Modifier.fillMaxWidth().clipToBounds()){
                Column(Modifier.fillMaxWidth().padding(top=8.dp),horizontalAlignment=Alignment.CenterHorizontally){
                    if(loaded)Text(stringResource(R.string.ad_label),style=MaterialTheme.typography.labelSmall)
                    AndroidView(factory={view},modifier=Modifier.size(320.dp,50.dp).clipToBounds())
                }
            }
        }
    }
}
