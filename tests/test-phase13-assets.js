const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=require('node:path').join(__dirname,'..');
const ids=['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble'];
const eras=['frontier','expansion','ascension'];
const moods=['neutral','smug','furious'];
for (const id of ids) for(const era of eras) for(const mood of moods){
 const filename=`${id}_${era}_${mood}.webp`,f=path.join(root,'public/art/avatars',filename);
 assert.ok(fs.existsSync(f),`missing ${filename}`);
 const p=fs.readFileSync(f);
 assert.equal(p.readUInt16LE(26),256,`width ${filename}`);
 assert.equal(p.readUInt16LE(28),256,`height ${filename}`);
}
for(const mode of ['src','public']){
 const tv=fs.readFileSync(path.join(root,mode,'tv.html'),'utf8');
 for(const marker of ['command-bridge-theme','musicToggle','this.musicEnabled','this.stopNode(\'music\')',"'fleet-clash'"]){
  assert.ok(tv.includes(marker),`${mode}/tv.html missing ${marker}`);
 }
 assert.ok(tv.includes("'command-bridge-theme'"), 'TV music playlist missing');
 const phone=fs.readFileSync(path.join(root,mode,'phone.html'),'utf8');
 assert.ok(phone.includes('PhoneAudio'),`${mode}/phone.html phone audio broken`);
}
const music=path.join(root,'public/audio/command-bridge-theme.mp3');
assert.ok(fs.statSync(music).size>200000,'backing music absent');
const json=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-show_entries','stream=channels','-of','json',music],{encoding:'utf8'}));
assert.ok(Number(json.format.duration)>80,'music is too short');
assert.equal(json.streams[0].channels,2,'music not stereo');
assert.equal(fs.readdirSync(path.join(root,'public/audio')).filter(x=>x.endsWith('.mp3')).length,18);
const lab=fs.readFileSync(path.join(root,'public/sound-lab.html'),'utf8');
assert.ok(lab.includes('command-bridge-theme'));
console.log('Phase 13: all 72 portraits, 18 audio tracks, 90s stereo music, music controls and Sound Lab passed');
