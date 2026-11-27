from pathlib import Path
import re
import sys
root=Path(sys.argv[1])
app=root/'app'
gradle=app/'build.gradle.kts'
s=gradle.read_text().replace('compileSdk = 37','compileSdk = 36').replace('2026.11.01','2025.10.01').replace('versionCode = 2','versionCode = 3').replace('0.1.0-alpha02','0.1.0-alpha03')
s=s.replace('dependencies {','dependencies {\n    implementation("com.google.android.gms:play-services-ads:24.9.0")\n    implementation("com.google.android.ump:user-messaging-platform:3.2.0")')
gradle.write_text(s)
manifest=app/'src/main/AndroidManifest.xml'
s=manifest.read_text().replace('    <application ', '    <uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n    <application ').replace('        <activity ', '        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-7945572016731367~4681891048" />\n        <activity ')
manifest.write_text(s)
src=app/'src/main/java/com/ribhlab/rivotalk'
p=src/'MainActivity.kt'
s=p.read_text().replace('@OptIn(ExperimentalMaterial3ExpressiveApi::class)\n','').replace('MaterialExpressiveTheme(', 'MaterialTheme(')
s=s.replace('    override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);setContent{RivoTheme{RivoScreen(SessionHolder.get(this))}}}', '''    private lateinit var ads: RivoAds
    override fun onCreate(savedInstanceState:Bundle?){
        super.onCreate(savedInstanceState)
        ads=RivoAds(this)
        setContent{RivoTheme{RivoScreen(SessionHolder.get(this),ads)}}
    }
    override fun onDestroy(){ads.destroy();super.onDestroy()}''')
s=s.replace('fun RivoScreen(engine:TalkEngine){','fun RivoScreen(engine:TalkEngine,ads:RivoAds){')
s=s.replace('    BackHandler(s.role!="idle"){leave()}','''    BackHandler(s.role!="idle"){leave()}
    var sessionStarted by remember{mutableStateOf(0L)}
    LaunchedEffect(s.role){
        if(s.role=="idle"){sessionStarted=0L;ads.requestConsentWhenIdle()}
        else if(sessionStarted==0L){sessionStarted=android.os.SystemClock.elapsedRealtime()}
    }''')
s=s.replace('Scaffold(topBar=', 'Scaffold(bottomBar={if(!active && ads.ready) RivoBanner(ads)},topBar=')
s=s.replace('TextButton(onClick={showPrivacy=true}){Text(stringResource(R.string.privacy))}', 'TextButton(onClick={showPrivacy=true}){Text(stringResource(R.string.privacy))}\n                if(ads.privacyRequired)TextButton(onClick={ads.privacyOptions()}){Text(stringResource(R.string.ad_privacy_options))}')
s=s.replace('OutlinedButton(onClick={leave()},modifier=Modifier.fillMaxWidth())','OutlinedButton(onClick={val elapsed=android.os.SystemClock.elapsedRealtime()-sessionStarted;val eligible=sessionStarted>0 && s.members.size>1 && s.pending.isEmpty();leave();if(eligible)ads.onSessionFinished(elapsed)},modifier=Modifier.fillMaxWidth())')
p.write_text(s)
for locale,privacy,desc,option,label in [
('values','Audio and messages travel through encrypted local Bluetooth links. The host relays and can access audio. Messages stay in memory during the session. No audio recording or account is required. Optional Google AdMob ads use internet access and may process device identifiers, IP address, interactions and diagnostics. Communication works offline regardless of advertising or consent.','Bluetooth communication • No internet or SIM required','Ad privacy choices','Advertisement'),
('values-fr','Le son et les messages transitent localement par Bluetooth chiffré. L’hôte relaie les données et peut accéder au son. Les messages restent en mémoire pendant la session. Aucun enregistrement audio ni compte requis. Les publicités Google AdMob facultatives utilisent Internet et peuvent traiter les identifiants, adresses IP, interactions et diagnostics. La communication fonctionne hors ligne indépendamment des publicités et du consentement.','Communication Bluetooth • Sans Internet ni SIM','Choix de confidentialité des annonces','Publicité'),
('values-ar','ينتقل الصوت والرسائل محلياً عبر بلوتوث مشفر. يمرر المضيف البيانات ويمكنه الوصول إلى الصوت. تحفظ الرسائل في الذاكرة أثناء الجلسة. لا يلزم تسجيل الصوت أو إنشاء حساب. تستخدم إعلانات Google AdMob الاختيارية الإنترنت وقد تعالج معرّفات الجهاز وعنوان IP والتفاعلات والتشخيصات. يعمل الاتصال دون إنترنت بصرف النظر عن الإعلانات أو الموافقة.','اتصال بلوتوث • دون إنترنت أو شريحة','خيارات خصوصية الإعلانات','إعلان')]:
    p=app/'src/main/res'/locale/'strings.xml'
    s=p.read_text()
    s=re.sub(r'(<string name="privacy_text">).*?(</string>)',lambda m:m[1]+privacy+m[2],s)
    s=re.sub(r'(<string name="no_internet">).*?(</string>)',lambda m:m[1]+desc+m[2],s)
    s=s.replace('</resources>',f'<string name="ad_privacy_options">{option}</string><string name="ad_label">{label}</string></resources>')
    p.write_text(s)
