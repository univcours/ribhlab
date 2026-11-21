#!/usr/bin/env python3
"""Publish the verified RivoScan AAB to the existing Google Play production track.

Only one Android release track is changed. Store screenshots, descriptions,
Feature Graphic, icons, and the GitHub signing assets are never edited.
No action is committed if authentication, policy, or track checks fail.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import sys

PACKAGE = 'com.ribhlab.rivoscan'
VERSION_CODE = 153
VERSION_NAME = '0.45.49'
EXPECTED_TRACK = 'production'


def service_account():
    value = os.environ.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', '').strip()
    if not value:
        raise RuntimeError(
            'Missing GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in GitHub Actions Secrets. '
            'No Google Play release was uploaded or changed.'
        )
    if value.startswith('{'):
        data = json.loads(value)
    elif Path(value).is_file():
        data = json.loads(Path(value).read_text())
    else:
        data = json.loads(base64.b64decode(value).decode('utf-8'))
    if (data.get('type') != 'service_account'
            or not data.get('private_key') or not data.get('client_email')):
        raise RuntimeError('Invalid Google Play service-account JSON. No release modified.')
    return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--aab', required=True, type=Path)
    parser.add_argument('--package', default=PACKAGE)
    parser.add_argument('--track', default=EXPECTED_TRACK)
    parser.add_argument('--version-code', type=int, default=VERSION_CODE)
    args = parser.parse_args()
    if (args.package != PACKAGE or args.track != EXPECTED_TRACK
            or args.version_code != VERSION_CODE):
        raise RuntimeError('Refusing to alter unexpected Google Play package, track or version')
    if not args.aab.is_file() or args.aab.stat().st_size < 10_000_000:
        raise RuntimeError('Verified RivoScan 0.45.49 AAB missing or suspiciously small')
    digest = hashlib.sha256(args.aab.read_bytes()).hexdigest()
    print('AAB SHA256: ' + digest, flush=True)
    credential = service_account()

    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    auth = Credentials.from_service_account_info(
        credential, scopes=['https://www.googleapis.com/auth/androidpublisher'])
    api = build('androidpublisher', 'v3', credentials=auth, cache_discovery=False)
    eid = None
    committed = False
    try:
        edit = api.edits().insert(packageName=PACKAGE, body={}).execute()
        eid = edit['id']
        params = {'packageName': PACKAGE, 'editId': eid}
        tracks = api.edits().tracks().list(**params).execute().get('tracks', [])
        all_versions = [
            int(code)
            for track in tracks for release in track.get('releases', [])
            for code in release.get('versionCodes', [])
        ]
        if all_versions and max(all_versions) > VERSION_CODE:
            raise RuntimeError(
                f'Newer Play release versionCode {max(all_versions)} exists: refusing downgrade')
        target = next((track for track in tracks if track.get('track') == EXPECTED_TRACK), {})
        current = target.get('releases', [])
        if any(r.get('status') in ('inProgress', 'halted') for r in current):
            raise RuntimeError('Production has a staged or halted release. Refusing to replace it.')
        already = any(
            r.get('status') == 'completed'
            and VERSION_CODE in [int(x) for x in r.get('versionCodes', [])]
            for r in current
        )
        if already:
            print(json.dumps({
                'success': True, 'alreadyOnProduction': True,
                'package': PACKAGE, 'track': EXPECTED_TRACK, 'versionCode': VERSION_CODE,
                'featureGraphic': 'unchanged', 'screenshots': 'unchanged'
            }), flush=True)
            return
        bundles = api.edits().bundles().list(**params).execute().get('bundles', [])
        previous = next((b for b in bundles if int(b.get('versionCode', 0)) == VERSION_CODE), None)
        if previous:
            prior_digest = previous.get('sha256', '').lower()
            if prior_digest and prior_digest != digest:
                raise RuntimeError('Existing versionCode 153 has a different bundle hash')
            print('Existing identical Play bundle versionCode 153; reusing it.', flush=True)
        else:
            print('Uploading signed AAB to Google Play...', flush=True)
            media = MediaFileUpload(
                str(args.aab), mimetype='application/octet-stream', resumable=True)
            uploaded = api.edits().bundles().upload(
                **params, media_body=media).execute(num_retries=3)
            if int(uploaded.get('versionCode', 0)) != VERSION_CODE:
                raise RuntimeError(
                    'Google Play returned unexpected versionCode ' +
                    str(uploaded.get('versionCode')))
        body = {
            'track': EXPECTED_TRACK,
            'releases': [{
                'name': f'RivoScan {VERSION_NAME}',
                'versionCodes': [str(VERSION_CODE)],
                'status': 'completed',
                'releaseNotes': [{
                    'language': 'en-US',
                    'text': 'Plate Scanner supports seven app languages with improved camera OCR; PDF compression preserves text; updates are optional and available only online.'
                }]
            }]
        }
        api.edits().tracks().update(
            **params, track=EXPECTED_TRACK, body=body).execute()
        api.edits().validate(**params).execute()
        response = api.edits().commit(**params).execute()
        committed = True
        print(json.dumps({
            'success': True,
            'package': PACKAGE,
            'track': EXPECTED_TRACK,
            'versionCode': VERSION_CODE,
            'versionName': VERSION_NAME,
            'editId': response.get('id', eid),
            'releaseStatus': 'completed-submitted-to-google-play',
            'storeReviewMayBeRequired': True,
            'featureGraphic': 'unchanged',
            'screenshots': 'unchanged',
            'appIcon': 'unchanged'
        }), flush=True)
    except Exception as error:
        print('NOT PUBLISHED to Google Play: ' + str(error), file=sys.stderr, flush=True)
        raise
    finally:
        if eid and not committed:
            try:
                api.edits().delete(packageName=PACKAGE, editId=eid).execute()
            except Exception:
                pass


if __name__ == '__main__':
    main()
