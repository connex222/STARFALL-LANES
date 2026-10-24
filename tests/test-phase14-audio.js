'use strict';
const assert=require('node:assert/strict');
const fs=require('fs');
const cp=require('child_process');
const path=require('path');
const root=require('node:path').join(__dirname,'..');
const cues=['ambient-orbit','solar-storm','hyperlane-open','spire-build','fleet-move','fleet-clash','era-transition','victory','credits','command-bridge-theme'];
const audio=path.join(root,'public/audio');
for(const n of cues){
  const file=path.join(audio,n+'.mp3');
  assert.ok(fs.existsSync(file),'Missing '+file);
  const b=fs.readFileSync(file);
  assert.ok(b.length>4000,'Broken/empty MP3 '+n);
  const v=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,sample_rate,channels:format=duration','-of','json',file],{encoding:'utf8'}));
  assert.equal(v.streams[0].codec_name,'mp3',n+' not MP3');
  assert.ok(+v.format.duration>0.5,n+' too short');
  assert.ok([1,2].includes(+v.streams[0].channels),n+' channel layout invalid');
  if(n==='command-bridge-theme'){
    assert.equal(+v.streams[0].sample_rate,48000,'Backing score must be 48 kHz');
    assert.equal(+v.streams[0].channels,2,'Backing score must be stereo');
  }
  cp.execFileSync('ffmpeg',['-v','error','-xerror','-i',file,'-f','null','-'],{stdio:'ignore'});
}
for(const name of ['src/tv.html','public/tv.html']){
  const html=fs.readFileSync(path.join(root,name),'utf8');
  for(const k of ['duckMusic(',"['solar-storm','fleet-clash','era-transition','victory','spire-build']",'command-bridge-theme','musicToggle']){
    assert.ok(html.includes(k),`${name}: missing ${k}`);
  }
}
const lab=fs.readFileSync(path.join(root,'public/sound-lab.html'),'utf8');
const count=(lab.match(/\['command-bridge-theme','Command Bridge Theme'/g)||[]).length;
assert.equal(count,1,'Music listed more than once in Sound Lab');
assert.ok(lab.includes('nine premium sound effects'),'Sound Lab description does not match bundled audio');
assert.ok(!fs.existsSync(path.join(root,'tools/download_mirelo_audio.py')),'Expired installer should be removed');
console.log('Phase 14: 10 MP3s decoded, music ducking, Sound Lab and expired-installer removal checked');
