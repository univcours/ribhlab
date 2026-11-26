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
print('v4: connected-device-only service; foreground-only PTT and clickable privacy policy')
