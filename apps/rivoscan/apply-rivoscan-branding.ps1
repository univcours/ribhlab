# RivoScan branded launcher icon for Samsung / Android 8+ and legacy devices.
# Safe to re-run after every Capacitor sync. Produces adaptive, themed and legacy icons.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$source = Join-Path $root 'assets/icon.png.b64'
$res = Join-Path $root 'android/app/src/main/res'
$manifest = Join-Path $root 'android/app/src/main/AndroidManifest.xml'
$gradle = Join-Path $root 'android/app/build.gradle'
if(-not (Test-Path -LiteralPath $source) -or -not (Test-Path -LiteralPath $manifest)) {
  throw 'RivoScan Android project or branding source missing. Run npm run build and npx cap sync android first.'
}

$bytes = [Convert]::FromBase64String([IO.File]::ReadAllText($source).Trim())
if($bytes.Length -lt 8 -or $bytes[0] -ne 137 -or $bytes[1] -ne 80 -or $bytes[2] -ne 78 -or $bytes[3] -ne 71) {
  throw 'RivoScan launcher artwork is not a valid PNG.'
}
$utf8 = [Text.UTF8Encoding]::new($false)
function Write-Xml([string]$file,[string]$data) {
  [IO.Directory]::CreateDirectory((Split-Path -Parent $file)) | Out-Null
  [IO.File]::WriteAllText($file,$data,$utf8)
}

# Keep a non-adaptive bitmap fallback for old devices.
$drawable = Join-Path $res 'drawable-nodpi'
[IO.Directory]::CreateDirectory($drawable) | Out-Null
[IO.File]::WriteAllBytes((Join-Path $drawable 'rivoscan_icon.png'),$bytes)
foreach($bucket in @('mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi')) {
  $folder = Join-Path $res ('mipmap-'+$bucket)
  [IO.Directory]::CreateDirectory($folder) | Out-Null
  # Generated Capacitor template may use webp or png. Avoid duplicate resource names.
  foreach($name in @('ic_launcher','ic_launcher_round')) {
    foreach($ext in @('webp','png')) {
      $old = Join-Path $folder ($name+'.'+$ext)
      if(Test-Path -LiteralPath $old) { Remove-Item -LiteralPath $old -Force }
    }
    [IO.File]::WriteAllBytes((Join-Path $folder ($name+'.png')),$bytes)
  }
}

# Foreground art based on the official RivoScan logo: page, four scan corners, laser line.
# Artwork stays within the adaptive safe zone. Android applies round/squircle masks.
$foreground = @'
<vector xmlns:android="http://schemas.android.com/apk/res/android"
  android:width="108dp" android:height="108dp"
  android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#DCEFFF" android:pathData="M39,27 L62,27 L74,39 L74,81 Q74,84 71,84 L39,84 Q35,84 35,80 L35,31 Q35,27 39,27 Z"/>
  <path android:fillColor="#0A75F5" android:pathData="M62,27 L62,37 Q62,41 66,41 L74,41 Z"/>
  <path android:fillColor="#166FF8" android:pathData="M43,48 L60,48 Q62,48 62,50 L62,51 Q62,53 60,53 L43,53 Q41,53 41,51 L41,50 Q41,48 43,48 Z"/>
  <path android:fillColor="#8AABCF" android:pathData="M43,59 L67,59 Q69,59 69,61 L69,62 Q69,64 67,64 L43,64 Q41,64 41,62 L41,61 Q41,59 43,59 Z"/>
  <path android:fillColor="#8AABCF" android:pathData="M43,68 L67,68 Q69,68 69,70 L69,71 Q69,73 67,73 L43,73 Q41,73 41,71 L41,70 Q41,68 43,68 Z"/>
  <path android:fillColor="@android:color/transparent" android:strokeColor="#0386F8" android:strokeWidth="5"
    android:strokeLineCap="round" android:pathData="M29,41 L29,31 Q29,25 35,25 L41,25"/>
  <path android:fillColor="@android:color/transparent" android:strokeColor="#154DE4" android:strokeWidth="5"
    android:strokeLineCap="round" android:pathData="M67,25 L73,25 Q79,25 79,31 L79,41"/>
  <path android:fillColor="@android:color/transparent" android:strokeColor="#0386F8" android:strokeWidth="5"
    android:strokeLineCap="round" android:pathData="M29,68 L29,77 Q29,83 35,83 L41,83"/>
  <path android:fillColor="@android:color/transparent" android:strokeColor="#154DE4" android:strokeWidth="5"
    android:strokeLineCap="round" android:pathData="M67,83 L73,83 Q79,83 79,77 L79,68"/>
  <path android:strokeColor="#00CFF3" android:strokeWidth="2.8" android:strokeLineCap="round"
    android:pathData="M32,66 L76,66"/>
</vector>
'@
$monochrome = @'
<vector xmlns:android="http://schemas.android.com/apk/res/android"
  android:width="108dp" android:height="108dp"
  android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#000000" android:pathData="M39,27 L62,27 L74,39 L74,81 L35,81 L35,31 Q35,27 39,27 Z"/>
  <path android:fillColor="@android:color/transparent" android:strokeColor="#000000" android:strokeWidth="5"
    android:strokeLineCap="round" android:pathData="M29,41 L29,31 Q29,25 35,25 L41,25 M67,25 L73,25 Q79,25 79,31 L79,41 M29,68 L29,77 Q29,83 35,83 L41,83 M67,83 L73,83 Q79,83 79,77 L79,68"/>
</vector>
'@
$adaptive = @'
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/rivoscan_launcher_background"/>
    <foreground android:drawable="@drawable/rivoscan_launcher_foreground"/>
    <monochrome android:drawable="@drawable/rivoscan_launcher_monochrome"/>
</adaptive-icon>
'@
$background = @'
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#F6FAFF"/>
</shape>
'@
Write-Xml (Join-Path $res 'drawable/rivoscan_launcher_background.xml') $background
Write-Xml (Join-Path $res 'drawable/rivoscan_launcher_foreground.xml') $foreground
Write-Xml (Join-Path $res 'drawable/rivoscan_launcher_monochrome.xml') $monochrome
Write-Xml (Join-Path $res 'mipmap-anydpi-v26/ic_launcher.xml') $adaptive
Write-Xml (Join-Path $res 'mipmap-anydpi-v26/ic_launcher_round.xml') $adaptive

$xml = [IO.File]::ReadAllText($manifest)
# Use Android system-defined adaptive launcher names, not the older flat drawable.
if($xml -match 'android:icon="[^"]+"') {
  $xml=[regex]::Replace($xml,'android:icon="[^"]+"','android:icon="@mipmap/ic_launcher"')
} else {
  $xml=$xml.Replace('<application','<application android:icon="@mipmap/ic_launcher"')
}
if($xml -match 'android:roundIcon="[^"]+"') {
  $xml=[regex]::Replace($xml,'android:roundIcon="[^"]+"','android:roundIcon="@mipmap/ic_launcher_round"')
} else {
  $xml=$xml.Replace('<application','<application android:roundIcon="@mipmap/ic_launcher_round"')
}
[IO.File]::WriteAllText($manifest,$xml,$utf8)

# Bump preview build version to make the new installation easier to distinguish.
if(Test-Path -LiteralPath $gradle) {
  $settings=[IO.File]::ReadAllText($gradle)
  $settings=[regex]::Replace($settings,'(?m)^(\s*versionCode\s+)\d+','${1}10')
  $settings=[regex]::Replace($settings,'(?m)^(\s*versionName\s+)"[^"]*"','${1}"0.10.0"')
  [IO.File]::WriteAllText($gradle,$settings,$utf8)
}

# Fail before building if an older icon slipped back into the manifest.
$verify = [IO.File]::ReadAllText($manifest)
if(-not $verify.Contains('android:icon="@mipmap/ic_launcher"') -or
   -not $verify.Contains('android:roundIcon="@mipmap/ic_launcher_round"')) {
  throw 'Android manifest is not using the new RivoScan adaptive launcher icons.'
}
Write-Host 'PASS: RivoScan icon applied (adaptive + monochrome + legacy) and preview version 0.10.0.' -ForegroundColor Green
