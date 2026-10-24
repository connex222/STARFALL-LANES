'use strict';
/* Phase 10 static production release gate; does NOT substitute for live ws or human QA. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'), pub=path.join(root,'public');
const leader=['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble'];
const era=['frontier','expansion','ascension'], mood=['neutral','smug','furious'];
const audio=['ambient-orbit','solar-storm','hyperlane-open','spire-build','fleet-move','fleet-clash','era-transition','victory','credits','command-bridge-theme','phone-join','phone-ready','phone-trade','phone-turn','phone-storm','phone-battle','phone-victory','phone-alert'];
const compiled=['tv.html','phone.html'];
const sizeOf=p=>fs.statSync(path.join(pub,p)).size;
const report={phase:10,source:'local',checks:{},limits:{realWebSockets:'not tested by static audit',physicalDevices:'not tested',realPlayers:'not tested'}};
let portraits=0;
for(const id of leader)for(const e of era)for(const m of mood){
 const f=`art/avatars/${id}_${e}_${m}.webp`,b=fs.readFileSync(path.join(pub,f));
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
 assert.equal(b.readUInt16LE(26),256);assert.equal(b.readUInt16LE(28),256);portraits++;
}
report.checks.portraits=portraits;
for(const f of audio){
 const b=fs.readFileSync(path.join(pub,'audio',f+'.mp3'));
 assert.ok(b.length>4000,f+' too small');
 assert.ok(b.subarray(0,3).toString()==='ID3'||(b[0]===255&&(b[1]&224)===224),f+' invalid MP3');
}
report.checks.audioFiles=audio.length;
for(const f of compiled){
 const html=fs.readFileSync(path.join(pub,f),'utf8');
 assert.ok(html.includes('function Conn('),f+' shared Conn absent');
 for(const pathText of ['/how-to-play.html','/lore.html'])assert.ok(html.includes(pathText),f+' '+pathText);
 assert.ok(!/\/\*(?:CSS|QRJS|COMMONJS|CONNJS|MAPJS)\*\//.test(html),f+' contains unbuilt placeholders');
}
report.checks.controllers=compiled.length;
function total(dir){return fs.readdirSync(dir,{withFileTypes:true}).reduce((n,v)=>n+(v.isDirectory()?total(path.join(dir,v.name)):fs.statSync(path.join(dir,v.name)).size),0);}
report.checks.publicBytes=total(pub);
assert.ok(report.checks.publicBytes<15*1024*1024,'Public exceeds 15 MiB');
assert.ok(fs.existsSync(path.join(root,'lib/room-engine.js')));
assert.ok(fs.existsSync(path.join(root,'src/connection.js')));
assert.ok(fs.existsSync(path.join(root,'docs/ENGINE.md')));
report.checks.serverAuthority='game rules remain in server.js';
if(process.argv.includes('--report')){
 const out=path.join(root,'docs/release/phase10-audit.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log('Saved '+path.relative(root,out));
}
console.log(`Phase 10 release preflight: ${portraits} portraits, ${audio.length} audio clips, ${compiled.length} controllers, ${(report.checks.publicBytes/1024/1024).toFixed(2)} MiB; PASS`);
