package com.ribhlab.rivotalk

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat

/** A fixed, no-scroll radio face. Secondary functions use bottom sheets. */
@SuppressLint("MissingPermission")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RivoScreen6(engine:TalkEngine,ads:RivoAds){
    val context=LocalContext.current
    val profile=remember(context){context.getSharedPreferences("rivotalk-profile",0)}
    val prefs=remember(context){context.getSharedPreferences("rivotalk-sfx",0)}
    val s by engine.state.collectAsState()
    val active=s.role!="idle"
    val me=s.members.firstOrNull{it.id==s.myId}
    val talker=s.members.firstOrNull{it.id==s.speaker}
    val canTalk=me?.rights?.speak==true&&(s.speaker==null||s.speaker==s.myId)
    var name by remember{mutableStateOf(profile.getString("nickname",Build.MODEL).orEmpty())}
    var draft by remember{mutableStateOf(name)}
    var selected by remember{mutableStateOf<BluetoothDevice?>(null)}
    var devices by remember{mutableStateOf<List<BluetoothDevice>>(emptyList())}
    var permitted by remember{mutableStateOf(false)}
    var retryHost by remember{mutableStateOf(false)}
    var error by remember{mutableStateOf("")}
    var sheet by remember{mutableStateOf("")}
    var message by remember{mutableStateOf("")}
    var target by remember(s.myId){mutableStateOf<String?>(null)}
    var pressing by remember{mutableStateOf(false)}
    var renaming by remember{mutableStateOf<Member?>(null)}
    var renameText by remember{mutableStateOf("")}
    var banning by remember{mutableStateOf<Member?>(null)}
    var privacy by remember{mutableStateOf(false)}
    var effects by remember{mutableStateOf(prefs.getBoolean("enabled",true))}
    var sessionStart by remember{mutableStateOf(0L)}
    val permissions=remember{buildList{
        add(Manifest.permission.RECORD_AUDIO)
        if(Build.VERSION.SDK_INT>=31)add(Manifest.permission.BLUETOOTH_CONNECT)
        if(Build.VERSION.SDK_INT>=33)add(Manifest.permission.POST_NOTIFICATIONS)
    }.toTypedArray()}
    fun essential()=permissions.filter{it!=Manifest.permission.POST_NOTIFICATIONS}.all{
        ContextCompat.checkSelfPermission(context,it)==PackageManager.PERMISSION_GRANTED
    }
    fun refresh(){
        permitted=essential()
        if(permitted)runCatching{
            devices=engine.paired()
            val known=profile.getString("device","")
            selected=devices.firstOrNull{it.address==known}?:devices.firstOrNull()
        }.onFailure{error=it.message.orEmpty()}
    }
    val request=rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()){refresh()}
    val bluetooth=rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()){refresh()}
    LaunchedEffect(Unit){refresh()}
    LaunchedEffect(effects){engine.setRadioMode(effects)}
    LaunchedEffect(s.role){
        if(s.role=="idle"){sessionStart=0L;ads.requestConsentWhenIdle()}
        else if(sessionStart==0L)sessionStart=android.os.SystemClock.elapsedRealtime()
    }
    fun start(asHost:Boolean){
        error=""
        if(!essential()){retryHost=asHost;request.launch(permissions);return}
        if(!engine.enabled()){bluetooth.launch(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE));return}
        if(!asHost&&selected==null){sheet="settings";return}
        try{
            ContextCompat.startForegroundService(context,Intent(context,TalkService::class.java))
            if(asHost)engine.host(name.trim().ifBlank{"Host"})
            else selected?.let{engine.join(name.trim().ifBlank{"Member"},it)}
        }catch(e:Exception){error=e.message.orEmpty()}
    }
    LaunchedEffect(permitted,retryHost){
        if(permitted&&retryHost&&s.role=="idle"){retryHost=false;start(true)}
    }
    fun leave(){
        val elapsed=android.os.SystemClock.elapsedRealtime()-sessionStart
        val monetizable=sessionStart>0&&s.members.size>1&&s.pending.isEmpty()
        engine.leave();context.stopService(Intent(context,TalkService::class.java))
        pressing=false;sheet=""
        if(monetizable)ads.onSessionFinished(elapsed)
    }
    BackHandler(active&&sheet.isEmpty()){leave()}
    LaunchedEffect(s.speaker,me?.rights?.speak){
        if(me?.rights?.speak!=true||(s.speaker!=null&&s.speaker!=s.myId)){
            pressing=false;engine.release()
        }
    }
    val to=target?.takeIf{id->s.members.any{it.id==id&&it.rights.call&&it.rights.listen}&&me?.rights?.call==true}
    fun saveAlias(){
        val new=draft.filter{it.isLetterOrDigit()||it==' '||it in "._-"}.trim().take(32)
        if(new.isNotEmpty()){
            name=new
            profile.edit().putString("nickname",new).apply()
            if(active)engine.rename(s.myId,new)
        }
    }
    Scaffold(
        topBar={TopAppBar(
            title={Row(verticalAlignment=Alignment.CenterVertically){
                Icon(Icons.Rounded.Radio,null,tint=MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(9.dp))
                Column{
                    Text("RivoTalk",style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black)
                    Text(stringResource(R.string.radio_offline),style=MaterialTheme.typography.labelSmall)
                }
            }},
            actions={IconButton(onClick={sheet="settings"}){Icon(Icons.Rounded.Settings,stringResource(R.string.radio_settings))}}
        )},
        bottomBar={if(!active&&ads.ready)RivoBanner(ads)}
    ){inset->
        Column(Modifier.padding(inset).fillMaxSize().padding(horizontal=16.dp,vertical=6.dp),
            horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(9.dp)){
            Surface(shape=RoundedCornerShape(22.dp),color=Color(0xFF102832),modifier=Modifier.fillMaxWidth()){
                Row(Modifier.padding(16.dp),verticalAlignment=Alignment.CenterVertically){
                    Column(Modifier.weight(1f)){
                        Text(if(active)"CH 01 • GROUP" else "CH 01 • STANDBY",color=Color(0xFF7FE4B5),
                            fontWeight=FontWeight.Bold,style=MaterialTheme.typography.titleMedium)
                        Text(if(active)s.status else stringResource(R.string.ready),
                            color=Color.White,style=MaterialTheme.typography.labelSmall,maxLines=1,
                            overflow=TextOverflow.Ellipsis)
                    }
                    Text(if(active)s.members.size.toString()+" ●" else "OFF",color=Color(0xFF9BFAC8))
                }
            }
            if(error.isNotEmpty())Text(error,color=MaterialTheme.colorScheme.error,
                style=MaterialTheme.typography.labelSmall,maxLines=2)
            if(active){
                Column(horizontalAlignment=Alignment.CenterHorizontally){
                    Text(talker?.let{stringResource(R.string.speaking,it.name)}
                        ?:stringResource(R.string.floor_free),style=MaterialTheme.typography.titleMedium,
                        maxLines=1,overflow=TextOverflow.Ellipsis)
                    Text(to?.let{id->s.members.firstOrNull{it.id==id}?.name}
                        ?.let{stringResource(R.string.private_to,it)}
                        ?:stringResource(R.string.group),
                        style=MaterialTheme.typography.labelSmall)
                }
                BoxWithConstraints(Modifier.weight(1f).fillMaxWidth(),contentAlignment=Alignment.Center){
                    val diameter=minOf(maxWidth*0.78f,maxHeight*0.94f,290.dp)
                    val bg=if(pressing)Color(0xFFFFD685)
                        else if(canTalk)MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surfaceVariant
                    Surface(
                        color=bg,shape=CircleShape,shadowElevation=10.dp,
                        border=BorderStroke(6.dp,MaterialTheme.colorScheme.outlineVariant),
                        modifier=Modifier.size(diameter).semantics{
                            contentDescription=context.getString(R.string.ptt)
                            role=Role.Button
                            if(!canTalk)disabled()
                        }.pointerInput(s.myId,canTalk,to){
                            detectTapGestures(onPress={
                                if(canTalk){
                                    pressing=true;engine.press(to)
                                    try{tryAwaitRelease()}finally{pressing=false;engine.release()}
                                }
                            })
                        }
                    ){
                        Column(Modifier.fillMaxSize(),verticalArrangement=Arrangement.Center,
                            horizontalAlignment=Alignment.CenterHorizontally){
                            Icon(Icons.Rounded.Mic,null,Modifier.size(diameter*0.25f),
                                tint=MaterialTheme.colorScheme.onPrimary)
                            Text(if(pressing)stringResource(R.string.radio_transmitting)
                                else if(canTalk)stringResource(R.string.radio_push)
                                else stringResource(R.string.unavailable),
                                fontWeight=FontWeight.Black,style=MaterialTheme.typography.titleMedium,
                                color=MaterialTheme.colorScheme.onPrimary)
                        }
                    }
                }
                Row(verticalAlignment=Alignment.CenterVertically){
                    FilledTonalButton(onClick={
                        if(pressing){pressing=false;engine.release()}
                        else if(canTalk){pressing=true;engine.press(to)}
                    },enabled=canTalk||pressing){
                        Icon(if(pressing)Icons.Rounded.Stop else Icons.Rounded.Mic,null)
                        Spacer(Modifier.width(6.dp))
                        Text(if(pressing)stringResource(R.string.stop_talk)
                            else stringResource(R.string.radio_handsfree))
                    }
                    if(to!=null)TextButton(onClick={target=null}){Text(stringResource(R.string.group))}
                }
                NavigationBar(containerColor=MaterialTheme.colorScheme.surfaceContainerLow){
                    NavigationBarItem(false,{sheet="members"},{Icon(Icons.Rounded.People,null)},
                        label={Text(stringResource(R.string.members))})
                    NavigationBarItem(false,{sheet="chat"},{Icon(Icons.Rounded.Chat,null)},
                        label={Text(stringResource(R.string.chat))})
                    NavigationBarItem(false,{sheet="history"},{Icon(Icons.Rounded.History,null)},
                        label={Text(stringResource(R.string.radio_history))})
                }
            }else{
                Box(Modifier.fillMaxWidth().weight(1f),contentAlignment=Alignment.Center){
                    Column(horizontalAlignment=Alignment.CenterHorizontally,
                        verticalArrangement=Arrangement.spacedBy(12.dp)){
                        Surface(shape=CircleShape,color=MaterialTheme.colorScheme.primaryContainer){
                            Icon(Icons.Rounded.Radio,null,Modifier.padding(22.dp).size(92.dp),
                                tint=MaterialTheme.colorScheme.onPrimaryContainer)
                        }
                        Text(stringResource(R.string.radio_ready),
                            style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
                        Text(stringResource(R.string.no_internet),style=MaterialTheme.typography.bodySmall)
                    }
                }
                Button(onClick={start(true)},modifier=Modifier.fillMaxWidth().height(56.dp)){
                    Icon(Icons.Rounded.Radio,null);Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.host))
                }
                OutlinedButton(onClick={start(false)},modifier=Modifier.fillMaxWidth().height(52.dp)){
                    Icon(Icons.Rounded.Bluetooth,null);Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.join))
                }
                if(!permitted)TextButton(onClick={request.launch(permissions)}){
                    Text(stringResource(R.string.grant))
                }
                TextButton(onClick={sheet="settings"}){Text(stringResource(R.string.radio_configure))}
            }
        }
    }
    if(sheet.isNotEmpty())ModalBottomSheet(onDismissRequest={sheet=""},
        sheetState=rememberModalBottomSheetState(skipPartiallyExpanded=true)){
        Column(Modifier.fillMaxWidth().heightIn(max=630.dp).verticalScroll(rememberScrollState())
            .imePadding().padding(horizontal=20.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
            when(sheet){
                "settings"->{
                    Text(stringResource(R.string.radio_settings),style=MaterialTheme.typography.headlineSmall)
                    OutlinedTextField(draft,{draft=it.take(32)},label={Text(stringResource(R.string.name))},
                        modifier=Modifier.fillMaxWidth(),singleLine=true)
                    Button(onClick={saveAlias()},modifier=Modifier.fillMaxWidth()){
                        Icon(Icons.Rounded.Edit,null);Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.radio_save_name))
                    }
                    HorizontalDivider()
                    Row(verticalAlignment=Alignment.CenterVertically){
                        Column(Modifier.weight(1f)){
                            Text(stringResource(R.string.radio_fx))
                            Text(stringResource(R.string.radio_fx_desc),
                                style=MaterialTheme.typography.bodySmall)
                        }
                        Switch(checked=effects,onCheckedChange={
                            effects=it;prefs.edit().putBoolean("enabled",it).apply()
                            engine.setRadioMode(it)
                        })
                    }
                    OutlinedButton(onClick={engine.testSpeaker()},modifier=Modifier.fillMaxWidth()){
                        Icon(Icons.Rounded.VolumeUp,null);Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.test_speaker))
                    }
                    HorizontalDivider()
                    Text(stringResource(R.string.radio_paired_devices),style=MaterialTheme.typography.titleMedium)
                    TextButton(onClick={bluetooth.launch(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))}){
                        Text(stringResource(R.string.pair))
                    }
                    TextButton(onClick={refresh()}){Text(stringResource(R.string.refresh))}
                    devices.forEach{d->
                        Row(Modifier.fillMaxWidth().clickable{
                            selected=d;profile.edit().putString("device",d.address).apply()
                        },verticalAlignment=Alignment.CenterVertically){
                            RadioButton(selected?.address==d.address,onClick={
                                selected=d;profile.edit().putString("device",d.address).apply()
                            })
                            Column{Text(d.name?:d.address);Text(d.address,style=MaterialTheme.typography.labelSmall)}
                        }
                    }
                    HorizontalDivider()
                    TextButton(onClick={privacy=true}){Text(stringResource(R.string.privacy))}
                    if(!active&&ads.privacyRequired)TextButton(onClick={ads.privacyOptions()}){
                        Text(stringResource(R.string.ad_privacy_options))
                    }
                    TextButton(onClick={sheet="diagnostics"}){Text(stringResource(R.string.stats))}
                    if(s.role=="host")TextButton(onClick={sheet="blocked"}){
                        Text(stringResource(R.string.blocked_count,s.blocked.size))
                    }
                    if(active)Button(onClick={leave()},modifier=Modifier.fillMaxWidth()){
                        Icon(Icons.Rounded.PowerSettingsNew,null)
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.leave))
                    }
                }
                "members"->{
                    Text(stringResource(R.string.members),style=MaterialTheme.typography.headlineSmall)
                    s.members.forEach{m->
                        ElevatedCard(Modifier.fillMaxWidth()){
                            Column(Modifier.padding(12.dp)){
                                Row(verticalAlignment=Alignment.CenterVertically){
                                    Icon(Icons.Rounded.Person,null)
                                    Spacer(Modifier.width(6.dp))
                                    Text(m.name,modifier=Modifier.weight(1f))
                                    if(m.id==s.myId)Text(stringResource(R.string.you))
                                    if(s.role=="host"||m.id==s.myId)IconButton(onClick={
                                        renaming=m;renameText=m.name
                                    }){Icon(Icons.Rounded.Edit,stringResource(R.string.radio_rename))}
                                }
                                if(m.id!=s.myId){
                                    TextButton(onClick={target=m.id;sheet=""},enabled=m.rights.call&&
                                        m.rights.listen&&me?.rights?.call==true){
                                        Text(stringResource(R.string.private_ptt))
                                    }
                                    if(s.role=="host"){
                                        PermissionRow(stringResource(R.string.speak),m.rights.speak){
                                            engine.rights(m.id,m.rights.copy(speak=it))
                                        }
                                        PermissionRow(stringResource(R.string.listen),m.rights.listen){
                                            engine.rights(m.id,m.rights.copy(listen=it))
                                        }
                                        PermissionRow(stringResource(R.string.calls),m.rights.call){
                                            engine.rights(m.id,m.rights.copy(call=it))
                                        }
                                        Row{
                                            TextButton(onClick={engine.kick(m.id)}){
                                                Text(stringResource(R.string.kick))
                                            }
                                            TextButton(onClick={banning=m}){Text(stringResource(R.string.ban))}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                "chat"->{
                    Text(stringResource(R.string.chat),style=MaterialTheme.typography.headlineSmall)
                    s.chat.takeLast(70).forEach{c->
                        ElevatedCard(Modifier.fillMaxWidth()){
                            Column(Modifier.padding(12.dp)){
                                Text(c.from,fontWeight=FontWeight.Bold,style=MaterialTheme.typography.labelMedium)
                                Text(c.text)
                            }
                        }
                    }
                    OutlinedTextField(message,{message=it.take(250)},
                        modifier=Modifier.fillMaxWidth(),label={Text(stringResource(R.string.message))})
                    Button(onClick={engine.sendText(message);message=""},enabled=message.isNotBlank()&&me!=null,
                        modifier=Modifier.fillMaxWidth()){
                        Icon(Icons.Rounded.Send,null);Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.send))
                    }
                }
                "history"->{
                    Text(stringResource(R.string.radio_history),style=MaterialTheme.typography.headlineSmall)
                    Text(stringResource(R.string.radio_history_hint),style=MaterialTheme.typography.bodySmall)
                    if(s.audit.isEmpty())Text(stringResource(R.string.radio_no_history))
                    s.audit.takeLast(80).reversed().forEach{e->
                        ElevatedCard(Modifier.fillMaxWidth()){
                            Column(Modifier.padding(12.dp)){
                                Text(e.actorName+" ("+e.actorId.take(8)+")",fontWeight=FontWeight.Bold)
                                Text(e.oldName+" → "+e.newName)
                                Text(java.text.SimpleDateFormat("HH:mm:ss",java.util.Locale.getDefault())
                                    .format(java.util.Date(e.at)),style=MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
                "diagnostics"->{
                    Text(stringResource(R.string.stats),style=MaterialTheme.typography.headlineSmall)
                    Text("RFCOMM · AES-GCM · G.711 μ-law")
                    Text(stringResource(R.string.sent,s.bytesSent))
                    Text(stringResource(R.string.received,s.bytesReceived))
                    Text(stringResource(R.string.members_count,s.members.size))
                }
                "blocked"->{
                    Text(stringResource(R.string.blocked_count,s.blocked.size),
                        style=MaterialTheme.typography.headlineSmall)
                    if(s.blocked.isEmpty())Text(stringResource(R.string.no_blocked))
                    s.blocked.forEach{fingerprint->
                        Row(verticalAlignment=Alignment.CenterVertically){
                            Text(fingerprint.take(20)+"…",Modifier.weight(1f))
                            TextButton(onClick={engine.unban(fingerprint)}){
                                Text(stringResource(R.string.unban))
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
    renaming?.let{m->
        AlertDialog(onDismissRequest={renaming=null},
            title={Text(stringResource(R.string.radio_rename))},
            text={OutlinedTextField(renameText,{renameText=it.take(32)},
                label={Text(stringResource(R.string.name))})},
            confirmButton={Button(onClick={
                engine.rename(m.id,renameText)
                if(m.id==s.myId){
                    draft=renameText
                    saveAlias()
                }
                renaming=null
            }){Text(stringResource(R.string.radio_save_name))}},
            dismissButton={TextButton(onClick={renaming=null}){Text(stringResource(R.string.close))}}
        )
    }
    s.pending.firstOrNull()?.let{p->
        AlertDialog(onDismissRequest={engine.confirm(p.id,false)},
            title={Text(stringResource(R.string.verify))},
            text={Column{
                Text(p.name)
                Text(p.code,style=MaterialTheme.typography.headlineSmall)
                Text(stringResource(R.string.verify_hint))
            }},
            confirmButton={Button(onClick={engine.confirm(p.id,true)}){
                Text(stringResource(R.string.match))
            }},
            dismissButton={TextButton(onClick={engine.confirm(p.id,false)}){
                Text(stringResource(R.string.reject))
            }}
        )
    }
    banning?.let{m->
        AlertDialog(onDismissRequest={banning=null},title={Text(stringResource(R.string.ban))},
            text={Text(stringResource(R.string.ban_confirm,m.name))},
            confirmButton={Button(onClick={engine.ban(m.id);banning=null}){
                Text(stringResource(R.string.ban))
            }},
            dismissButton={TextButton(onClick={banning=null}){Text(stringResource(R.string.close))}}
        )
    }
    if(privacy)AlertDialog(onDismissRequest={privacy=false},
        title={Text(stringResource(R.string.privacy))},
        text={Column{
            Text(stringResource(R.string.privacy_text))
            TextButton(onClick={runCatching{context.startActivity(Intent(Intent.ACTION_VIEW,
                android.net.Uri.parse("https://github.com/ribhlab/ribhlab.github.io/blob/main/public/rivotalk/privacy/POLICY.md")))}}){
                Text(stringResource(R.string.privacy_policy_link))
            }
        }},
        confirmButton={TextButton(onClick={privacy=false}){Text(stringResource(R.string.close))}}
    )
}
