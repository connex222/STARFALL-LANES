#!/usr/bin/env python3
"""One-off migration of the review Phase 1 assets and tests. Run in repo root."""
import re, json, shutil, subprocess
from pathlib import Path
from PIL import Image
r=Path.cwd();pub=r/'public';av=pub/'art/avatars';old=pub/'avatars'
for name in [f'{x}_{e}_{m}' for x in ('kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble') for e in ('frontier','expansion','ascension') for m in ('neutral','smug','furious')]:
 src=av/(name+'.png') if (av/(name+'.png')).exists() else old/(name+'.png')
 if not src.exists():raise FileNotFoundError(src)
 with Image.open(src) as im: im.convert('RGB').resize((256,256),Image.Resampling.LANCZOS).save(av/(name+'.webp'),'WEBP',quality=80,method=6)
 assert (av/(name+'.webp')).stat().st_size<61440,name
for x in av.glob('*.png'):x.unlink()
shutil.rmtree(old)
(av/'README.txt').write_text('72 optimised WebP portraits. Original PNGs remain in Git history.\n')
def patch(p,fn):
 p=r/p;s=p.read_text();p.write_text(fn(s))
D='$';em=D+'{era}';mo=D+'{mood}'
patch('src/common.js',lambda s:s.replace('_frontier_neutral.png','_frontier_neutral.webp').replace('_'+em+'_neutral.png','_'+em+'_neutral.webp').replace('_'+em+'_'+mo+'.png','_'+em+'_'+mo+'.webp'))
patch('server.js',lambda s:s.replace("'.png': 'image/png'","'.png': 'image/png', '.webp': 'image/webp'"))
patch('tools/compose_starfall_music.py',lambda s:re.sub(r'(?m)^SR\s*=\s*\d+','SR=48000',s))
subprocess.run(['python3','tools/compose_starfall_music.py'],check=True)
lab=pub/'sound-lab.html';t=lab.read_text();t=re.sub(r"(\['command-bridge-theme','Command Bridge Theme',[^\]]+\],)\1",r'\1',t);lab.write_text(t)
tgt=r/'tests';tgt.mkdir(exist_ok=True)
for f in r.glob('test-*.js'):
 if (tgt/f.name).exists():raise RuntimeError('Test already exists: '+f.name)
 f.rename(tgt/f.name)
for f in tgt.glob('test-*.js'):
 t=f.read_text()
 t=t.replace('root = __dirname;',"root = require('node:path').join(__dirname,'..');").replace('root=__dirname;',"root=require('node:path').join(__dirname,'..');")
 t=t.replace("require('./tests/load-server')","require('./load-server')").replace("require('./server.js')","require('../server.js')")
 if f.name in ('test-era-portraits.js','test-phase13-assets.js','test-phase15-release.js'):
  t=t.replace('_'+mo+'.png','_'+mo+'.webp')
  t=t.replace('}_neutral.png','}_neutral.webp').replace('}_smug.png','}_smug.webp').replace('}_furious.png','}_furious.webp')
  t=re.sub(r'((?:kaia|zibzob|oolu|vex|pyrrhus|nim|skrill|bramble)_(?:frontier|expansion|ascension)_(?:neutral|smug|furious))\.png',r'\1.webp',t)
  t=t.replace("p.subarray(0,8).toString('hex'),'89504e470d0a1a0a'","p.toString('ascii',0,4),'RIFF'")
  t=t.replace('p.readUInt32BE(16),512','p.readUInt16LE(26),256').replace('p.readUInt32BE(20),512','p.readUInt16LE(28),256')
  t=t.replace("b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))","b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP'")
  t=t.replace('b.readUInt32BE(16), 512','b.readUInt16LE(26), 256').replace('b.readUInt32BE(20), 512','b.readUInt16LE(28), 256')
 if f.name=='test-ui-static.js':
  t=t.replace('_frontier_neutral.png','_frontier_neutral.webp').replace("image.toString('hex',0,8),'89504e470d0a1a0a'","image.toString('hex',0,4),'52494646'")
 if f.name in ('test-phase8-accessibility.js','test-phase9-quality.js'):
  t=t.replace('frontier_neutral.png','frontier_neutral.webp').replace('.size>15000','.size>5000').replace('.size>30000','.size>5000')
 if f.name=='test-phase14-audio.js':
  t=t.replace("lab.includes('premium-audio-receipt.json')","lab.includes('solar-storm')")
  t=re.sub(r"const installer=fs\.readFileSync\(path\.join\(root,'tools/download_mirelo_audio\.py'\),'utf8'\);\s*assert\.ok\(installer\.includes\('premium-audio-receipt\.json'\)\);","assert.ok(!fs.existsSync(path.join(root,'tools/download_mirelo_audio.py')));",t)
 f.write_text(t)
archive=r/'docs/changelog';archive.mkdir(exist_ok=True,parents=True)
for pat in ('PHASE-*.md','BATCH-*.md'):
 for f in r.glob(pat):
  if not (archive/f.name).exists():f.rename(archive/f.name)
for d in ('public/brand','public/audio/backup-procedural'):
 if (r/d).is_dir():shutil.rmtree(r/d)
for f in ('Install-Premium-Audio.ps1','Run-Premium-Audio-Install.cmd','START-HERE-AUDIO.txt','tools/download_mirelo_audio.py'):
 if (r/f).exists():(r/f).unlink()
pkgfile=r/'package.json';p=json.loads(pkgfile.read_text())
p['scripts']={'start':'node server.js','build':'python3 build.py','test':'npm run build && npm run test:offline',
'test:offline':'node tests/test-ui-static.js && node tests/test-phase4-ui.js && node tests/test-phase5-cinematic.js && node --test tests/test-phase6-rules.js tests/test-phase6-simulation.js && node tests/test-phase7-onboarding.js && node tests/test-phase8-accessibility.js && node tests/test-phase9-quality.js && node --test tests/test-phase10-quality.js && node tests/test-era-portraits.js && node tests/test-phase13-assets.js && node tests/test-phase14-audio.js && node tests/test-phase15-release.js --require-premium',
'test:sim':'node --test tests/test-phase6-simulation.js','test:live':'node tests/live-game.js','audit:avatars':'python3 tools/audit_portraits.py','test:balance':'node --test tests/test-phase9-balance.js','test:legacy-sim':'node tests/test-sim.js'}
pkgfile.write_text(json.dumps(p,indent=2)+'\n')
(tgt/'live-game.js').write_text("console.error('Live WebSocket harness not yet implemented');process.exit(2);\n")
(r/'.gitignore').write_text('node_modules/\nart-source/\n*.pyc\n__pycache__/\n')
(r/'README.md').write_text('# STARFALL LANES\n\nA TV/phone strategy game for 2-8 players. Install Node.js 18+, run npm install, npm start, then open the local URL on TV and join by phone. Render deploy: build npm install --omit=dev, start npm start. For changes edit src/, run npm run build; validate with npm test. Full human multiplayer testing remains outstanding. The 72 portraits are at public/art/avatars/. Original PNGs remain in Git history; phase history is at docs/changelog/.\n')
(r/'docs/PHASE-1-REPAIR.md').write_text('# Review Phase 1\n\n72 portraits repaired and converted to WebP; soundtrack recomposed at 48 kHz; tests and release notes reorganised; expired installers removed. No gameplay mechanics changed. Run npm test to validate.\n')
print('Migration completed')
