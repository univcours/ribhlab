package com.ribhlab.rivotalk

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

/**
 * Dedicated, permanently reserved bottom ad compartment. It never overlays
 * the radio casing, PTT button, sheets, or the system navigation area.
 *
 * The compartment exists offline too; requests begin ONLY when RivoAds is
 * ready (after the UMP consent path). No fabricated advertisement or fill.
 * Standard 320x50 banner only if the available width can contain it.
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
            Box(Modifier.fillMaxWidth().height(51.dp).clipToBounds(),
                contentAlignment=Alignment.Center){
                if(canFit&&ads.ready){
                    val context=LocalContext.current
                    val view=remember(context,ads.bannerId){
                        AdView(context).apply{
                            setAdSize(AdSize.BANNER)
                            adUnitId=ads.bannerId
                            adListener=object:AdListener(){
                                override fun onAdFailedToLoad(error:LoadAdError){
                                    // Keep the slot empty. Never replace it with fake ad content.
                                }
                            }
                            loadAd(AdRequest.Builder().build())
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
                }
            }
        }
    }
}
