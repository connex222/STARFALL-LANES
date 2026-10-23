#!/usr/bin/env python3
"""Integrate Batch 4 Furious paintings into Starfall Lanes.

Eight standalone generated portraits are used, one per canonical house leader.
The 24 output images are three cinematic treatments of these eight paintings,
not 24 independently illustrated faces. Original artwork stays outside the
shipped game; public/art/avatars contains runtime-optimised 512px images.
"""
import os
from pathlib import Path
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public'/'art'/'avatars'
SOURCE=Path(os.environ.get('STARFALL_FURIOUS_SOURCE','/mnt/data'))
IMAGES={
    'kaia':'furious_commander_in_battle_worn_armour.png',
    'zibzob':'enraged_alien_engineer_with_wrench.png',
    'oolu':'wrathful_coral_queen_in_cosmic_regalia.png',
    'vex':'fury_in_the_orbital_shadows.png',
    'pyrrhus':'blazing_molten_warlord_portrait.png',
    'nim':'dr_nim_okafor_cosmic_command.png',
    'skrill':'furious_galactic_alien_queen_portrait.png',
    'bramble':'roaring_captain_bramble_in_bloom.png',
}
HOUSES={
    'kaia':(232,73,78), 'zibzob':(123,218,90), 'oolu':(225,120,213),
    'vex':(64,213,210),'pyrrhus':(255,139,56),'nim':(164,118,246),
    'skrill':(72,178,244),'bramble':(241,210,65)
}

def make_variant(house, source, era):
    src=Image.open(source).convert('RGB')
    s=min(src.size)
    src=src.crop(((src.width-s)//2,(src.height-s)//2,(src.width+s)//2,(src.height+s)//2))
    im=src.resize((512,512),Image.Resampling.LANCZOS)
    if era=='frontier':
        im=ImageEnhance.Color(im).enhance(.86)
        im=ImageEnhance.Contrast(im).enhance(1.04)
    elif era=='ascension':
        im=ImageEnhance.Color(im).enhance(1.13)
        im=ImageEnhance.Contrast(im).enhance(1.08)
    base=im.convert('RGBA')
    color=HOUSES[house]
    hud=Image.new('RGBA',(512,512),(0,0,0,0));d=ImageDraw.Draw(hud)
    if era=='frontier':
        d.rounded_rectangle((6,6,505,505),radius=13,outline=(*color,145),width=3)
        for x in (20,492): d.line((x,417,x,479),fill=(*color,155),width=2)
    elif era=='expansion':
        d.rounded_rectangle((6,6,505,505),radius=13,outline=(*color,165),width=3)
        for y in (43,468):
            d.line((21,y,93,y),fill=(*color,183),width=3)
            d.line((419,y,491,y),fill=(*color,183),width=3)
    else:
        d.rounded_rectangle((5,5,506,506),radius=14,outline=(*color,200),width=3)
        d.rounded_rectangle((13,13,498,498),radius=11,outline=(207,227,255,112),width=2)
        d.arc((28,25,485,485),194,258,fill=(*color,170),width=2)
        d.arc((28,25,485,485),285,345,fill=(210,235,255,140),width=2)
        for x,y in ((33,33),(479,33),(33,479),(479,479)):
            d.polygon(((x,y-9),(x+6,y),(x,y+9),(x-6,y)),fill=(*color,182))
    glow=hud.filter(ImageFilter.GaussianBlur(9))
    glow.putalpha(glow.getchannel('A').point(lambda a:round(a*.3)))
    out=Image.alpha_composite(Image.alpha_composite(base,glow),hud)
    path=DEST/f'{house}_{era}_furious.png'
    out.convert('RGB').save(path,'PNG',optimize=True)
    return path

if __name__=='__main__':
    if not DEST.is_dir(): raise RuntimeError(f'Missing game asset directory: {DEST}')
    for house,filename in IMAGES.items():
        source=SOURCE/filename
        if not source.is_file(): raise FileNotFoundError(source)
        for era in ('frontier','expansion','ascension'):
            out=make_variant(house,source,era)
            print(f'{out.name}: {out.stat().st_size:,} bytes')
