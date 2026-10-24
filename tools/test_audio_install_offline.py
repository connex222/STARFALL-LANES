from pathlib import Path
import json, tempfile, subprocess, hashlib, os, sys
from importlib.machinery import SourceFileLoader
script=Path(__file__).resolve().with_name('install_plugin_audio.py')
mod=SourceFileLoader('phase18_audio',str(script)).load_module()
with tempfile.TemporaryDirectory(prefix='phase18-installer-test-') as td:
 p=Path(td);(p/'public/audio').mkdir(parents=True);(p/'docs/audio').mkdir(parents=True)
 originals=p/'public/audio/phone-join.mp3';originals.write_bytes(b'original-audio-safe')
 manifest={'files':{}}
 for key,duration in mod.EXPECTED.items():
  url=p/(key+'.mp3')
  cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',f'sine=frequency=440:duration={duration}','-ac','1','-ar','48000','-codec:a','libmp3lame','-b:a','96k',str(url)]
  subprocess.run(cmd,check=True,timeout=30)
  manifest['files'][key]=url.as_uri()
 doc=p/'docs/audio/PHASE-17-PROVIDER-MANIFEST.json'
 invalid=dict(manifest['files']);invalid['phone-ready']=(p/'missing.mp3').as_uri()
 doc.write_text(json.dumps({'files':invalid}))
 cmd=[sys.executable,str(script),'--root',str(p),'--manifest',str(doc),'--allow-local-test']
 failed=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 assert failed.returncode!=0, 'expected missing remote download failure'
 assert originals.read_bytes()==b'original-audio-safe','Original modified on failed install'
 assert len(list((p/'public/audio').glob('*.mp3')))==1,'partial downloads copied despite failure'
 doc.write_text(json.dumps(manifest))
 success=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 assert success.returncode==0,(success.stdout,success.stderr)
 verify=subprocess.run([sys.executable,str(script),'--root',str(p),'--verify'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 assert verify.returncode==0,(verify.stdout,verify.stderr)
 assert len(list((p/'public/audio').glob('*.mp3')))==13
 receipt=json.loads((p/'docs/audio/PHASE-17-INSTALL-RECEIPT.json').read_text())
 assert len(receipt['files'])==13
 print('PHASE18 INSTALLER PASS: rejected missing audio, preserved original, installed 13 staged MP3s, verified all hashes and durations')
