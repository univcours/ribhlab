"""RivoTalk alpha07: actual walkie-talkie casing and a permanently isolated AdMob dock.
Applied *after* alpha06, when RivoAds.kt is already copied to the isolated project.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])/'app'
src=root/'src/main/java/com/ribhlab/rivotalk'
gradle=root/'build.gradle.kts'

def change(file,old,new):
    s=file.read_text(encoding='utf-8')
    n=s.count(old)
    assert n==1,(str(file),old[:100],n)
    file.write_text(s.replace(old,new),encoding='utf-8')

change(gradle,'versionCode = 6','versionCode = 7')
change(gradle,'0.1.0-alpha06','0.1.0-alpha07')

source=Path(__file__).resolve().parent
for name in ['RivoRadioHardware.kt','RivoAdDock.kt']:
    assert (source/name).is_file(),name
    (src/name).write_bytes((source/name).read_bytes())

ui=src/'RivoRadioScreen.kt'
s=ui.read_text(encoding='utf-8')
begin=s.index('    Scaffold(\n')
end=s.index('    if(sheet.isNotEmpty())ModalBottomSheet',begin)
assert s.count('    Scaffold(\n')==1
replacement='''    // The reserved, separately framed ad dock is always below the radio.
    // It is never a floating overlay and never obscures PTT or key controls.
    Scaffold(
        bottomBar={RivoAdDock7(ads)},
        containerColor=MaterialTheme.colorScheme.surface
    ){inset->
        RivoHardwareFace7(
            active=active,
            status=s.status,
            memberCount=s.members.size,
            speakerName=talker?.name,
            privateName=to?.let{id->s.members.firstOrNull{it.id==id}?.name},
            canTalk=canTalk,
            pressing=pressing,
            error=error,
            permitted=permitted,
            onPress={if(canTalk){pressing=true;engine.press(to)}},
            onRelease={pressing=false;engine.release()},
            onToggle={
                if(pressing){pressing=false;engine.release()}
                else if(canTalk){pressing=true;engine.press(to)}
            },
            onSettings={sheet="settings"},
            onMembers={sheet="members"},
            onChat={sheet="chat"},
            onHistory={sheet="history"},
            onHost={start(true)},
            onJoin={start(false)},
            onPermissions={request.launch(permissions)},
            onDisconnect={leave()},
            onGroup={target=null},
            modifier=Modifier.padding(inset)
        )
    }
'''
# Hardware owns its full inset area. The composable takes a Modifier so that
# Scaffold correctly reserves system insets and the banner compartment.
s=s[:begin]+replacement+s[end:]
ui.write_text(s,encoding='utf-8')

hardware=src/'RivoRadioHardware.kt'
change(hardware,'    onGroup:()->Unit\n){','    onGroup:()->Unit,\n    modifier:Modifier=Modifier\n){')
change(hardware,'        Modifier.fillMaxSize().padding(horizontal=10.dp,vertical=7.dp),',
                '        modifier.fillMaxSize().padding(horizontal=10.dp,vertical=7.dp),')

assert 'verticalScroll(' not in s[:s.index('    if(sheet.isNotEmpty())ModalBottomSheet')]
assert 'RivoAdDock7(ads)' in s
assert 'if(canFit&&ads.ready)' in (src/'RivoAdDock.kt').read_text(encoding='utf-8')
assert 'Modifier.size(320.dp,50.dp).clipToBounds()' in (src/'RivoAdDock.kt').read_text(encoding='utf-8')
assert 'getSystemService(Context.AUDIO_SERVICE)' in hardware.read_text(encoding='utf-8')
ads=(src/'RivoAds.kt').read_text(encoding='utf-8')
assert 'else "ca-app-pub-7945572016731367/2047988844"' in ads
assert 'else "ca-app-pub-7945572016731367/8418276872"' in ads
assert 'consent.canRequestAds()' in ads

print('PASS alpha07 versionCode7; physical no-scroll radio; functional keys; fixed separate 320x50 banner below PTT; consent-gated real AdMob')
