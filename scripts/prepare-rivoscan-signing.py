#!/usr/bin/env python3
"""Load Play upload key from Actions secrets into ephemeral runner memory/storage."""
import base64, binascii, os
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
with Path(os.environ["GITHUB_ENV"]).open('a') as f:f.write("RIVO_SIGNING_KEYSTORE_PATH="+str(p)+"\n")
print("Private release upload key loaded safely; signing configured.")
