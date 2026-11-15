#!/usr/bin/env python3
"""Publish only actual RivoScan 0.45.36 screenshots to Google Play.
Only phoneScreenshots, sevenInchScreenshots and tenInchScreenshots are touched.
Never update Feature Graphic, icons, store text, or release tracks.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import sys

TYPES = (
    ('phoneScreenshots', 'phone', (1080, 1920)),
    ('sevenInchScreenshots', '7-inch', (1080, 1920)),
    ('tenInchScreenshots', '10-inch', (1536, 2560)),
)
NAMES = ('01_Home.png','02_Documents.png','03_Tools.png','04_Book_Scan.png',
         '05_Formula_OCR.png','06_Photo_Translation.png','07_ID_Photo.png','08_Settings.png')

def screenshot_files(base, section):
    source = {'phone': base / 'phone' / 'rivoscan-phone-publishing' / 'phone',
              '7-inch': base / 'tablet' / 'rivoscan-tablet-publishing' / '7-inch',
              '10-inch': base / 'tablet' / 'rivoscan-tablet-publishing' / '10-inch'}[section]
    return [source / name for name in NAMES]

def check_png(filename, expected):
    from PIL import Image
    if not filename.is_file():
        raise RuntimeError(f'Missing screenshot: {filename}')
    if filename.stat().st_size > 8 * 1024 * 1024:
        raise RuntimeError(f'Screenshot exceeds 8 MiB: {filename}')
    with Image.open(filename) as image:
        if image.format != 'PNG' or image.size != expected:
            raise RuntimeError(f'Unexpected image format/size {filename}: {image.format} {image.size}, expected {expected}')

def load_credential():
    secret = os.environ.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', '').strip()
    if not secret:
        raise RuntimeError('Missing Google Play service account credential. Add repository secret GOOGLE_PLAY_SERVICE_ACCOUNT_JSON with Store presence permission. No screenshots were modified.')
    if secret.startswith('{'):
        data = json.loads(secret)
    else:
        candidate = Path(secret)
        if candidate.is_file():
            data = json.loads(candidate.read_text())
        else:
            data = json.loads(base64.b64decode(secret).decode())
    if data.get('type') != 'service_account' or 'private_key' not in data or 'client_email' not in data:
        raise RuntimeError('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not a valid service-account JSON; nothing published.')
    return data

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--package', default='com.ribhlab.rivoscan')
    p.add_argument('--locale', default='en-US')
    p.add_argument('--asset-dir', required=True)
    args = p.parse_args()
    base = Path(args.asset_dir)
    if args.package != 'com.ribhlab.rivoscan':
        raise RuntimeError('Refusing to modify an unexpected package')
    groups = []
    for typ, section, expected in TYPES:
        files = screenshot_files(base, section)
        for path in files:
            check_png(path, expected)
        groups.append((typ, files))
    print('Validated 24 unchanged, real RivoScan 0.45.36 WebView screenshots (8 phone, 8 seven-inch and 8 ten-inch).', flush=True)

    credential_json = load_credential()
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    credentials = Credentials.from_service_account_info(credential_json, scopes=['https://www.googleapis.com/auth/androidpublisher'])
    service = build('androidpublisher','v3',credentials=credentials,cache_discovery=False)
    package = args.package
    edit_id = None
    try:
        edit = service.edits().insert(packageName=package, body={}).execute()
        edit_id = edit['id']
        listings = service.edits().listings().list(packageName=package,editId=edit_id).execute().get('listings',[])
        locales = {l.get('language') for l in listings}
        if args.locale not in locales:
            raise RuntimeError(f'Configured locale {args.locale} does not exist. Available listing locales: {sorted(locales)}. No screenshots were modified.')
        for typ, files in groups:
            # Replacements are staged inside a Play edit: failure means no live change.
            print(f'Replacing {typ} for {args.locale}: {len(files)} images',flush=True)
            service.edits().images().deleteall(packageName=package, editId=edit_id,
                                             language=args.locale, imageType=typ).execute()
            for image in files:
                media = MediaFileUpload(str(image),mimetype='image/png',resumable=False)
                result = service.edits().images().upload(packageName=package,
                    editId=edit_id,language=args.locale,imageType=typ,media_body=media).execute()
                if not result.get('image',{}).get('id'):
                    raise RuntimeError(f'Google Play did not confirm upload for {image}')
                print('Uploaded '+typ+'/'+image.name,flush=True)
        # Feature Graphic and all non-screenshot assets are untouched.
        committed = service.edits().commit(packageName=package, editId=edit_id).execute()
        print(json.dumps({'success':True,'package':package,'locale':args.locale,
            'editId':committed.get('id',edit_id),'screenshots':24,
            'featureGraphic':'unchanged','releaseTracks':'unchanged'},ensure_ascii=False),flush=True)
    except Exception as error:
        print('NOT PUBLISHED: '+str(error),file=sys.stderr,flush=True)
        if edit_id:
            try:
                service.edits().delete(packageName=package, editId=edit_id).execute()
            except Exception:
                pass
        raise

if __name__ == '__main__':
    main()
