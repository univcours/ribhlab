#!/usr/bin/env python3
"""Load Play upload key from Actions secrets into ephemeral runner memory/storage."""
import base64, binascii, os, re, subprocess
from pathlib import Path
needed=["RIVO_UPLOAD_KEYSTORE_BASE64","RIVO_UPLOAD_STORE_PASSWORD","RIVO_UPLOAD_KEY_PASSWORD","GITHUB_ENV"]
missing=[n for n in needed if not os.environ.get(n)]
if missing: raise SystemExit("Missing GitHub Actions signing secrets: "+", ".join(missing))
try: data=base64.b64decode(os.environ["RIVO_UPLOAD_KEYSTORE_BASE64"].strip(),validate=True)
except (ValueError,binascii.Error): raise SystemExit("Invalid keystore base64")
if len(data)<500 or data[0]!=0x30: raise SystemExit("Upload key does not look like PKCS12")
p=Path(os.environ.get("RUNNER_TEMP","/tmp"))/"rivoscan-play-upload.p12"
p.write_bytes(data)
os.chmod(p,0o600)
# Use the original keystore's actual alias rather than assuming key0.
# keytool receives the password from an environment variable, never CLI arguments.
EXPECTED_SHA1="E9:B3:E2:77:95:75:BA:08:A9:13:72:FC:38:85:EB:A0:1D:D3:E7:3E"
try:
    certs=subprocess.run(
        ["keytool","-list","-v","-storetype","PKCS12","-keystore",str(p),
         "-storepass:env","RIVO_UPLOAD_STORE_PASSWORD"],
        capture_output=True,text=True,check=True,
    ).stdout
except (subprocess.CalledProcessError,FileNotFoundError):
    raise SystemExit(
        "RivoScan keystore could not be opened. Verify RIVO_CORRECT_KEY_PASSWORD "
        "and that RIVO_CORRECT_KEYSTORE_BASE64 is the original keystore; no bundle signed."
    )
matched_aliases=[]
observed=[]
for chunk in re.split(r"(?im)^Alias name:\s*",certs)[1:]:
    alias=chunk.splitlines()[0].strip()
    sha=re.search(r"(?im)^\s*SHA1:\s*([A-F0-9:]+)",chunk)
    if not sha or not alias: continue
    fingerprint=sha.group(1).upper()
    observed.append(fingerprint)
    if fingerprint==EXPECTED_SHA1: matched_aliases.append(alias)
if len(matched_aliases)!=1 or any(c in matched_aliases[0] for c in "\r\n="):
    raise SystemExit(
        "RivoScan signing certificate does not uniquely match the existing Play upload key. "
        "Expected SHA1: "+EXPECTED_SHA1+
        ". Keystore certificate(s): "+", ".join(observed or ["unreadable"]) +
        ". No bundle signed."
    )
detected_alias=matched_aliases[0]
print("Original Google Play RivoScan signing certificate verified; alias auto-detected.")
gradle=Path("android/app/build.gradle")
if not gradle.is_file(): raise SystemExit("Generated Android project missing")
if "signingConfigs.rivoUpload" in gradle.read_text(): raise SystemExit("Signing already configured")
gradle.write_text(gradle.read_text()+"""
// CI only, no credentials in source or build logs
android {
 signingConfigs {
  rivoUpload {
   storeFile file(System.getenv('RIVO_SIGNING_KEYSTORE_PATH'))
   storePassword System.getenv('RIVO_UPLOAD_STORE_PASSWORD')
   keyAlias System.getenv('RIVO_UPLOAD_KEY_ALIAS') ?: 'key0'
   keyPassword System.getenv('RIVO_UPLOAD_KEY_PASSWORD')
   storeType 'PKCS12'
  }
 }
 buildTypes { release { signingConfig signingConfigs.rivoUpload } }
}
""")
with Path(os.environ["GITHUB_ENV"]).open('a') as f:
    f.write("RIVO_SIGNING_KEYSTORE_PATH="+str(p)+"\n")
    f.write("RIVO_UPLOAD_KEY_ALIAS="+detected_alias+"\n")
print("Private release upload key loaded safely; signing configured.")
