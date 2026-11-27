from pathlib import Path
import sys
root=Path(sys.argv[1])/'app'
def exact(path,old,new):
    s=path.read_text()
    assert s.count(old)==1,(str(path),old,s.count(old))
    path.write_text(s.replace(old,new))
gradle=root/'build.gradle.kts'
exact(gradle,'versionCode = 3','versionCode = 4')
exact(gradle,'0.1.0-alpha03','0.1.0-alpha04')
manifest=root/'src/main/AndroidManifest.xml'
exact(manifest,'    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />\n','')
exact(manifest,'android:foregroundServiceType="connectedDevice|microphone"','android:foregroundServiceType="connectedDevice"')
src=root/'src/main/java/com/ribhlab/rivotalk'
exact(src/'TalkService.kt','ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE','ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE')
activity=src/'MainActivity.kt'
s=activity.read_text()
assert 'override fun onPause(){SessionHolder.get(this).release();super.onPause()}' in s
old='text={Text(stringResource(R.string.privacy_text))}'
new='text={Column{Text(stringResource(R.string.privacy_text));TextButton(onClick={runCatching{context.startActivity(Intent(Intent.ACTION_VIEW,android.net.Uri.parse("https://github.com/ribhlab/ribhlab.github.io/blob/main/public/rivotalk/privacy/POLICY.md")))}.onFailure{error=it.message.orEmpty()}}){Text(stringResource(R.string.privacy_policy_link))}}}'
exact(activity,old,new)
for locale,label in [('values','Open privacy policy'),('values-fr','Ouvrir la politique de confidentialité'),('values-ar','فتح سياسة الخصوصية')]:
    exact(root/'src/main/res'/locale/'strings.xml','</resources>',f'<string name="privacy_policy_link">{label}</string></resources>')
assert 'FOREGROUND_SERVICE_MICROPHONE' not in manifest.read_text()
assert 'FOREGROUND_SERVICE_TYPE_MICROPHONE' not in (src/'TalkService.kt').read_text()

# Runtime RECORD_AUDIO may be denied/revoked after screen permission prompts.
audio=src/'AudioEngine.kt'
exact(audio,'import android.media.*','import android.Manifest\nimport android.content.Context\nimport android.content.pm.PackageManager\nimport androidx.core.content.ContextCompat\nimport android.media.*')
exact(audio,'class AudioEngine(private val error: (String)->Unit) {','class AudioEngine(private val context: Context, private val error: (String)->Unit) {')
exact(audio,'        try {\n            val min = AudioRecord.getMinBufferSize(','        if(ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED){\n            error("Microphone permission required")\n            return\n        }\n        try {\n            val min = AudioRecord.getMinBufferSize(')
exact(src/'TalkEngine.kt','private val audio=AudioEngine{message->scheduler.execute{release();audioError(message)}}','private val audio=AudioEngine(context){message->scheduler.execute{release();audioError(message)}}')

# Bluetooth Classic RFCOMM: active discovery competes with connection setup.
# A best-effort cancellation is safe when BLUETOOTH_SCAN is unavailable.
talk=src/'TalkEngine.kt'
exact(talk,'        thread(name="RivoJoin",isDaemon=true){',
          '        thread(name="RivoJoin",isDaemon=true){\n            runCatching { adapter?.cancelDiscovery() }')
exact(talk,'catch(e:Exception){socket?.let{closeSocket(it)}}',
          'catch(e:Exception){\n                    if(live(g))status("Bluetooth channel ${slot+1} failed: ${e.message?:e.javaClass.simpleName}")\n                    socket?.let{closeSocket(it)}\n                }')
print('v4: privacy, foreground, microphone guard and RFCOMM discovery cancellation/diagnostics')
