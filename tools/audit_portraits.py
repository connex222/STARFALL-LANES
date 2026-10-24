#!/usr/bin/env python3
"""Validate exact portrait coverage, dimensions and compressed file size."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];folder=root/'public/art/avatars'
ids=['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble']
eras=['frontier','expansion','ascension'];moods=['neutral','smug','furious']
bad=[]
for id in ids:
 for era in eras:
  for mood in moods:
   p=folder/f'{id}_{era}_{mood}.webp'
   try:
    with Image.open(p) as im:
     if im.format!='WEBP' or im.size!=(256,256) or p.stat().st_size>61440:bad.append(str(p))
   except Exception:bad.append(str(p))
print(f'Portrait audit: {72-len(bad)}/72 valid 256px WebPs')
if bad:raise SystemExit('Invalid: '+', '.join(bad))
