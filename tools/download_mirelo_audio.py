#!/usr/bin/env python3
"""Install the nine previously generated, licensed Mirelo sound effects.

Usage (run from extracted game folder, by 29 Oct 2026):
    python tools/download_mirelo_audio.py

For audio files downloaded separately, name them <cue>.mp3 and run:
    python tools/download_mirelo_audio.py --source-dir my-downloads

Install is transaction-like: *all* nine files must validate before any replacement.
Backups live in public/audio/backup-procedural/. A JSON receipt is written after
success, with duration, bytes, SHA-256, and source metadata (no signed tokens).
An existing game remains functional if the source cannot be downloaded.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.request import urlopen, Request

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'public' / 'audio'
BACKUP = AUDIO / 'backup-procedural'
NAMES = ('ambient-orbit', 'solar-storm', 'hyperlane-open', 'spire-build',
         'fleet-move', 'fleet-clash', 'era-transition', 'victory', 'credits')
URLS = {
  'ambient-orbit': 'https://mirelo.ai/dl/qx70wtc3vq422f3xn4t8edd5dd8gs37r/0?k=-w3JPHv9yJNlpuY1',
  'solar-storm': 'https://mirelo.ai/dl/qx757ce9tprsvadkb2yvptry2n8gr95k/0?k=1JPLgV-HBzJzl-NQ',
  'hyperlane-open': 'https://mirelo.ai/dl/qx7epjdm6mpdt4y47mgxpdwbxx8grmfr/0?k=DTqPGDe55jhlJG_R',
  'spire-build': 'https://mirelo.ai/dl/qx7ev8za9e9sqqytx9s4c222j98gs517/0?k=1Aa-jRm2vEY0r0U0',
  'fleet-move': 'https://mirelo.ai/dl/qx79sgwa371rrgrvd34e718s398gss2p/0?k=g0U5zpl52FsGD1HL',
  'fleet-clash': 'https://mirelo.ai/dl/qx7cjhcfeaq8qp8g8fckx32cr18gs3ak/0?k=Ql9nggxwO0F8hcQm',
  'era-transition': 'https://mirelo.ai/dl/qx7ebperj4c3cyej2qm1pkfbah8gskpq/0?k=KQtLcob14pBTH4ma',
  'victory': 'https://mirelo.ai/dl/qx77mgnawrw08gx6s67rsfhseh8grakh/0?k=S8gNFRrzZBrCefmI',
  'credits': 'https://mirelo.ai/dl/qx7ax76mda14fvqmthg8rjvkas8grw8t/0?k=_-65kqPEnULOhief',
}


def verify_mp3(p: Path) -> dict:
    b = p.read_bytes()
    if len(b) < 3500 or len(b) > 30_000_000:
        raise ValueError(f'{p.name}: implausible MP3 file size ({len(b)} bytes)')
    if not (b.startswith(b'ID3') or (b[0] == 255 and b[1] & 224 == 224)):
        raise ValueError(f'{p.name}: invalid MP3 header')
    meta = {'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
    if shutil.which('ffprobe'):
        raw = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
                              '-of','json',str(p)], capture_output=True, text=True, timeout=12, check=True)
        duration = float(json.loads(raw.stdout)['format']['duration'])
        if not 0.5 < duration < 300: raise ValueError(f'{p.name}: invalid duration {duration}s')
        meta['duration_seconds'] = round(duration, 3)
    return meta


def main(argv=None):
    pa = argparse.ArgumentParser(description=__doc__)
    pa.add_argument('--source-dir', type=Path, help='Use already-downloaded MP3s instead of expiring links')
    pa.add_argument('--dry-run', action='store_true', help='Check source files and report results without installation')
    args = pa.parse_args(argv)
    if args.source_dir and not args.source_dir.is_dir(): pa.error('source directory does not exist')
    if not AUDIO.is_dir(): pa.error('game audio folder does not exist')
    with tempfile.TemporaryDirectory(prefix='starfall-audio-') as td:
        staging = Path(td)
        details = {}
        errors = []
        for name in NAMES:
            dest = staging / f'{name}.mp3'
            try:
                if args.source_dir:
                    shutil.copyfile(args.source_dir / dest.name, dest)
                else:
                    # HTTPS links expire 29 October 2026. Do not log signed URL tokens.
                    req = Request(URLS[name], headers={'User-Agent':'StarfallLanesAudio/2.0'})
                    with urlopen(req, timeout=25) as r:
                        with dest.open('wb') as f:
                            while True:
                                chunk = r.read(256 * 1024)
                                if not chunk: break
                                f.write(chunk)
                                if f.tell() > 30_000_000: raise ValueError('download too large')
                details[name] = verify_mp3(dest)
                print(f'Validated {name} ({details[name]["bytes"]:,} bytes)')
            except (Exception) as exc:
                errors.append(name)
                print(f'UNAVAILABLE {name}: {type(exc).__name__}: {str(exc)[:120]}', file=sys.stderr)
        if errors:
            print(f'Nothing replaced; {len(errors)} of 9 cues missing or invalid. Existing audio preserved.', file=sys.stderr)
            return 1
        if args.dry_run:
            print('Dry run: all nine MP3s valid. No game files changed.')
            return 0
        BACKUP.mkdir(exist_ok=True)
        for name in NAMES:
            old = AUDIO / f'{name}.mp3'
            backup = BACKUP / old.name
            if old.exists() and not backup.exists():
                shutil.copy2(old, backup)
        try:
            for name in NAMES:
                tmp = AUDIO / f'{name}.mp3.premium-install'
                shutil.copyfile(staging / f'{name}.mp3', tmp)
                tmp.replace(AUDIO / f'{name}.mp3')
        except Exception:
            # Restore every cue from its original backup if the install fails midway.
            for name in NAMES:
                original = BACKUP / f'{name}.mp3'
                if original.exists(): shutil.copy2(original, AUDIO / original.name)
            raise
        receipt = {'provider':'Mirelo SFX 2.0', 'tracks':details,
                   'install_count':len(details), 'from_local_files':bool(args.source_dir),
                   'note':'Generation completed Oct 2026; no external runtime audio dependency.'}
        (AUDIO/'premium-audio-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
        print('SUCCESS: 9/9 premium effects installed, backed up and verified.')
        return 0

if __name__=='__main__': raise SystemExit(main())
