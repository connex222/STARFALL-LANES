#!/usr/bin/env python3
"""Produce individually identifiable Ascension portrait composites from the Expansion masters.
These are era treatments, not separately painted costumes or AI-generated facial variants.
Preserves facial identity, no generated labels embedded in avatar art.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math

root=Path(__file__).resolve().parents[1]
folder=root/'public/art/avatars'
palette={
'kaia':((248,93,100),(254,215,132),'admiral'),
'zibzob':((92,237,144),(255,217,112),'engineer'),
'oolu':((253,134,222),(181,252,250),'coral'),
'vex':((71,240,237),(249,185,107),'smuggler'),
'pyrrhus':((255,136,52),(255,228,124),'plasma'),
'nim':((176,124,255),(118,234,255),'science'),
'skrill':((73,169,254),(147,246,243),'jewelled'),
'bramble':((246,211,81),(131,246,132),'botanical'),
}
W=512

def rgba(t,a): return (*t,a)
def polyline(d,coords,fill,width=2): d.line(coords,fill=fill,width=width,joint='curve')

def make(name):
    main,gold,kind=palette[name]
    src=folder/f'{name}_expansion_neutral.png'
    base=Image.open(src).convert('RGB')
    base=ImageEnhance.Contrast(base).enhance(1.07)
    base=ImageEnhance.Color(base).enhance(1.11)
    # Atmospheric gradation: bright upper arcs, vignette around corners.
    grad=Image.new('RGBA',(W,W)); px=grad.load()
    for y in range(W):
      for x in range(W):
        r=((x-256)**2+(y-230)**2)**0.5
        edge=max(0,min(1,(r-170)/240))
        px[x,y]=(9,13,34,int(edge*112))
    base=Image.alpha_composite(base.convert('RGBA'),grad)
    # Soft, carefully placed energy reflections at the outer sides.
    light=Image.new('RGBA',(W,W)); ld=ImageDraw.Draw(light)
    for cx,cy,col in [(40,130,main),(480,105,gold),(490,390,main)]:
        ld.ellipse((cx-45,cy-45,cx+45,cy+45),fill=rgba(col,85))
    light=light.filter(ImageFilter.GaussianBlur(64))
    base=Image.alpha_composite(base,light)
    # Celestial rings around head (draw partial arcs in the upper corners).
    fx=Image.new('RGBA',(W,W)); d=ImageDraw.Draw(fx)
    rings=[(13,15,499,508,rgba(main,65),2),(33,30,479,487,rgba(gold,120),2),(50,54,462,476,rgba(main,125),2)]
    for idx,(a,b,c,e,color,width) in enumerate(rings):
        d.arc((a,b,c,e),190,270,fill=color,width=width)
        d.arc((a,b,c,e),282,342,fill=color,width=width)
        d.arc((a,b,c,e),12,68,fill=color,width=width)
        d.arc((a,b,c,e),96,165,fill=color,width=width)
    # Geometric ornaments occupy outside edges, never cover the face.
    for xx,direction in ((22,1),(490,-1)):
        polyline(d,[(xx,100),(xx,55),(xx+22*direction,34),(xx+65*direction,34)],rgba(main,190),3)
        polyline(d,[(xx,404),(xx,454),(xx+22*direction,479),(xx+69*direction,479)],rgba(gold,190),3)
        for yy in (142,176,210,244,278,312):
            rr=2 if yy%4 else 3
            d.ellipse((xx-rr,yy-rr,xx+rr,yy+rr),fill=rgba(main,115))
    # Unique Ascension accents, visually linked to each lore-defined era transformation.
    def dot(x,y,r,c): d.ellipse((x-r,y-r,x+r,y+r),fill=c)
    def star(x,y,r,col):
        pts=[(x,y-r),(x+4,y-4),(x+r,y),(x+4,y+4),(x,y+r),(x-4,y+4),(x-r,y),(x-4,y-4)]
        d.polygon(pts,fill=col)
    # Crownlike radial marks along the perimeter; not on the forehead.
    if kind=='admiral':
        for x,y in [(90,82),(130,45),(379,45),(418,82)]: star(x,y,10,rgba(gold,205))
        polyline(d,[(22,400),(56,372),(93,388),(113,425)],rgba(gold,150),3)
    elif kind=='engineer':
        for x,y in [(99,82),(412,70),(445,360)]:
            d.ellipse((x-13,y-13,x+13,y+13),outline=rgba(gold,210),width=3)
            for j in range(8):
                t=j*math.pi/4;dot(x+19*math.cos(t),y+19*math.sin(t),3,rgba(main,200))
    elif kind=='coral':
        for x,y in [(95,70),(145,35),(375,40),(427,80)]:
            for a in (30,90,150):
                polyline(d,[(x,y),(x+15*math.cos(math.radians(a)),y-17)],rgba(gold,195),2)
            dot(x,y,4,rgba(gold,215))
    elif kind=='smuggler':
        for x,y in [(100,75),(420,75),(441,351)]:
            d.arc((x-21,y-11,x+21,y+11),230,560,fill=rgba(main,190),width=3)
            dot(x+20,y,4,rgba(gold,210))
    elif kind=='plasma':
        for x,y in [(86,83),(419,70),(448,310)]:
            polyline(d,[(x+2,y+24),(x-7,y+7),(x,y-24),(x+12,y+1),(x+5,y+9)],rgba(main,235),4)
            dot(x+1,y+7,5,rgba(gold,175))
    elif kind=='science':
        for x,y in [(95,73),(421,77),(447,369)]:
            pts=[(x+17*math.cos(j*math.pi/3),y+17*math.sin(j*math.pi/3)) for j in range(6)]
            d.polygon(pts,outline=rgba(main,190),width=2)
            dot(x,y,5,rgba(gold,220))
    elif kind=='jewelled':
        for x,y in [(91,80),(416,72),(454,347)]:
            d.polygon([(x,y-16),(x+11,y),(x,y+16),(x-11,y)],fill=rgba(main,160),outline=rgba(gold,210),width=2)
            star(x,y,5,rgba(gold,225))
    elif kind=='botanical':
        for x,y in [(95,78),(418,79),(445,347)]:
            for a in range(0,360,60):
                xx=x+10*math.cos(math.radians(a));yy=y+10*math.sin(math.radians(a))
                d.ellipse((xx-6,yy-4,xx+6,yy+4),fill=rgba(gold,170))
            dot(x,y,5,rgba(main,220))
    # Four-corner flares, and translucent border to match the Ascension tech design.
    for xx,yy in [(32,27),(480,27),(30,485),(482,485)]:star(xx,yy,6,rgba(gold,180))
    d.rounded_rectangle((6,6,505,505),radius=14,outline=rgba(gold,135),width=2)
    d.rounded_rectangle((12,12,499,499),radius=12,outline=rgba(main,140),width=2)
    gl=fx.filter(ImageFilter.GaussianBlur(9))
    gl.putalpha(gl.getchannel('A').point(lambda a: int(a*.48)))
    base=Image.alpha_composite(base,gl)
    base=Image.alpha_composite(base,fx)
    out=folder/f'{name}_ascension_neutral.png'
    base.convert('RGB').save(out,optimize=True)
    return out

if __name__=='__main__':
    for name in palette:print(make(name))
