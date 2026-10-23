#!/usr/bin/env python3
"""Fetch the nine already-generated premium sound effects onto a networked development PC.

Invoke once from the project root (by 29 October 2026 UTC):
    python tools/download_mirelo_audio.py

These are signed, expiring provider links. Never run on the live game server.
The script backs up the existing local working cues in public/audio/backup-procedural/.
"""
from pathlib import Path
from urllib.request import urlopen,Request
from urllib.error import URLError,HTTPError
import shutil
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'public'/'audio';BACKUP=DIR/'backup-procedural'
URLS={
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

def is_mp3(blob):
    return len(blob)>=1000 and (blob.startswith(b'ID3') or blob[:1]==b'\xff' and blob[1]&0xe0==0xe0)

def main():
    BACKUP.mkdir(exist_ok=True)
    successes=[]; failures=[]
    for name,url in URLS.items():
        dest=DIR/(name+'.mp3')
        try:
            with urlopen(Request(url,headers={'User-Agent':'Starfall-Lanes-Asset-Installer/1.0'}),timeout=30) as r:
                data=r.read(8_000_000)
            if not is_mp3(data):raise ValueError('Downloaded content is not MP3 audio')
            if dest.exists() and not (BACKUP/dest.name).exists():shutil.copy2(dest,BACKUP/dest.name)
            tmp=dest.with_suffix('.mp3.tmp');tmp.write_bytes(data);tmp.replace(dest)
            successes.append(name)
            print(f'Installed {name} ({len(data):,} bytes)')
        except (OSError,ValueError,URLError,HTTPError) as e:
            failures.append(name)
            print(f'FAILED {name}: {e}')
    print(f'Done: {len(successes)} of {len(URLS)} premium sound effects installed. Existing cues remain for failures.')
    if failures: raise SystemExit(1)

if __name__=='__main__':main()
