"""Alpha08: diagnostics and bounded retry for real AdMob on TOP of alpha07 UI.

Apply strictly after alpha07; fail closed if older source or wrong patch order.
Do not change the original signed alpha07 build files, package name or ad IDs.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])/'app'
src=root/'src/main/java/com/ribhlab/rivotalk'
gradle=root/'build.gradle.kts'

def exact(path, old, new):
    body=path.read_text(encoding='utf-8')
    assert body.count(old)==1,(str(path),repr(old[:100]),body.count(old))
    path.write_text(body.replace(old,new),encoding='utf-8')

exact(gradle,'versionCode = 7','versionCode = 8')
exact(gradle,'0.1.0-alpha07','0.1.0-alpha08')

new_dock=Path(__file__).with_name('RivoAdDock08.kt')
assert new_dock.is_file()
old_dock=src/'RivoAdDock.kt'
assert 'fun RivoAdDock7(ads:RivoAds)' in old_dock.read_text(encoding='utf-8')
assert 'if(canFit&&ads.ready)' in old_dock.read_text(encoding='utf-8')
old_dock.write_bytes(new_dock.read_bytes())

ads=src/'RivoAds.kt'
exact(ads,
      '    private fun updateChoices(){',
      '''    /** Reuse previously valid UMP consent on activity recreation, even if the
     * Bluetooth group is already active. Refresh consent normally while idle.
     */
    fun initializeFromSavedConsent(){
        if(consent.canRequestAds())updateChoices()
    }
    private fun updateChoices(){''')

main=src/'MainActivity.kt'
exact(main,
      '        ads=RivoAds(this)\n',
      '        ads=RivoAds(this)\n        ads.initializeFromSavedConsent()\n')

labels={
    'values':{
        'ad_loading':'Loading advertisement…',
        'ad_not_ready':'Ads unavailable: check Internet and consent',
        'ad_request_failed':'Ad unavailable (AdMob code %1$d)',
        'ad_screen_too_narrow':'Screen too narrow for a banner'},
    'values-fr':{
        'ad_loading':'Chargement de la publicité…',
        'ad_not_ready':'Annonces indisponibles : Internet ou consentement',
        'ad_request_failed':'Annonce indisponible (code AdMob %1$d)',
        'ad_screen_too_narrow':'Écran trop étroit pour une bannière'},
    'values-ar':{
        'ad_loading':'جاري تحميل الإعلان…',
        'ad_not_ready':'الإعلانات غير متاحة: تحقق من الإنترنت والموافقة',
        'ad_request_failed':'الإعلان غير متاح (رمز AdMob %1$d)',
        'ad_screen_too_narrow':'الشاشة ضيقة جدًا للبانر'}
}
for locale,entries in labels.items():
    f=root/'src/main/res'/locale/'strings.xml'
    tags=''.join(f'<string name="{key}">{value}</string>' for key,value in entries.items())
    exact(f,'</resources>',tags+'</resources>')

assert 'ca-app-pub-7945572016731367/2047988844' in ads.read_text()
assert 'ca-app-pub-7945572016731367/8418276872' in ads.read_text()
assert 'ca-app-pub-3940256099942544/6300978111' in ads.read_text()
dock=old_dock.read_text(encoding='utf-8')
for token in ['RivoTalkAdMob','onAdFailedToLoad','LaunchedEffect(view,attempts)',
              'if(canFit && ads.ready)','Modifier.size(320.dp,50.dp).clipToBounds()']:
    assert token in dock,token
assert 'RivoAdDock7(ads)' in (src/'RivoRadioScreen.kt').read_text()
print('PASS alpha08 based on alpha07: real AdMob, explicit no-fill codes, backoff, UMP resume')
