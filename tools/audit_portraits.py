#!/usr/bin/env python3
"""Audit production art completeness. Does not manufacture or mislabel portraits."""
from pathlib import Path
from json import dumps
from PIL import Image
root=Path(__file__).resolve().parents[1]
folder=root/'public/art/avatars'
leaders=['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble']
eras=['frontier','expansion','ascension']
moods=['neutral','smug','furious']
missing=[];ready=[];bad=[]
for leader in leaders:
 for era in eras:
  for mood in moods:
   filename=f'{leader}_{era}_{mood}.png'
   path=folder/filename
   if not path.exists():
    missing.append(filename)
    continue
   try:
    with Image.open(path) as img:
     if img.size != (512,512) or img.mode not in ['RGB','RGBA']:
      bad.append(f'{filename}: {img.size} {img.mode}')
     else: ready.append(filename)
   except Exception as exc: bad.append(f'{filename}: cannot open ({exc})')
output={'expected':len(leaders)*len(eras)*len(moods),'ready':len(ready),'missing':len(missing),'invalid':bad,'missing_files':missing}
(root/'docs/phase9-portrait-audit.json').write_text(dumps(output,indent=2)+'\n',encoding='utf8')
print(f"Portrait audit: {output['ready']}/{output['expected']} ready; {output['missing']} missing; {len(bad)} invalid")
if bad: print('\n'.join(bad));raise SystemExit(1)
if len(ready)<len(leaders):
 print('ERROR: At least one master portrait is unavailable.');raise SystemExit(1)
