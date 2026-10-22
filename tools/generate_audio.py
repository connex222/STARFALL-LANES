"""Generate wholly procedural, bundled Starfall Lanes sound cues."""
from pathlib import Path
import numpy as np
from scipy import signal
from scipy.io import wavfile
import subprocess

OUT=Path(__file__).resolve().parent.parent / 'public' / 'audio'
OUT.mkdir(parents=True, exist_ok=True)
SR=24000
rng=np.random.default_rng(29017)

def lowpass(x, cutoff):
    return signal.sosfilt(signal.butter(3,cutoff,fs=SR,output='sos'),x)
def bandpass(x,lo,hi):
    return signal.sosfilt(signal.butter(2,[lo,hi],btype='bandpass',fs=SR,output='sos'),x)
def tone(n,f,kind='sin',phase=0):
    t=np.arange(n)/SR
    p=2*np.pi*(np.cumsum(f if isinstance(f,np.ndarray) else np.full(n,f))/SR)+phase
    if kind=='triangle': return (2/np.pi)*np.arcsin(np.sin(p))
    return np.sin(p)
def fade(x,attack=.01,release=.15):
    n=len(x); a=min(n,max(1,int(attack*SR))); r=min(n,max(1,int(release*SR)))
    env=np.ones(n); env[:a]=np.linspace(0,1,a)**1.35; env[-r:]=np.linspace(1,0,r)**1.5
    return x*env
def add(x,offset,y,gain=1):
    i=int(offset*SR); j=min(len(x),i+len(y));
    if i<j: x[i:j]+=y[:j-i]*gain
def output(name,mono):
    mono=np.asarray(mono,dtype=np.float64)
    peak=max(.001,np.max(abs(mono)))
    mono=mono/peak*.68
    # 2-channel spread and subtly offset ambience; no large stereo artefacts
    l=mono; r=np.roll(mono,17);r[:17]=0
    stereo=np.stack([l,r],axis=1)
    wav=OUT/(name+'.wav');mp3=OUT/(name+'.mp3')
    wavfile.write(str(wav),SR,(stereo*32767).astype(np.int16))
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libmp3lame','-b:a','96k',str(mp3)],check=True)
    wav.unlink()
    print(name,mp3.stat().st_size)

# solar storm: filtered crackles, deep pass-by, gust
n=int(2.3*SR);t=np.arange(n)/SR
x=lowpass(rng.normal(0,1,n),330)*(0.4+0.22*np.sin(t*10))
x+=bandpass(rng.normal(0,1,n),350,1500)*.35
x+=tone(n,56+45*np.sin(np.pi*t/2.3))*0.25
for when in [.22,.7,1.17,1.78]:
    c=int(when*SR); dur=int(.055*SR);x[c:c+dur]+=rng.normal(0,1,dur)*np.linspace(1,0,dur)*.75
output('solar-storm',fade(x,.14,.48))
# lane opening: warp charge and accelerating portal
n=int(1.5*SR);t=np.arange(n)/SR
f=155 + 1350*t*t
x=tone(n,f,'triangle')*.32+tone(n,2*f)*.19
x+=bandpass(rng.normal(0,1,n),400,4000)*(.14+.3*t)
x+=tone(n,90+130*t)*.25
output('hyperlane-open',fade(x,.1,.35))
# construction: sequenced welds, power up shimmer
n=int(1.85*SR);t=np.arange(n)/SR;x=tone(n,100+310*t,'triangle')*.25
for k,tm in enumerate([.18,.47,.76,1.12,1.38]):
    m=int(.17*SR);j=np.arange(m)/SR
    tap=tone(m,1000+400*np.exp(-j*12)+k*40)*np.exp(-j*19)
    add(x,tm,tap,.38)
    add(x,tm,bandpass(rng.normal(size=m),700,4000)*np.exp(-j*32),.28)
x+=tone(n,460+95*np.sin(t*4))*.09
output('spire-build',fade(x,.03,.47))
# fleet launches
n=int(.9*SR);t=np.arange(n)/SR
x=tone(n,140+930*t**1.6,'triangle')*.33+bandpass(rng.normal(size=n),500,3800)*(.17+.16*t)
output('fleet-move',fade(x,.02,.26))
# clash: 3 laser pulses, impact, gravity tail
n=int(2.1*SR);t=np.arange(n)/SR;x=np.zeros(n)
for k,when in enumerate([.08,.27,.46]):
    m=int(.22*SR);z=np.arange(m)/SR
    add(x,when,tone(m,1250-900*(z/.22),'triangle')*np.exp(-z*18),.41)
    add(x,when,bandpass(rng.normal(size=m),850,4800)*np.exp(-z*28),.2)
m=int(1.5*SR);z=np.arange(m)/SR
impact=lowpass(rng.normal(size=m),390)*np.exp(-z*3.2)+tone(m,100*np.exp(-z*1.5)+42)*np.exp(-z*2)
add(x,.54,impact,.52)
output('fleet-clash',fade(x,.004,.28))
# new era: rising 4 note cinematic chime
n=int(3*SR);t=np.arange(n)/SR;x=np.zeros(n)
for i,f in enumerate([220,330,440,659.25]):
    m=int(1.15*SR);z=np.arange(m)/SR
    env=np.exp(-z*2.4)*(1-np.exp(-z*20))
    harm=(tone(m,f)+.29*tone(m,f*2)+.09*tone(m,f*3))*env
    add(x,i*.41,harm,.36)
x+=lowpass(rng.normal(size=n),650)*.016
output('era-transition',fade(x,.03,.58))
# victory: confident fanfare chord (not loud)
n=int(3.2*SR);t=np.arange(n)/SR;x=np.zeros(n)
for i,(f,at) in enumerate([(392,0),(493.88,.19),(587.33,.37),(783.99,.72),(987.77,1.05)]):
    m=int(1.7*SR);z=np.arange(m)/SR
    p=(tone(m,f)+.25*tone(m,f*2)+.13*tone(m,f*3))*np.exp(-z*1.9)*(1-np.exp(-z*14))
    add(x,at,p,.3)
output('victory',fade(x,.03,.7))
# light credits cue
n=int(.78*SR);t=np.arange(n)/SR;x=np.zeros(n)
for i,f in enumerate([660,990,1320]):
    m=int(.31*SR);z=np.arange(m)/SR
    add(x,i*.11,tone(m,f)*np.exp(-z*9),.25)
output('credits',fade(x,.005,.22))
# gentle periodic harmonic ambience, exactly cyclic at 16 seconds; very quiet when mixed
n=16*SR;t=np.arange(n)/SR
x=np.zeros(n)
for i,f in enumerate([55,82.5,110,165]):
    # frequencies have an integer number of periods over 16s
    x+=tone(n,f,phase=i)*(.32/(i+1))
x+=tone(n,0.125)*tone(n,220)*.04
# no amplitude ramp for loop continuity at exact 16s; frequencies chosen as multiples of 1/16
output('ambient-orbit',x)
