from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root=Path(__file__).resolve().parents[1]
folder=root/'public/art/avatars'
names=[('kaia','KAIA RHO'),('zibzob','ZIB-ZOB'),('oolu','MATRIARCH OOLU'),('vex','VEX HALLORAN'),('pyrrhus','ARCHON PYRRHUS'),('nim','DR NIM OKAFOR'),('skrill','SKRILL'),('bramble','CAPTAIN BRAMBLE')]
cols,tw,th,gap=4,268,318,22
W=4*tw+5*gap;H=2*th+3*gap+86
bg=Image.new('RGB',(W,H),(8,15,31));d=ImageDraw.Draw(bg)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f=ImageFont.truetype(bold,30);nm=ImageFont.truetype(bold,15);sm=ImageFont.truetype(font,14)
d.text((gap,22),'STARFALL LANES  /  BATCH 3',font=f,fill=(218,236,255))
d.text((gap,62),'Eight Smug master expressions  •  Expansion era',font=sm,fill=(118,197,224))
for i,(key,name) in enumerate(names):
 x=gap+(i%cols)*(tw+gap);y=100+gap+(i//cols)*(th+gap)
 d.rounded_rectangle((x-2,y-2,x+tw+2,y+th+2),radius=13,fill=(13,29,51),outline=(54,127,168),width=2)
 im=Image.open(folder/f'{key}_expansion_smug.png').convert('RGB').resize((tw,tw))
 bg.paste(im,(x,y))
 d.text((x+12,y+tw+14),name,font=nm,fill=(226,238,255))
 d.text((x+12,y+tw+38),'EXPANSION · SMUG',font=sm,fill=(129,207,232))
out=Path('/mnt/data/starfall-batch3-smug-preview.png')
bg.save(out,optimize=True)
print(out)
