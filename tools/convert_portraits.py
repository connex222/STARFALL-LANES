#!/usr/bin/env python3
"""Convert original 512px PNG portraits to space-saving WebP assets.
Requires Pillow: python -m pip install Pillow
Archives remain under art-source/avatars, never in the served public folder.
"""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=root/'art-source/avatars'
target=root/'public/art/avatars'
ids=['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble']
eras=['frontier','expansion','ascension'];moods=['neutral','smug','furious']
target.mkdir(parents=True,exist_ok=True)
count=0
for leader in ids:
 for era in eras:
  for mood in moods:
   name=f'{leader}_{era}_{mood}'
   p=source/(name+'.png')
   if not p.is_file():raise FileNotFoundError(p)
   with Image.open(p) as image:
    image=image.convert('RGB').resize((256,256),Image.Resampling.LANCZOS)
    dest=target/(name+'.webp')
    image.save(dest,'WEBP',quality=80,method=6)
    with Image.open(dest) as check:
     if check.size!=(256,256) or check.format!='WEBP':raise ValueError(dest)
    if dest.stat().st_size>61440:raise ValueError(f'Too large: {dest}')
   count+=1
print(f'Converted {count} WebP files, max 60 KiB each, from {source}')
