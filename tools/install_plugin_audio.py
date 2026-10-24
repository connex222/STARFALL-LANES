#!/usr/bin/env python3
"""Safely install thirteen externally generated game sounds.

All downloads and audio validations finish BEFORE any deployed file changes.
No network access is needed by Starfall Lanes when playing.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

ORIGIN = Path(__file__).resolve().parents[1]
EXPECTED = {
    'phone-join': 2.544, 'phone-ready': 1.824, 'phone-trade': 2.424,
    'phone-turn': 2.232, 'phone-alert': 2.136, 'lane-toll': 2.424,
    'backup-order': 2.832, 'mission-complete': 3.744, 'order-failed': 2.136,
    'phone-battle': 3.336, 'phone-storm': 3.144, 'phone-victory': 4.032,
    'exploration-theme': 120.0,
}
ALLOWED_HOSTS = {'cdn.creativeclaw.co', 'gen.daydream.live'}
MAX_DOWNLOAD_BYTES = 24 * 1024 * 1024


def inspect(path, key):
    result = subprocess.run([
        'ffprobe', '-v', 'error', '-show_entries',
        'stream=codec_name,sample_rate,channels:format=duration', '-of', 'json', str(path)
    ], capture_output=True, text=True, timeout=25, check=True)
    meta = json.loads(result.stdout)
    stream = next((s for s in meta.get('streams', []) if s.get('codec_name') == 'mp3'), None)
    if stream is None: raise ValueError(f'{key}: no MP3 stream')
    duration = float(meta['format']['duration'])
    expected = EXPECTED[key]
    if not (expected * .75 <= duration <= expected * 1.25):
        raise ValueError(f'{key}: unexpected duration {duration:.3f}s (expected about {expected}s)')
    sample_rate = int(stream.get('sample_rate', 0))
    if sample_rate < 22050: raise ValueError(f'{key}: low sample rate {sample_rate}')
    return {'duration_seconds': round(duration, 3),
            'sample_rate': sample_rate, 'channels': int(stream.get('channels', 1)),
            'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def retrieve(url, target, allow_local=False):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme == 'file':
        if not allow_local: raise ValueError('file URLs are only allowed in offline tests')
        shutil.copyfile(urllib.request.url2pathname(parsed.path), target)
        return
    if parsed.scheme != 'https' or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError('Audio URL is not from an approved provider')
    request = urllib.request.Request(url, headers={'User-Agent': 'StarfallLanes-AudioInstaller/2.0'})
    with urllib.request.urlopen(request, timeout=45) as response, target.open('wb') as out:
        size = 0
        while True:
            data = response.read(64 * 1024)
            if not data: break
            size += len(data)
            if size > MAX_DOWNLOAD_BYTES: raise ValueError('Audio exceeded 24 MiB limit')
            out.write(data)
    if target.stat().st_size < 1500: raise ValueError('Audio unexpectedly small')


def main():
    cli = argparse.ArgumentParser(description='Install Starfall Lanes premium sound pack')
    cli.add_argument('--root', type=Path, default=ORIGIN)
    cli.add_argument('--manifest', type=Path, default=None)
    cli.add_argument('--status', action='store_true', help='Report which premium files are currently installed')
    cli.add_argument('--verify', action='store_true', help='Verify all 13 installed MP3s and hashes')
    cli.add_argument('--allow-local-test', action='store_true', help=argparse.SUPPRESS)
    args = cli.parse_args()
    root = args.root.resolve()
    manifest_path = args.manifest or root / 'docs/audio/PHASE-17-PROVIDER-MANIFEST.json'
    urls = json.loads(manifest_path.read_text(encoding='utf-8'))['files']
    if set(urls) != set(EXPECTED):
        raise ValueError(f'Manifest mismatch: expected {len(EXPECTED)} cues, got {len(urls)}')
    audio = root / 'public/audio'
    receipt_file = root / 'docs/audio/PHASE-17-INSTALL-RECEIPT.json'
    previous_receipt = json.loads(receipt_file.read_text()) if receipt_file.exists() else {}
    if args.status or args.verify:
        verified = []
        for name in EXPECTED:
            file = audio / (name + '.mp3')
            # Existing short procedural phone cues are playable, but are not premium replacements.
            if name not in previous_receipt.get('files', {}):
                print('NOT INSTALLED AS PREMIUM:', name)
                continue
            try:
                metadata = inspect(file, name)
                if metadata['sha256'] != previous_receipt['files'][name]['sha256']:
                    raise ValueError('checksum differs from installation receipt')
                print('VERIFIED:', name);verified.append(name)
            except Exception as exc:
                print('INVALID:', name, str(exc))
        print(f'Premium audio verified: {len(verified)} / {len(EXPECTED)}')
        return 1 if args.verify and len(verified) != len(EXPECTED) else 0
    if not shutil.which('ffprobe'):
        raise RuntimeError('ffprobe is required to validate downloads. Install FFmpeg and retry.')
    audio.mkdir(parents=True, exist_ok=True)
    # Transaction: stage all 13 files and validate each before overwriting one original.
    with tempfile.TemporaryDirectory(prefix='starfall-audio-') as workspace:
        staging = Path(workspace)
        measurements = {}
        for number, (name, url) in enumerate(urls.items(), 1):
            dest = staging / (name + '.mp3')
            print(f'Downloading and validating {number}/{len(urls)}: {name}', flush=True)
            retrieve(url, dest, allow_local=args.allow_local_test)
            measurements[name] = inspect(dest, name)
        saved = staging / 'previous'
        saved.mkdir()
        existed = {}
        try:
            for name in EXPECTED:
                dest = audio / (name + '.mp3')
                existed[name] = dest.exists()
                if existed[name]: shutil.copy2(dest, saved / dest.name)
                shutil.copy2(staging / dest.name, dest)
            receipt = {
                'producer': 'Mirelo SFX 2.0 via Creative Claw; Daydream music',
                'installation': 'All assets validated before replace; local playable audio',
                'files': measurements,
            }
            receipt_file.parent.mkdir(parents=True, exist_ok=True)
            receipt_tmp = staging / 'receipt.json'
            receipt_tmp.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
            shutil.copy2(receipt_tmp, receipt_file)
        except Exception:
            for name, did_exist in existed.items():
                dest = audio / (name + '.mp3')
                if did_exist and (saved / dest.name).exists(): shutil.copy2(saved / dest.name, dest)
                elif not did_exist: dest.unlink(missing_ok=True)
            raise
    print(f'Installed {len(EXPECTED)} premium files. Run with --verify for integrity check.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print('INSTALL FAILED - previously working game audio has been preserved.', str(exc), file=sys.stderr)
        sys.exit(1)
