#!/usr/bin/env python3
"""Report compressed AAB modules and largest entries, offline and read-only."""
from __future__ import annotations
import argparse
import json
import os
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile, BadZipFile

def summarize(path: Path) -> dict:
    groups = defaultdict(lambda: {'compressed':0, 'raw':0, 'count':0})
    with ZipFile(path) as z:
        entries = [f for f in z.infolist() if not f.is_dir()]
        for f in entries:
            parts = f.filename.split('/')
            group = '/'.join(parts[:2]) if len(parts)>=3 else parts[0]
            groups[group]['compressed'] += f.compress_size
            groups[group]['raw'] += f.file_size
            groups[group]['count'] += 1
    largest = sorted(entries, key=lambda f:f.compress_size, reverse=True)[:15]
    return {'bundle_bytes':path.stat().st_size,
            'total_raw_bytes':sum(f.file_size for f in entries),
            'entries':len(entries),
            'groups':dict(sorted(groups.items(),key=lambda kv:kv[1]['compressed'],reverse=True)),
            'largest':[{'file':f.filename,'compressed':f.compress_size,'raw':f.file_size} for f in largest]}

def mib(n: int) -> str:
    return f'{n / 1048576:.1f} MiB'

def markdown(data: dict) -> str:
    lines=['### RivoScan Android AAB size audit',
           '- AAB file size: **'+mib(data['bundle_bytes'])+'**',
           '- Total uncompressed size: **'+mib(data['total_raw_bytes'])+'**',
           '- Entry count: **'+str(data['entries'])+'**']
    if data['bundle_bytes']>150*1048576:
        lines.append('- Optimization recommended: bundle > 150 MiB; review oversized components before removing features.')
    lines += ['', '| Module | Compressed | Files |', '|---|---:|---:|']
    for name,g in list(data['groups'].items())[:15]:
        lines.append('| '+name.replace('|','_')+' | '+mib(g['compressed'])+' | '+str(g['count'])+' |')
    lines += ['', '| Largest bundled file | Compressed |','|---|---:|']
    for f in data['largest']:
        lines.append('| '+f['file'].replace('|','_')+' | '+mib(f['compressed'])+' |')
    lines.append('')
    return '\n'.join(lines)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('aab',type=Path)
    p.add_argument('--json-output',type=Path)
    args=p.parse_args()
    if not args.aab.is_file():
        p.error('AAB is missing')
    try:
        data=summarize(args.aab)
    except BadZipFile as e:
        p.error('Invalid AAB ZIP: '+str(e))
    print(markdown(data))
    if args.json_output:
        args.json_output.write_text(json.dumps(data,indent=2),encoding='utf-8')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf-8') as out:
            out.write(markdown(data)+'\n')
if __name__=='__main__':
    main()
