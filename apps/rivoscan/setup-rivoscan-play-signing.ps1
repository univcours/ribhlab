# One-time signing-key setup. Run on a trusted Windows machine.
# Keys/passwords are NEVER committed or printed. GitHub secrets are write-only.
[CmdletBinding()]
param([switch]$CreateNew,[string]$ExistingKeystore='',[string]$Alias='rivoscan-upload',[string]$Repository='univcours/ribhlab')
$ErrorActionPreference='Stop'
$hasExisting=-not [string]::IsNullOrWhiteSpace($ExistingKeystore)
if(([bool]$CreateNew) -eq $hasExisting){throw 'Choose exactly one: -CreateNew or -ExistingKeystore <path>; never replace an existing Play key.'}
foreach($command in @('keytool','gh')){
 if(-not (Get-Command $command -ErrorAction SilentlyContinue)){throw "Missing $command. Install Java JDK 21 and GitHub CLI."}
}
if($Alias -notmatch '^[a-zA-Z0-9._-]+$' -or $Repository -notmatch '^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$'){
 throw 'Invalid signing alias or GitHub repository.'
}
& gh auth status 2>$null | Out-Null
if($LASTEXITCODE -ne 0){throw 'Use gh auth login before configuring GitHub secrets.'}
if($CreateNew){
 if(-not $env:LOCALAPPDATA){throw 'Windows LOCALAPPDATA required.'}
 $directory=Join-Path $env:LOCALAPPDATA 'RibhLab\RivoScan\UploadKey'
 [IO.Directory]::CreateDirectory($directory)|Out-Null
 $keyPath=Join-Path $directory 'rivoscan-upload.p12'
 if(Test-Path -LiteralPath $keyPath){throw 'Existing key found. Refusing to regenerate; use -ExistingKeystore.'}
 Write-Host 'Only generate a new key if RivoScan has never registered a Play upload key.'
}else{
 $keyPath=(Resolve-Path -LiteralPath $ExistingKeystore -ErrorAction Stop).Path
}
$secure=Read-Host 'Enter keystore password (16+ characters; keep in password manager)' -AsSecureString
$handle=[IntPtr]::Zero
$plain=$null
$encoded=$null
try{
 $handle=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
 $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle)
 if($plain.Length -lt 16){throw 'Keystore password must contain at least 16 characters.'}
 $env:RIVOSCAN_LOCAL_SIGN_PASS=$plain
 if($CreateNew){
  & keytool -genkeypair -noprompt -storetype PKCS12 -keystore $keyPath -alias $Alias -keyalg RSA -keysize 3072 -validity 3650 -dname 'CN=RivoScan Upload, OU=Android, O=RibhLab, C=MA' -storepass:env RIVOSCAN_LOCAL_SIGN_PASS -keypass:env RIVOSCAN_LOCAL_SIGN_PASS
  if($LASTEXITCODE -ne 0){throw 'keytool failed; no GitHub secret was changed.'}
 }
 & keytool -list -keystore $keyPath -storepass:env RIVOSCAN_LOCAL_SIGN_PASS -alias $Alias | Out-Null
 if($LASTEXITCODE -ne 0){throw 'Alias or password invalid; no GitHub secret was changed.'}
 $encoded=[Convert]::ToBase64String([IO.File]::ReadAllBytes($keyPath))
 function Write-GitHubSecret([string]$name,[string]$value){
  # Direct stdin (no trailing line break), not a process argument or shell log.
  $psi=[Diagnostics.ProcessStartInfo]::new()
  $psi.FileName='gh'
  $psi.Arguments="secret set $name --repo $Repository"
  $psi.UseShellExecute=$false
  $psi.CreateNoWindow=$true
  $psi.RedirectStandardInput=$true
  $psi.RedirectStandardOutput=$true
  $psi.RedirectStandardError=$true
  $process=[Diagnostics.Process]::Start($psi)
  $process.StandardInput.Write($value)
  $process.StandardInput.Close()
  $process.WaitForExit()
  if($process.ExitCode -ne 0){throw "Failed to configure GitHub secret $name"}
  Write-Host "Configured: $name"
  $process.Dispose()
 }
 Write-GitHubSecret 'RIVOSCAN_PLAY_KEYSTORE_B64' $encoded
 Write-GitHubSecret 'RIVOSCAN_PLAY_KEY_ALIAS' $Alias
 Write-GitHubSecret 'RIVOSCAN_PLAY_STORE_PASSWORD' $plain
 # Existing key supported only when its key password equals its store password.
 Write-GitHubSecret 'RIVOSCAN_PLAY_KEY_PASSWORD' $plain
 Write-Host 'Signing secrets configured. No Google Play upload attempted.'
 Write-Host ('Back up your keystore securely outside Git: '+$keyPath)
 Write-Host 'Keep the password in a password manager for future app updates.'
}finally{
 Remove-Item Env:RIVOSCAN_LOCAL_SIGN_PASS -ErrorAction SilentlyContinue
 if($handle -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle)}
 $plain=$null
 $encoded=$null
}
