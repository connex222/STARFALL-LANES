#!/usr/bin/env python3
"""Repeatable, offline mastering of the existing Mirelo sound effects.

This DOES NOT generate new sounds or invoke the Mirelo service. Original user-owned
Mirelo outputs are kept in art-source/mirelo-originals. Requires FFmpeg and numpy.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public/audio'
ORIGINAL = ROOT / 'art-source/mirelo-originals'
SPECS = {
    'ambient-orbit':      dict(i=-24, tp=-3.5, lra=8, hp=35, lp=15500, fade=0),
    'credits':            dict(i=-21, tp=-2.5, lra=8, hp=80, lp=16500, fade=.060),
    'era-transition':     dict(i=-18.5, tp=-2.4, lra=12, hp=40, lp=16500, fade=.12),
    'fleet-clash':        dict(i=-18, tp=-2.4, lra=11, hp=32, lp=16500, fade=.14),
    'fleet-move':         dict(i=-19.5, tp=-2.5, lra=10, hp=48, lp=16500, fade=.10),
    'hyperlane-open':     dict(i=-19, tp=-2.4, lra=11, hp=40, lp=16500, fade=.13),
    'solar-storm':        dict(i=-18.5, tp=-2.5, lra=12, hp=30, lp=15500, fade=.15),
    'spire-build':        dict(i=-20, tp=-2.4, lra=10, hp=40, lp=16500, fade=.13),
    'victory':            dict(i=-18.0, tp=-2.4, lra=9, hp=60, lp=17000, fade=.18),
}

def run(args):
    proc=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if proc.returncode: raise RuntimeError(' '.join(args)+'\n'+proc.stderr[-1600:])
    return proc

def stats(path):
    proc=run(['ffmpeg','-hide_banner','-nostats','-i',str(path),'-af',
              'loudnorm=I=-20:TP=-2:LRA=11:print_format=json','-f','null','-'])
    m=re.search(r'\{\s*"input_i"\s*:.*?\}',proc.stderr,re.S)
    if not m: raise ValueError('Could not measure '+str(path))
    d=json.loads(m.group());return dict(lufs=float(d['input_i']),true_peak_dbfs=float(d['input_tp']),lra=float(d['input_lra']))

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def de_click_loop(src,output,tmp):
    raw=tmp/'amb.raw'
    run(['ffmpeg','-v','error','-y','-i',str(src),'-f','f32le','-acodec','pcm_f32le',
         '-ar','48000','-ac','1',str(raw)])
    x=np.fromfile(raw,dtype='<f4')
    overlap=int(1.25*48000)
    if len(x) < overlap*4: raise ValueError('Ambient track too short')
    y=np.array(x[overlap:],copy=True)
    theta=np.linspace(0,np.pi/2,overlap,dtype=np.float32)
    y[-overlap:]=x[-overlap:]*np.cos(theta)+x[:overlap]*np.sin(theta)
    # The last sample is now the same neighbourhood as the first, avoiding a hard loop seam.
    y.astype('<f4').tofile(tmp/'amb-loop.raw')
    run(['ffmpeg','-v','error','-y','-f','f32le','-ar','48000','-ac','1','-i',str(tmp/'amb-loop.raw'),str(output)])

def master(source,dest,spec,folder):
    inf=folder/'prepared.wav'
    if source.name=='ambient-orbit.mp3':
        de_click_loop(source,inf,folder)
        filt=f'highpass=f={spec["hp"]},lowpass=f={spec["lp"]}'
    else:
        info=json.loads(run(['ffprobe','-v','error','-show_format','-of','json',str(source)]).stdout)
        duration=float(info['format']['duration'])
        end=max(0.1,duration-spec['fade'])
        filt=f'highpass=f={spec["hp"]},lowpass=f={spec["lp"]},afade=t=in:st=0:d=0.014,afade=t=out:st={end:.3f}:d={spec["fade"]:.3f}'
    if not inf.exists():
        run(['ffmpeg','-v','error','-y','-i',str(source),'-ar','48000',
             '-af',filt,'-acodec','pcm_s24le',str(inf)])
    # Gentle level consistency and true-peak headroom; avoid widening mono via phase tricks.
    fn=f'loudnorm=I={spec["i"]}:TP={spec["tp"]}:LRA={spec["lra"]}:print_format=summary'
    run(['ffmpeg','-v','error','-y','-i',str(inf),'-af',fn,'-ar','48000',
         '-c:a','libmp3lame','-b:a','192k',str(dest)])


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true',help='Check existing masters only')
    opts=ap.parse_args()
    ORIGINAL.mkdir(parents=True,exist_ok=True)
    report={"producer":"Mirelo previously generated sources; offline mastering only", "new_mirelo_generation":False,"assets":{}}
    for name,spec in SPECS.items():
        p=PUBLIC/(name+'.mp3');raw=ORIGINAL/(name+'.mp3')
        if not raw.exists() and not opts.check:
            if not p.exists():raise FileNotFoundError(p)
            shutil.copy2(p,raw)
        if not raw.exists():raise FileNotFoundError(raw)
        before=stats(raw)
        if not opts.check:
            with tempfile.TemporaryDirectory(prefix='starfall-mix-') as directory:
                d=Path(directory);output=d/(name+'.mp3')
                master(raw,output,spec,d)
                shutil.copy2(output,p)
        after=stats(p)
        report['assets'][name]=dict(source_sha256=sha(raw),master_sha256=sha(p),old=before,new=after,
                                   size_bytes=p.stat().st_size,format='MP3 48 kHz mono 192 kbps')
        print(f'{name:<19} original {before["lufs"]:+.1f} LUFS / mastered {after["lufs"]:+.1f} LUFS, peak {after["true_peak_dbfs"]:+.1f} dBFS')
    (ROOT/'docs/audio/mirelo-mastering-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('All nine sourced effects audited. The original non-Mirelo backing music was not changed.')

if __name__=='__main__':main()
