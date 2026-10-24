'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const asset=id=>path.join(root,'public/audio',id+'.mp3');
const report=JSON.parse(fs.readFileSync(path.join(root,'docs/audio/mirelo-mastering-report.json'),'utf8'));
assert.equal(report.new_mirelo_generation,false,'Only previously generated assets should be claimed');
const cues=Object.keys(report.assets);
assert.equal(cues.length,9);
for(const id of cues){
  const a=report.assets[id];const b=fs.readFileSync(asset(id));
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.master_sha256,id+' checksum mismatch');
  const meta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,sample_rate,channels:format=duration','-of','json',asset(id)],{encoding:'utf8'}));
  assert.equal(meta.streams[0].codec_name,'mp3');assert.equal(+meta.streams[0].sample_rate,48000);
  assert.ok(+meta.format.duration>0.6);
  assert.ok(a.new.true_peak_dbfs < -1.0,id+' insufficient peak headroom');
  if(id!=='ambient-orbit') assert.ok(a.new.lufs>=-24&&a.new.lufs<=-16,id+' outlier loudness '+a.new.lufs);
}
for(const id of ['phone-join','phone-ready','phone-trade','phone-turn','phone-storm','phone-battle','phone-victory','phone-alert']){
  const meta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',asset(id)],{encoding:'utf8'}));
  assert.ok(+meta.format.duration<3.25 && +meta.format.duration>.3,id+' duration');
}
for(const page of ['src/tv.html','public/tv.html']){
  const s=fs.readFileSync(path.join(root,page),'utf8');
  assert.ok(s.includes('activeTotal>=5'),page+' missing polyphony limit');
  assert.ok(s.includes('duckMusic(src.buffer.duration)'),page+' missing length-aware mixing');
  assert.ok(s.includes('cueMix:'),page+' missing cue levels');
}
for(const page of ['src/phone.html','public/phone.html']){
  const s=fs.readFileSync(path.join(root,page),'utf8');
  for(const id of ['phone-join','phone-ready','phone-battle','phone-victory']) assert.ok(s.includes(id),page+' missing phone audio '+id);
}
const lab=fs.readFileSync(path.join(root,'public/sound-lab.html'),'utf8');
assert.equal((lab.match(/\['command-bridge-theme','Command Bridge Theme'/g)||[]).length,1);
for(const id of ['phone-ready','phone-victory'])assert.ok(lab.includes(id));
assert.ok(!lab.includes("id==='command-bridge-theme'||id==='command-bridge-theme'"));
console.log('Mirelo-derived mix: nine mastered sources, eight phone cuts, TV priorities and Sound Lab OK');
