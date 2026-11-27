package com.ribhlab.rivotalk

import android.util.Log
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError
import kotlinx.coroutines.delay

/** Alpha08: preserve the permanent alpha07 ad dock, including its safe
 * bounds, while making real Google AdMob load failures observable.
 *
 * No fabricated ad inventory. Never request before UMP allows ads.
 * The production unit stays real; Google's sample ID is debug-only.
 * Failed requests retry at most three times with increasing delays,
 * and the Mobile Ads SDK manages normal refresh after success.
 */
@Composable
fun RivoAdDock7(ads:RivoAds){
    BoxWithConstraints(
        modifier=Modifier.fillMaxWidth()
            .navigationBarsPadding()
            .background(MaterialTheme.colorScheme.surfaceContainerLow)
            .border(BorderStroke(1.dp,MaterialTheme.colorScheme.outlineVariant))
            .clipToBounds()
            .height(79.dp),
        contentAlignment=Alignment.Center
    ){
        val canFit=maxWidth>=320.dp
        Column(
            Modifier.fillMaxSize().padding(top=3.dp),
            horizontalAlignment=Alignment.CenterHorizontally
        ){
            Text(
                stringResource(R.string.ad_label),
                style=MaterialTheme.typography.labelSmall,
                color=MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(3.dp))
            Box(
                Modifier.fillMaxWidth().height(51.dp).clipToBounds(),
                contentAlignment=Alignment.Center
            ){
                if(canFit && ads.ready){
                    val context=LocalContext.current
                    var loaded by remember(context,ads.bannerId){mutableStateOf(false)}
                    var attempts by remember(context,ads.bannerId){mutableIntStateOf(0)}
                    var failedCode by remember(context,ads.bannerId){mutableStateOf<Int?>(null)}
                    val view=remember(context,ads.bannerId){
                        AdView(context).apply {
                            setAdSize(AdSize.BANNER)
                            adUnitId=ads.bannerId
                            adListener=object:AdListener(){
                                override fun onAdLoaded(){
                                    loaded=true
                                    failedCode=null
                                    Log.i("RivoTalkAdMob","Banner loaded successfully")
                                }
                                override fun onAdFailedToLoad(error:LoadAdError){
                                    loaded=false
                                    failedCode=error.code
                                    attempts++
                                    Log.w(
                                        "RivoTalkAdMob",
                                        "Banner request failed: code=${error.code}, domain=${error.domain}, " +
                                            "message=${error.message}, response=${error.responseInfo?.responseId}"
                                    )
                                }
                            }
                        }
                    }
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
                        onDispose{
                            owner.lifecycle.removeObserver(observer)
                            view.destroy()
                        }
                    }
                    AndroidView(
                        factory={view},
                        modifier=Modifier.size(320.dp,50.dp).clipToBounds()
                    )
                    // Load once after AndroidView is in the composition. On failure,
                    // retry with bounded backoff rather than a rapid request loop.
                    LaunchedEffect(view,attempts){
                        if(attempts<=3){
                            if(attempts>0){
                                val backoff=when(attempts){
                                    1->60_000L
                                    2->120_000L
                                    else->300_000L
                                }
                                delay(backoff)
                            }
                            view.loadAd(AdRequest.Builder().build())
                        }
                    }
                    if(!loaded){
                        Text(
                            if(failedCode!=null)
                                stringResource(R.string.ad_request_failed,failedCode!!)
                            else stringResource(R.string.ad_loading),
                            color=MaterialTheme.colorScheme.onSurfaceVariant,
                            style=MaterialTheme.typography.labelSmall
                        )
                    }
                } else {
                    Text(
                        stringResource(
                            if(canFit)R.string.ad_not_ready
                            else R.string.ad_screen_too_narrow
                        ),
                        color=MaterialTheme.colorScheme.onSurfaceVariant,
                        style=MaterialTheme.typography.labelSmall
                    )
                }
            }
        }
    }
}
