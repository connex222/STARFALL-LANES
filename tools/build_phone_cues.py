#!/usr/bin/env python3
"""Prepare short mobile-safe derivatives of the already-owned Mirelo effects.
No new audio is generated; originals are retained for provenance.
"""
from pathlib import Path
import json
import subprocess

root=Path(__file__).resolve().parents[1]
audio=root/'public/audio'
cues={
 'phone-join':('credits',0.00,0.78,0.09,-2.0),
 'phone-ready':('credits',0.25,0.95,0.12,-1.0),
 'phone-trade':('credits',0.03,1.22,0.14,-1.5),
 'phone-turn':('era-transition',0.25,1.65,0.20,-3.5),
 'phone-storm':('solar-storm',0.05,1.62,0.18,-4.0),
 'phone-battle':('fleet-clash',0.05,1.65,0.20,-3.5),
 'phone-victory':('victory',0.15,2.75,0.27,-2.0),
 'phone-alert':('hyperlane-open',0.22,1.10,0.15,-4.0),
}
for n,(src,start,dur,fade,db) in cues.items():
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(start),'-i',str(audio/(src+'.mp3')),
         '-t',str(dur),'-af',f'volume={db}dB,afade=t=in:st=0:d=0.012,afade=t=out:st={dur-fade:.3f}:d={fade:.3f}',
         '-ar','48000','-ac','1','-c:a','libmp3lame','-b:a','128k',str(audio/(n+'.mp3'))]
    subprocess.run(cmd,check=True)
    print(f'{n}: {dur:.2f}s from {src}')
(root/'docs/audio/phone-cue-map.json').write_text(json.dumps({n:{'source':v[0],'start_seconds':v[1],'duration_seconds':v[2]} for n,v in cues.items()},indent=2)+'\n')
