from pathlib import Path
root=Path(__file__).resolve().parents[1]
tv=root/'src/tv.html'
s=tv.read_text()
s=s.replace('''#sound:focus-visible,#volume:focus-visible''','''#musicToggle{border:1px solid rgba(120,201,240,.46);border-radius:1rem;background:#132e4b;color:#d4f3ff;font-size:.74rem;font-weight:700;min-height:32px;cursor:pointer;padding:.25rem .6rem}
#musicToggle:focus-visible,#sound:focus-visible,#volume:focus-visible''')
s=s.replace('''<label for="volume">Volume</label><input id="volume"''','''<button id="musicToggle" type="button" aria-pressed="true" aria-label="Toggle background music">Music on</button><label for="volume">Volume</label><input id="volume"''')
s=s.replace('''ctx: null, output: null, ambience: null, on: false, buffers: {}, loading: null,''','''ctx: null, output: null, ambience: null, music: null, musicEnabled: true, on: false, buffers: {}, loading: null,''')
s=s.replace("'victory','credits'],","'victory','credits','command-bridge-theme'],")
s=s.replace('''  startAmbience() {
    if(!this.on||this.ambience||!this.buffers['ambient-orbit']||!this.ctx)return;
    const c=this.ctx,src=c.createBufferSource(),gain=c.createGain();
    src.buffer=this.buffers['ambient-orbit'];src.loop=true;
    gain.gain.value=.11;src.connect(gain).connect(this.output);src.start();
    this.ambience={src,gain};
  },
  stopAmbience() {
    if (!this.ambience) return;
    const a=this.ambience;this.ambience=null;
    try{a.src.stop();a.src.disconnect();a.gain.disconnect();}catch(_){}
  },''','''  startAmbience() {
    if(!this.on||!this.ctx)return;
    const c=this.ctx;
    if(!this.ambience&&this.buffers['ambient-orbit']){
      const src=c.createBufferSource(),gain=c.createGain();
      src.buffer=this.buffers['ambient-orbit'];src.loop=true;
      gain.gain.value=.07;src.connect(gain).connect(this.output);src.start();
      this.ambience={src,gain};
    }
    // Music is deliberately quieter than action cues, looped and TV-only.
    if(this.musicEnabled&&!this.music&&this.buffers['command-bridge-theme']){
      const src=c.createBufferSource(),gain=c.createGain();
      src.buffer=this.buffers['command-bridge-theme'];src.loop=true;
      gain.gain.value=.19;src.connect(gain).connect(this.output);src.start();
      this.music={src,gain};
    }
  },
  stopNode(k){
    if(!this[k])return;
    const a=this[k];this[k]=null;
    try{a.src.stop();a.src.disconnect();a.gain.disconnect();}catch(_){}
  },
  stopAmbience(){this.stopNode('ambience');this.stopNode('music');},
  toggleMusic(){
    this.musicEnabled=!this.musicEnabled;
    try{localStorage.setItem('sf_tv_music',String(this.musicEnabled));}catch(_){}
    if(this.musicEnabled){this.startAmbience();}else{this.stopNode('music');}
    updMusic();
  },''')
s=s.replace('''const soundBtn=document.getElementById('sound');''','''const soundBtn=document.getElementById('sound');
const musicBtn=document.getElementById('musicToggle');
try{if(localStorage.getItem('sf_tv_music')==='false')Snd.musicEnabled=false;}catch(_){}
function updMusic(){musicBtn.textContent=Snd.musicEnabled?'Music on':'Music off';musicBtn.setAttribute('aria-pressed',String(Snd.musicEnabled));}
musicBtn.onclick=()=>Snd.toggleMusic();updMusic();''')
tv.write_text(s)
lab=root/'public/sound-lab.html';s=lab.read_text()
s=s.replace('Audition the nine bundled cinematic game sounds.', 'Audition the nine bundled game effects and the new original instrumental backing music.')
s=s.replace('These are locally generated prototype cues; production licensing is self-contained.', 'The nine event cues are locally generated prototypes. The original 90-second command-bridge score is an independently synthesised instrumental. Mirelo premium replacements have been generated but are not bundled until their files can be retrieved.')
s=s.replace("['ambient-orbit','Orbital ambience'", "['command-bridge-theme','Command Bridge Theme','Original 90-second cinematic instrumental soundtrack, looping'],['ambient-orbit','Orbital ambience'")
s=s.replace("audio.loop=id==='ambient-orbit'", "audio.loop=id==='ambient-orbit'||id==='command-bridge-theme'")
lab.write_text(s)
print('Patched TV source + bundled Sound Lab')
