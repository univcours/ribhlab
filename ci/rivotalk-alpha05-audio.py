"""Alpha05: route walkie-talkie output through the media loudspeaker path.
Applied strictly after the existing alpha03 and alpha04 overlays.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])/'app'
def exact(path,old,new):
    s=path.read_text(encoding='utf-8')
    assert s.count(old)==1,(str(path),old,s.count(old))
    path.write_text(s.replace(old,new),encoding='utf-8')

gradle=root/'build.gradle.kts'
exact(gradle,'versionCode = 4','versionCode = 5')
exact(gradle,'0.1.0-alpha04','0.1.0-alpha05')

src=root/'src/main/java/com/ribhlab/rivotalk'
audio=src/'AudioEngine.kt'
# Playing against VOICE_COMMUNICATION selects the earpiece / call volume on
# many phones; Media is intended for the loudspeaker / media volume control.
exact(audio,'setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)','setUsage(AudioAttributes.USAGE_MEDIA)')
exact(audio,'                t.play();player=t;playing.set(true)','                t.setVolume(1.0f);t.play();player=t;playing.set(true)')
exact(audio,'    @Synchronized fun stopPlayback(){',
'''    /** Local audio check using the SAME G.711 decoder and AudioTrack as inbound speech.
     * Run only with no active floor owner, never using the microphone.
     */
    fun testSpeaker(){
        thread(name="RivoSpeakerTest",isDaemon=true){
            try {
                repeat(50){chunk->
                    val frame=ByteArray(160){offset->
                        val pos=chunk*160+offset
                        val fade=minOf(1.0,pos/400.0,(7999-pos)/400.0)
                        val sample=(9000.0*kotlin.math.sin(2.0*kotlin.math.PI*440.0*pos/8000.0)*fade).toInt().toShort()
                        MuLaw.encode(sample)
                    }
                    play(frame)
                    Thread.sleep(20)
                }
                Thread.sleep(250)
            }catch(e:Exception){error("Speaker test failed: ${e.message?:e.javaClass.simpleName}")}
            finally{stopPlayback()}
        }
    }
    @Synchronized fun stopPlayback(){''')
engine=src/'TalkEngine.kt'
exact(engine,'    private fun audioError(message:String){status(message)}',
      '    private fun audioError(message:String){status(message)}\n    fun testSpeaker(){if(stateMutable.value.speaker==null)audio.testSpeaker()}')
main=src/'MainActivity.kt'
exact(main,'        super.onCreate(savedInstanceState)\\n        ads=RivoAds(this)'.replace('\\n',chr(10)),
      '        super.onCreate(savedInstanceState)\\n        volumeControlStream=android.media.AudioManager.STREAM_MUSIC\\n        ads=RivoAds(this)'.replace('\\n',chr(10)))
exact(main,'                Text(stringResource(R.string.members),style=MaterialTheme.typography.titleLarge)',
'''                OutlinedButton(onClick={engine.testSpeaker()},enabled=s.speaker==null,modifier=Modifier.fillMaxWidth()){
                    Text(stringResource(R.string.test_speaker))
                }
                Text(stringResource(R.string.members),style=MaterialTheme.typography.titleLarge)''')
for locale,label in [
    ('values','Test phone speaker'),
    ('values-fr','Tester le haut-parleur du téléphone'),
    ('values-ar','اختبار مكبر صوت الهاتف'),
]:
    f=root/'src/main/res'/locale/'strings.xml'
    exact(f,'</resources>',f'<string name="test_speaker">{label}</string></resources>')

print('PASS alpha05 media playback, full-level AudioTrack, local speaker test and media volume')
