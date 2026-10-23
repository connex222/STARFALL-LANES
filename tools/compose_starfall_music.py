#!/usr/bin/env python3
"""Create original instrument-free-sample synth music for Starfall Lanes.
All waveforms and notes are synthesized here (no externally licensed soundfont).
"""
from pathlib import Path
import math, subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter,sosfilt
SR=24000
BEAT=60/88
BARS=32
SECONDS=BARS*4*BEAT+3
N=int(SECONDS*SR)
L=np.zeros(N,np.float32);R=np.zeros(N,np.float32)
rs=np.random.default_rng(80524)

def add(x,at,pan=0):
    i=int(at*SR)
    if i>=N:return
    x=x[:min(len(x),N-i)].astype(np.float32)
    # Constant-power stereo with gentle reverberant diffusion
    a=(1-pan)*.5;b=(1+pan)*.5
    L[i:i+len(x)]+=x*math.sqrt(a)
    R[i:i+len(x)]+=x*math.sqrt(b)

def env_smooth(t,dur,attack=.15,release=.3):
    return np.clip(t/max(attack,.001),0,1)**1.2 * np.clip((dur-t)/max(release,.001),0,1)**1.35

def pad(note,start,dur,vol=.16,pan=0):
    n=int(dur*SR);t=np.arange(n)/SR;f=440*2**((note-69)/12)
    # several lightly detuned harmonic components; no stock samples
    s=(np.sin(2*np.pi*f*.996*t)+np.sin(2*np.pi*f*1.004*t+.7))*.33
    s+=.19*np.sin(2*np.pi*f*2*t+.18)+.06*np.sin(2*np.pi*f*3*t)
    s*=env_smooth(t,dur,.9,.9)*vol
    add(s,start,pan)

def pluck(note,start,dur=.6,vol=.06,pan=.3):
    n=int(dur*SR);t=np.arange(n)/SR;f=440*2**((note-69)/12)
    s=(np.sin(2*np.pi*f*t)+.28*np.sin(2*np.pi*f*2*t)+.12*np.sin(2*np.pi*f*3*t))*np.exp(-t*5.6)
    s*=np.minimum(1,t/.016)*vol
    add(s,start,pan)

def bass(note,start,dur=1.4,vol=.11):
    n=int(dur*SR);t=np.arange(n)/SR;f=440*2**((note-69)/12)
    v=(np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*2*t))*env_smooth(t,dur,.04,.25)*vol
    add(v,start,-.08)

chords=[(38,[50,53,57,64]),(34,[46,50,53,57]),(41,[53,57,60,67]),(36,[48,53,55,60])]
for bar in range(BARS):
    root,notes=chords[(bar//2)%4];s=bar*4*BEAT
    for j,p in enumerate(notes):pad(p,s,4.4*BEAT, .12 if j==0 else .10,(-.33 if j%2 else .35))
    for p in (notes[1]+12,notes[2]+12):pad(p,s+.3*BEAT,3.6*BEAT,.038,.2)
    bass(root,s,2.3*BEAT,.10);bass(root+12,s+2.5*BEAT,1.15*BEAT,.045)
    arp=[notes[1]+12,notes[3]+12,notes[2]+12,notes[1]+24]
    for j in range(8):pluck(arp[(j+bar//2)%4],s+j*.5*BEAT,.69*BEAT,.03 if j%2 else .046,(-.28 if j%2 else .33))
    if bar%8==7:
        for j,p in enumerate([notes[2]+24,notes[3]+24,notes[2]+24]):pluck(p,s+(j+.4)*BEAT,1.55*BEAT,.070,-.2)
# Airy wide bed – entirely generated noise and smooth low-frequency harmonic waves
rng=rs.normal(0,1,N).astype(np.float32)
sos=butter(2,260,fs=SR,output='sos')
air=sosfilt(sos,rng).astype(np.float32)
air/=max(np.max(np.abs(air)),1e-5)
t=np.arange(N,dtype=np.float32)/SR
movement=(.45+.15*np.sin(2*np.pi*t/26.18))
L+=air*.025*movement;R+=np.roll(air,643)*.019*movement
# gentle tempo-aligned short reverb; not drowning out UI effects
preL=L.copy();preR=R.copy()
for delay,gain in [(0.17,.11),(0.33,.074),(0.51,.047)]:
    n=int(delay*SR)
    L[n:]+=preR[:-n]*gain;R[n:]+=preL[:-n]*gain
fade=int(3*SR)
env=np.ones(N,np.float32);env[:fade]=np.linspace(0,1,fade);env[-fade:]=np.linspace(1,0,fade)
L*=env;R*=env
peak=max(float(np.max(np.abs(L))),float(np.max(np.abs(R))))
L*=.76/max(peak,1e-6);R*=.76/max(peak,1e-6)
OUT=Path(__file__).resolve().parent.parent/'public'/'audio'
OUT.mkdir(parents=True,exist_ok=True)
wav=OUT/'command-bridge-theme.wav';mp3=OUT/'command-bridge-theme.mp3'
wavfile.write(str(wav),SR,np.stack([L,R],axis=1))
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-qscale:a','3',str(mp3)],check=True)
wav.unlink()
print(f'Produced original instrumental backing track: {SECONDS:.1f}s, {mp3.stat().st_size:,} bytes; sample-free composition')
