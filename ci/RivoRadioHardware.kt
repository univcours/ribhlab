package com.ribhlab.rivotalk

import android.content.Context
import android.media.AudioManager
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val caseColor=Color(0xFF18282E)
private val keyColor=Color(0xFF30424A)
private val greenScreen=Color(0xFFB8D6AA)
private val darkInk=Color(0xFF20372C)
private val amber=Color(0xFFFFBD55)

/** One device-like screen. Neither the phone-sized controls nor the ad area scroll.
 * Every drawn control has a real action; settings and the long lists remain in sheets.
 */
@Composable
fun RivoHardwareFace7(
    active:Boolean,
    status:String,
    memberCount:Int,
    speakerName:String?,
    privateName:String?,
    canTalk:Boolean,
    pressing:Boolean,
    error:String,
    permitted:Boolean,
    onPress:()->Unit,
    onRelease:()->Unit,
    onToggle:()->Unit,
    onSettings:()->Unit,
    onMembers:()->Unit,
    onChat:()->Unit,
    onHistory:()->Unit,
    onHost:()->Unit,
    onJoin:()->Unit,
    onPermissions:()->Unit,
    onDisconnect:()->Unit,
    onGroup:()->Unit
){
    val context=LocalContext.current
    val audio=context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    fun volume(direction:Int){
        runCatching{audio.adjustStreamVolume(AudioManager.STREAM_MUSIC,direction,
            AudioManager.FLAG_SHOW_UI)}
    }
    BoxWithConstraints(
        Modifier.fillMaxSize().padding(horizontal=10.dp,vertical=7.dp),
        contentAlignment=Alignment.Center
    ){
        val compact=maxHeight<535.dp
        val tight=maxHeight<440.dp
        Surface(
            modifier=Modifier.fillMaxSize(),
            shape=RoundedCornerShape(32.dp),
            color=caseColor,
            border=BorderStroke(3.dp,Color(0xFF4D636B)),
            shadowElevation=5.dp
        ){
            Column(
                modifier=Modifier.fillMaxSize().padding(
                    horizontal=if(tight)11.dp else 16.dp,
                    vertical=if(tight)9.dp else 13.dp
                ),
                verticalArrangement=Arrangement.spacedBy(if(tight)6.dp else 9.dp)
            ){
                // Top controls: branded casing, channel indicator, and working settings.
                Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){
                    Surface(
                        modifier=Modifier.size(if(tight)25.dp else 31.dp),
                        shape=RoundedCornerShape(9.dp),
                        color=Color(0xFF455961),
                        border=BorderStroke(2.dp,Color(0xFF6D858C))
                    ){
                        Icon(Icons.Rounded.Radio,null,modifier=Modifier.padding(5.dp),
                            tint=Color(0xFFDEF7E1))
                    }
                    Spacer(Modifier.width(9.dp))
                    Column(Modifier.weight(1f)){
                        Text("RIVOTALK",fontSize=if(tight)15.sp else 17.sp,
                            fontWeight=FontWeight.Black,letterSpacing=1.3.sp,
                            color=Color(0xFFF1F6F5),maxLines=1)
                        if(!tight)Text("PRO RADIO · BLUETOOTH",
                            fontSize=9.sp,color=Color(0xFFAFC3C5))
                    }
                    Surface(shape=CircleShape,
                        color=if(active)Color(0xFF55DF8C)else Color(0xFF7B8385),
                        modifier=Modifier.size(9.dp)){}
                    Spacer(Modifier.width(8.dp))
                    Text(if(active)"ON" else "STBY",fontSize=10.sp,
                        color=Color(0xFFE0EAEB),fontWeight=FontWeight.Bold)
                    Spacer(Modifier.width(6.dp))
                    RadioButton7(Icons.Rounded.Settings,stringResource(R.string.radio_settings),
                        onSettings,size=if(tight)39.dp else 43.dp)
                }
                // Backlit LCD with receiver status, group name and TX/RX state.
                Surface(
                    color=Color(0xFF263A38),
                    shape=RoundedCornerShape(16.dp),
                    border=BorderStroke(3.dp,Color(0xFF6B7E79)),
                    modifier=Modifier.fillMaxWidth()
                ){
                    Column(Modifier.padding(5.dp)){
                        Surface(
                            color=greenScreen,
                            shape=RoundedCornerShape(9.dp),
                            modifier=Modifier.fillMaxWidth().height(if(tight)70.dp else 87.dp)
                        ){
                            Column(Modifier.padding(horizontal=12.dp,vertical=7.dp),
                                verticalArrangement=Arrangement.SpaceBetween){
                                Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){
                                    Text("CH 01",fontWeight=FontWeight.Black,
                                        fontSize=if(tight)16.sp else 21.sp,color=darkInk)
                                    Spacer(Modifier.weight(1f))
                                    Icon(Icons.Rounded.Bluetooth,null,modifier=Modifier.size(14.dp),tint=darkInk)
                                    Spacer(Modifier.width(4.dp))
                                    Text(if(pressing)"TX" else if(speakerName!=null)"RX"
                                        else if(active)"READY" else "OFF",
                                        fontSize=11.sp,fontWeight=FontWeight.Black,color=darkInk)
                                }
                                Text(
                                    if(error.isNotBlank())error
                                    else if(!active)stringResource(R.string.radio_ready)
                                    else if(pressing)stringResource(R.string.radio_transmitting)
                                    else speakerName?:status,
                                    color=darkInk,
                                    fontWeight=FontWeight.Bold,
                                    fontSize=if(tight)11.sp else 13.sp,
                                    maxLines=1,
                                    overflow=TextOverflow.Ellipsis
                                )
                                Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){
                                    Text(
                                        if(privateName!=null)"PRIVATE · "+privateName
                                        else if(active)"GROUP · "+memberCount+" USERS"
                                        else "LOCAL · OFFLINE",
                                        color=darkInk,fontSize=10.sp,
                                        modifier=Modifier.weight(1f),maxLines=1,
                                        overflow=TextOverflow.Ellipsis
                                    )
                                    Text("▂▄▆",color=darkInk,fontSize=11.sp)
                                }
                            }
                        }
                    }
                }
                // Main microphone / speaker / controls: these consume remaining space
                // without requiring the entire app to scroll, even with the ad dock.
                if(active){
                    Row(
                        Modifier.fillMaxWidth().weight(1f),
                        verticalAlignment=Alignment.CenterVertically
                    ){
                        Column(
                            modifier=Modifier.width(if(tight)40.dp else 48.dp),
                            horizontalAlignment=Alignment.CenterHorizontally,
                            verticalArrangement=Arrangement.spacedBy(9.dp)
                        ){
                            RadioButton7(Icons.Rounded.VolumeUp,"Volume +",{
                                volume(AudioManager.ADJUST_RAISE)
                            },size=if(tight)37.dp else 46.dp)
                            RadioButton7(Icons.Rounded.VolumeDown,"Volume −",{
                                volume(AudioManager.ADJUST_LOWER)
                            },size=if(tight)37.dp else 46.dp)
                        }
                        BoxWithConstraints(
                            Modifier.weight(1f).fillMaxHeight(),
                            contentAlignment=Alignment.Center
                        ){
                            val diameter=minOf(maxWidth*0.92f,maxHeight*0.94f,255.dp)
                            val enabledColor=if(pressing)amber else Color(0xFFFF9E57)
                            Surface(
                                modifier=Modifier.size(diameter).semantics{
                                    contentDescription=context.getString(R.string.ptt)
                                    role=Role.Button
                                    if(!canTalk)disabled()
                                }.pointerInput(canTalk){
                                    detectTapGestures(onPress={
                                        if(canTalk){
                                            onPress()
                                            try{tryAwaitRelease()}finally{onRelease()}
                                        }
                                    })
                                },
                                shape=CircleShape,
                                color=if(canTalk)enabledColor else Color(0xFF526167),
                                shadowElevation=if(pressing)2.dp else 12.dp,
                                border=BorderStroke(8.dp,Color(0xFF334950))
                            ){
                                Column(Modifier.fillMaxSize().padding(8.dp),
                                    horizontalAlignment=Alignment.CenterHorizontally,
                                    verticalArrangement=Arrangement.Center){
                                    Icon(Icons.Rounded.Mic,null,
                                        modifier=Modifier.size(diameter*0.29f),
                                        tint=Color(0xFF1B302B))
                                    Spacer(Modifier.height(2.dp))
                                    Text("PTT",fontSize=if(tight)18.sp else 24.sp,
                                        fontWeight=FontWeight.Black,color=Color(0xFF1B302B))
                                    Text(
                                        if(pressing)"TRANSMITTING"
                                        else if(canTalk)"PUSH TO TALK" else "BUSY",
                                        fontSize=if(tight)8.sp else 10.sp,
                                        color=Color(0xFF1B302B),
                                        fontWeight=FontWeight.Bold,
                                        maxLines=1
                                    )
                                }
                            }
                        }
                        Column(
                            modifier=Modifier.width(if(tight)40.dp else 48.dp),
                            horizontalAlignment=Alignment.CenterHorizontally,
                            verticalArrangement=Arrangement.spacedBy(9.dp)
                        ){
                            RadioButton7(Icons.Rounded.Call,"Talk toggle",onToggle,
                                size=if(tight)37.dp else 46.dp,
                                tint=if(pressing)amber else Color(0xFFD8F3E3))
                            RadioButton7(Icons.Rounded.PowerSettingsNew,
                                stringResource(R.string.leave),onDisconnect,
                                size=if(tight)37.dp else 46.dp,tint=Color(0xFFFFA28E))
                        }
                    }
                    if(privateName!=null) TextButton(
                        onClick=onGroup,modifier=Modifier.align(Alignment.CenterHorizontally)
                    ){Text(stringResource(R.string.group),color=Color(0xFFB5E7DA))}
                    // Physical function keys; each opens a separate sheet.
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){
                        RadioFunctionKey7(Icons.Rounded.People,stringResource(R.string.members),
                            onMembers,Modifier.weight(1f))
                        RadioFunctionKey7(Icons.Rounded.Chat,stringResource(R.string.chat),
                            onChat,Modifier.weight(1f))
                        RadioFunctionKey7(Icons.Rounded.History,stringResource(R.string.radio_history),
                            onHistory,Modifier.weight(1f))
                    }
                }else{
                    Box(
                        Modifier.fillMaxWidth().weight(1f),
                        contentAlignment=Alignment.Center
                    ){
                        Column(horizontalAlignment=Alignment.CenterHorizontally){
                            RadioSpeakerGrille7(compact)
                            if(!tight)Spacer(Modifier.height(14.dp))
                            Text(stringResource(R.string.radio_offline),
                                color=Color(0xFFB5C8CB),
                                fontSize=if(tight)10.sp else 12.sp)
                        }
                    }
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(9.dp)){
                        RadioFunctionKey7(Icons.Rounded.Radio,stringResource(R.string.host),
                            onHost,Modifier.weight(1f),height=if(tight)47.dp else 61.dp)
                        RadioFunctionKey7(Icons.Rounded.Bluetooth,stringResource(R.string.join),
                            onJoin,Modifier.weight(1f),height=if(tight)47.dp else 61.dp)
                    }
                    if(!permitted)RadioFunctionKey7(Icons.Rounded.Mic,stringResource(R.string.grant),
                        onPermissions,Modifier.fillMaxWidth(),height=42.dp)
                    else RadioFunctionKey7(Icons.Rounded.Settings,stringResource(R.string.radio_configure),
                        onSettings,Modifier.fillMaxWidth(),height=if(tight)37.dp else 43.dp)
                }
                if(!tight){
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.Center,
                        verticalAlignment=Alignment.CenterVertically){
                        Text("R I V O  ·  S E C U R E  R A D I O",color=Color(0xFF83999F),
                            fontSize=8.sp,letterSpacing=1.sp,textAlign=TextAlign.Center)
                    }
                }
            }
        }
    }
}

@Composable
private fun RadioSpeakerGrille7(compact:Boolean){
    Column(verticalArrangement=Arrangement.spacedBy(if(compact)5.dp else 7.dp),
        horizontalAlignment=Alignment.CenterHorizontally){
        repeat(if(compact)4 else 6){
            Box(
                Modifier.width(if(compact)142.dp else 196.dp)
                    .height(if(compact)5.dp else 7.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF0B171B))
            )
        }
    }
}

@Composable
private fun RadioButton7(icon:ImageVector,label:String,onClick:()->Unit,size:androidx.compose.ui.unit.Dp,
    tint:Color=Color(0xFFD8F3E3)){
    Surface(
        onClick=onClick,
        shape=RoundedCornerShape(14.dp),
        color=keyColor,
        shadowElevation=4.dp,
        border=BorderStroke(1.dp,Color(0xFF5B7179)),
        modifier=Modifier.size(size),
        contentColor=tint
    ){
        Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){
            Icon(icon,contentDescription=label,modifier=Modifier.size(size*0.50f))
        }
    }
}
@Composable
private fun RadioFunctionKey7(
    icon:ImageVector,label:String,onClick:()->Unit,modifier:Modifier,
    height:androidx.compose.ui.unit.Dp=56.dp
){
    Surface(
        onClick=onClick,
        modifier=modifier.height(height),
        shape=RoundedCornerShape(13.dp),
        border=BorderStroke(1.dp,Color(0xFF65757B)),
        color=keyColor,
        shadowElevation=3.dp
    ){
        Column(Modifier.fillMaxSize().padding(vertical=4.dp,horizontal=2.dp),
            verticalArrangement=Arrangement.Center,
            horizontalAlignment=Alignment.CenterHorizontally){
            Icon(icon,contentDescription=null,modifier=Modifier.size(19.dp),
                tint=Color(0xFFD7EBE8))
            Text(label,color=Color(0xFFDBEFEC),
                fontSize=10.sp,fontWeight=FontWeight.Bold,
                maxLines=1,overflow=TextOverflow.Ellipsis,textAlign=TextAlign.Center)
        }
    }
}
