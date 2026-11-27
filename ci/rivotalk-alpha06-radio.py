"""Alpha06 radio face + authenticated name audit + opt-in radio ambience.
Apply after alpha05. Changes remain isolated to the RivoTalk project.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])/'app'
src=root/'src/main/java/com/ribhlab/rivotalk'

def change(path,old,new):
    value=path.read_text(encoding='utf-8')
    n=value.count(old)
    assert n==1,(str(path),repr(old[:90]),n)
    path.write_text(value.replace(old,new),encoding='utf-8')

gradle=root/'build.gradle.kts'
change(gradle,'versionCode = 5','versionCode = 6')
change(gradle,'0.1.0-alpha05','0.1.0-alpha06')
change(gradle,'dependencies {','dependencies {\n    implementation("androidx.compose.material:material-icons-extended:1.7.8")')

main=src/'MainActivity.kt'
change(main,'setContent{RivoTheme{RivoScreen(SessionHolder.get(this),ads)}}',
    'setContent{RivoTheme{RivoScreen6(SessionHolder.get(this),ads)}}')
radio=Path(__file__).with_name('RivoRadioScreen.kt')
assert radio.is_file()
(src/'RivoRadioScreen.kt').write_bytes(radio.read_bytes())

protocol=src/'Protocol.kt'
change(protocol,'const val IDENTITY=12 }','const val IDENTITY=12; const val RENAME=13; const val AUDIT=14 }')

engine=src/'TalkEngine.kt'
change(engine,
    'data class Member(val id:String,val name:String,val rights:Rights=Rights())',
    'data class AuditEntry(val actorId:String,val actorName:String,val oldName:String,val newName:String,val at:Long)\n'+
    'data class Member(val id:String,val name:String,val rights:Rights=Rights())')
change(engine,
    'val blocked:List<String> = emptyList())',
    'val blocked:List<String> = emptyList(),val audit:List<AuditEntry> = emptyList())')
change(engine,
    '    private var holding=false;private var floorTimeout:',
    '    private var previousSpeaker:String?=null\n    private var holding=false;private var floorTimeout:')
change(engine,'    private fun syncAudio(){\n        val s=stateMutable.value;val r=members[myId]?.rights',
'''    private fun syncAudio(){
        val newSpeaker=stateMutable.value.speaker
        if(previousSpeaker!=newSpeaker){
            if(previousSpeaker==null && newSpeaker!=null)audio.playRadioCue(true)
            else if(previousSpeaker!=null && newSpeaker==null)audio.playRadioCue(false)
            previousSpeaker=newSpeaker
        }
        val s=stateMutable.value;val r=members[myId]?.rights''')
change(engine,'    private fun audioError(message:String){status(message)}',
'''    private fun audioError(message:String){status(message)}
    fun setRadioMode(on:Boolean){audio.setRadioMode(on)}''')
change(engine,
    'Wire.TEXT->if(f.payload.size in 1..1000)broadcastChat(id,f.payload.toString(Charsets.UTF_8))',
    '''Wire.TEXT->if(f.payload.size in 1..1000)broadcastChat(id,f.payload.toString(Charsets.UTF_8))
        Wire.RENAME->if(f.payload.size in 1..128)renameAs(id,id,f.payload.toString(Charsets.UTF_8))''')
change(engine,
    '        Wire.KICK->{status("Removed by host");upstream?.close()}',
    '''        Wire.AUDIT->{DataInputStream(ByteArrayInputStream(f.payload)).use{input->
            val at=input.readLong()
            val actorId=input.readUTF()
            val actorName=input.readUTF()
            val oldName=input.readUTF()
            val newName=input.readUTF()
            require(input.available()==0)
            require(actorId.length in 1..48 && actorName.length<=48 && oldName.length<=48 && newName.length<=48)
            val entry=AuditEntry(actorId,actorName,oldName,newName,at)
            stateMutable.value=stateMutable.value.copy(audit=(stateMutable.value.audit+entry).takeLast(100))
        }}
        Wire.KICK->{status("Removed by host");upstream?.close()}''')
change(engine,'    fun sendText(text:String){',
'''    /** Host-authoritative member rename. A guest can rename itself only, identified
     * by its authenticated Bluetooth peer ID, not by a client-provided actor field.
     * Each modification is broadcast as an authenticated audit record.
     */
    private fun renameAs(actorId:String,targetId:String,requested:String){
        if(!host || (actorId!=myId && actorId!=targetId))return
        val before=members[targetId]?:return
        val actor=members[actorId]?:return
        val clean=requested.filter{it.isLetterOrDigit() || it==' ' || it in "._-"}
            .trim().take(32)
        if(clean.isEmpty()||clean==before.name)return
        val actorName=actor.name
        val entry=AuditEntry(actorId,actorName,before.name,clean,System.currentTimeMillis())
        members[targetId]=before.copy(name=clean)
        stateMutable.value=stateMutable.value.copy(audit=(stateMutable.value.audit+entry).takeLast(100))
        val payload=ByteArrayOutputStream().also{buf->DataOutputStream(buf).use{out->
            out.writeLong(entry.at)
            out.writeUTF(entry.actorId);out.writeUTF(entry.actorName)
            out.writeUTF(entry.oldName);out.writeUTF(entry.newName)
        }}.toByteArray()
        peers.values.forEach{it.send(Wire.AUDIT,payload)}
        publish()
    }
    fun rename(id:String,requested:String){synchronized(lock){
        if(myId.isBlank())return
        if(host)renameAs(myId,id,requested)
        else if(id==myId){
            val clean=requested.filter{it.isLetterOrDigit() || it==' ' || it in "._-"}
                .trim().take(32)
            if(clean.isNotBlank())upstream?.send(Wire.RENAME,clean.toByteArray(Charsets.UTF_8))
        }
    }}
    fun sendText(text:String){''')
change(engine,'fun leave(){synchronized(lock){epoch.incrementAndGet();',
    'fun leave(){synchronized(lock){epoch.incrementAndGet();previousSpeaker=null;')

audio=src/'AudioEngine.kt'
change(audio,'    private val capturing = AtomicBoolean(false)',
'''    @Volatile private var radioMode=true
    private var lastSample=0.0
    private var high=0.0
    private var low=0.0
    fun setRadioMode(enabled:Boolean){radioMode=enabled}
    /** A subtle, device-local squelch and roger chirp. Not mixed into the microphone
     * or transmitted to members. No continuous ambience draining battery.
     */
    fun playRadioCue(open:Boolean){
        if(!radioMode)return
        thread(name="RivoRadioCue",isDaemon=true){
            var track:AudioTrack?=null
            try{
                val rate=8000
                val count=if(open)840 else 720
                val buf=ShortArray(count){i->
                    val t=i.toDouble()/rate
                    val fade=minOf(1.0,i/80.0,(count-i)/90.0).coerceAtLeast(0.0)
                    val frequency=if(open)1200.0-450.0*i/count else 770.0-290.0*i/count
                    val beep=2700.0*kotlin.math.sin(2.0*kotlin.math.PI*frequency*t)
                    val staticNoise=700.0*(kotlin.math.sin(i*12.97)*kotlin.math.sin(i*3.71))
                    ((beep+staticNoise)*fade).toInt().coerceIn(-5000,5000).toShort()
                }
                val attr=AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
                val format=AudioFormat.Builder().setSampleRate(rate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT).build()
                val min=AudioTrack.getMinBufferSize(rate,AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT)
                if(min<=0)return@thread
                val t=AudioTrack.Builder().setAudioAttributes(attr).setAudioFormat(format)
                    .setTransferMode(AudioTrack.MODE_STREAM)
                    .setBufferSizeInBytes(maxOf(min,buf.size*2)).build()
                track=t
                if(t.state!=AudioTrack.STATE_INITIALIZED)return@thread
                t.setVolume(0.6f);t.play();t.write(buf,0,buf.size)
                Thread.sleep(160)
            }catch(_:Exception){}finally{runCatching{track?.stop()};runCatching{track?.release()}}
        }
    }
    /** 8-kHz radio color: mild speech band-limiting and compression. */
    private fun colorRadio(pcm:ShortArray):ShortArray{
        return ShortArray(pcm.size){i->
            val x=pcm[i].toDouble()
            high=0.90*(high+x-lastSample)
            lastSample=x
            low=0.76*high+0.24*low
            (low*1.13).toInt().coerceIn(-27000,27000).toShort()
        }
    }
    private val capturing = AtomicBoolean(false)''')
change(audio,
    'val pcm=ShortArray(160){MuLaw.decode(f[it])};t.write(pcm,0,pcm.size)',
    'val pcm=ShortArray(160){MuLaw.decode(f[it])};val voice=if(radioMode)colorRadio(pcm)else pcm;t.write(voice,0,voice.size)')
change(audio,'    @Synchronized fun stopPlayback(){playing.set(false);',
    '    @Synchronized fun stopPlayback(){high=0.0;low=0.0;lastSample=0.0;playing.set(false);')

labels={
'values':{
'radio_offline':'Offline · Bluetooth only','radio_settings':'Radio settings',
'radio_push':'HOLD TO TALK','radio_transmitting':'TRANSMITTING',
'radio_handsfree':'Tap to talk','radio_ready':'Your radio is ready',
'radio_configure':'Profile &amp; connections','radio_save_name':'Save display name',
'radio_fx':'Walkie-talkie sound','radio_fx_desc':'Radio voice, short squelch and roger chirps (optional)',
'radio_paired_devices':'Paired Bluetooth devices','radio_history':'Activity log',
'radio_history_hint':'Authenticated name changes during this group session',
'radio_no_history':'No name changes yet','radio_rename':'Change display name'},
'values-fr':{
'radio_offline':'Hors ligne · Bluetooth','radio_settings':'Réglages radio',
'radio_push':'MAINTENIR POUR PARLER','radio_transmitting':'TRANSMISSION',
'radio_handsfree':'Parler (bouton)','radio_ready':'Votre radio est prête',
'radio_configure':'Profil et connexions','radio_save_name':'Enregistrer le nom',
'radio_fx':'Effets talkie-walkie','radio_fx_desc':'Voix radio, squelch et bips courts (facultatifs)',
'radio_paired_devices':'Appareils Bluetooth associés','radio_history':'Journal des activités',
'radio_history_hint':'Modifications de noms authentifiées pendant cette session',
'radio_no_history':'Aucun nom modifié','radio_rename':'Modifier le nom'},
'values-ar':{
'radio_offline':'بدون إنترنت · بلوتوث فقط','radio_settings':'إعدادات اللاسلكي',
'radio_push':'اضغط مطولاً للكلام','radio_transmitting':'جارٍ الإرسال',
'radio_handsfree':'اضغط للتحدث','radio_ready':'جهاز الاتصال جاهز',
'radio_configure':'الملف الشخصي والاتصالات','radio_save_name':'حفظ الاسم',
'radio_fx':'مؤثرات اللاسلكي','radio_fx_desc':'صوت لاسلكي ونقرات البداية والنهاية (اختياري)',
'radio_paired_devices':'أجهزة البلوتوث المقترنة','radio_history':'سجل النشاط',
'radio_history_hint':'تغييرات الأسماء الموثقة خلال هذه الجلسة',
'radio_no_history':'لم يُغيّر أي اسم بعد','radio_rename':'تغيير الاسم'}
}
for locale,values in labels.items():
    f=root/'src/main/res'/locale/'strings.xml'
    snippets=''.join('<string name="'+key+'">'+value+'</string>' for key,value in values.items())
    change(f,'</resources>',snippets+'</resources>')

# Release builds use real AdMob units; debug builds use Google's test IDs.
ads=Path(__file__).with_name('RivoAds.kt').read_text(encoding='utf-8')
assert 'else "ca-app-pub-7945572016731367/2047988844"' in ads
assert 'else "ca-app-pub-7945572016731367/8418276872"' in ads
assert 'consent.canRequestAds()' in ads
print('PASS alpha06 fixed radio dashboard, audited rename protocol, optional radio FX, production AdMob verification')
