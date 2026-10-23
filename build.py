"""Regenerate both standalone client pages from src/.
Uses npm dependencies when available; offline fallback reuses the already embedded
font data and local QR generator in the checked-in public/tv.html.
"""
from pathlib import Path
import re, base64
root=Path(__file__).resolve().parent
fonts=root/'node_modules/@fontsource'
existing=(root/'public/tv.html').read_text(encoding='utf8') if (root/'public/tv.html').exists() else ''
css=(root/'src/common.css').read_text(encoding='utf8')
for label,family,weight,package,filename in [
 ('__ORB700__','Orbitron',700,'orbitron','orbitron-latin-700-normal.woff2'),
 ('__ORB900__','Orbitron',900,'orbitron','orbitron-latin-900-normal.woff2'),
 ('__INT400__','Inter',400,'inter','inter-latin-400-normal.woff2'),
 ('__INT600__','Inter',600,'inter','inter-latin-600-normal.woff2'),
 ('__INT800__','Inter',800,'inter','inter-latin-800-normal.woff2')]:
    font=fonts/package/'files'/filename
    if font.exists(): data=base64.b64encode(font.read_bytes()).decode('ascii')
    else:
        pattern=r'@font-face\{font-family:'+family+r';font-weight:'+str(weight)+r';[^}]*?base64,([^)]*)\)'
        m=re.search(pattern,existing)
        if not m:raise RuntimeError('Missing '+label+'; run npm install or restore generated public/tv.html')
        data=m.group(1)
    css=css.replace(label,data)
qrpath=root/'node_modules/qrcode-generator/dist/qrcode.js'
if qrpath.exists():qr=qrpath.read_text(encoding='utf8')
else:
    m=re.search(r'<script>([\s\S]*?)</script>',existing)
    if not m or 'var qrcode = function()' not in m.group(1):raise RuntimeError('QR library unavailable; run npm install or restore generated public/tv.html')
    qr=m.group(1)
common=(root/'src/common.js').read_text(encoding='utf8')
conn=(root/'src/connection.js').read_text(encoding='utf8')
mapjs=(root/'src/map.js').read_text(encoding='utf8')
for name in ['tv.html','phone.html']:
    html=(root/'src'/name).read_text(encoding='utf8')
    for tag,replacement in [('/*CSS*/',css),('/*QRJS*/',qr),('/*COMMONJS*/',common),('/*CONNJS*/',conn),('/*MAPJS*/',mapjs)]:html=html.replace(tag,replacement)
    (root/'public'/name).write_text(html,encoding='utf8')
    print(name, len(html)//1024, 'KiB')
