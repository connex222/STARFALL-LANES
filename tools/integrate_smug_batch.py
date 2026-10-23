#!/usr/bin/env python3
"""Import 8 approved Batch 3 Smug master images and derive correctly named era treatments.

Each leader has one independently generated Smug expression painting. Frontier and
Ascension variants are art-direction composites, NOT new facial illustrations.
Run from project root with the provided images available in /mnt/data, or set
STARFALL_SMUG_SOURCE to a folder containing the filenames below.
"""
import os
from pathlib import Path
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/art/avatars'
SOURCE = Path(os.environ.get('STARFALL_SMUG_SOURCE','/mnt/data'))
MASTERS = {
 'kaia':'commanding_starship_commander.png',
 'zibzob':'smirking_alien_engineer_in_spaceport_glow.png',
 'oolu':'coral_star_matriarch.png',
 'vex':'smirking_rogue_captain_in_orbit.png',
 'pyrrhus':'smug_flame_crowned_warlord.png',
 'nim':'confident_sci_fi_starport_portrait.png',
 'skrill':'celestial_alien_queen_portrait.png',
 'bramble':'smug_treant_prince_of_the_golden_citadel.png',
}
HOUSES = {
 'kaia':(232,73,78), 'zibzob':(123,218,90), 'oolu':(225,120,213),
 'vex':(64,213,210),'pyrrhus':(255,139,56),'nim':(164,118,246),
 'skrill':(72,178,244),'bramble':(241,210,65)
}

def portrait(id, source, era):
 im=Image.open(source).convert('RGB')
 s=min(im.size)
 x0=(im.width-s)//2;y0=(im.height-s)//2
 im=im.crop((x0,y0,x0+s,y0+s)).resize((512,512),Image.Resampling.LANCZOS)
 if era=='frontier':
  # A restrained early-colonisation appearance: less saturated orbital portrait.
  im=ImageEnhance.Color(im).enhance(.84)
  im=ImageEnhance.Contrast(im).enhance(1.04)
 elif era=='ascension':
  # High-energy late-game cinematography; no face or garment replacement.
  im=ImageEnhance.Color(im).enhance(1.13)
  im=ImageEnhance.Contrast(im).enhance(1.07)
 base=im.convert('RGBA')
 layer=Image.new('RGBA',(512,512));d=ImageDraw.Draw(layer)
 c=HOUSES[id]
 if era=='frontier':
  d.rounded_rectangle((6,6,505,505),radius=13,outline=(*c,120),width=3)
  for x in (20,492): d.line((x,420,x,480), fill=(*c,145),width=2)
 elif era=='expansion':
  d.rounded_rectangle((6,6,505,505),radius=13,outline=(*c,130),width=3)
  for y in (43,468):
   d.line((21,y,93,y),fill=(*c,170),width=3)
   d.line((419,y,491,y),fill=(*c,170),width=3)
 else:
  d.rounded_rectangle((5,5,506,506),radius=14,outline=(*c,180),width=3)
  d.rounded_rectangle((13,13,498,498),radius=11,outline=(182,220,255,95),width=2)
  d.arc((28,25,485,485),194,258,fill=(*c,155),width=2)
  d.arc((28,25,485,485),285,345,fill=(210,235,255,115),width=2)
  for x,y in ((33,33),(479,33),(33,479),(479,479)):
   d.polygon(((x,y-9),(x+6,y),(x,y+9),(x-6,y)),fill=(*c,175))
 glow=layer.filter(ImageFilter.GaussianBlur(10))
 glow.putalpha(glow.getchannel('A').point(lambda a:round(a*.45)))
 base=Image.alpha_composite(base,glow)
 base=Image.alpha_composite(base,layer)
 result=DEST/f'{id}_{era}_smug.png'
 base.convert('RGB').save(result,'PNG',optimize=True)
 return result

if __name__=='__main__':
 for id,filename in MASTERS.items():
  src=SOURCE/filename
  if not src.exists(): raise FileNotFoundError(src)
  for era in ('frontier','expansion','ascension'):
   path=portrait(id,src,era);print(path.name, path.stat().st_size)
