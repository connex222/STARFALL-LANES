import base64, os
F='node_modules/@fontsource/'
def b64(p): return base64.b64encode(open(p,'rb').read()).decode()
css=open('src/common.css').read()
for key,path in {'__ORB700__':F+'orbitron/files/orbitron-latin-700-normal.woff2','__ORB900__':F+'orbitron/files/orbitron-latin-900-normal.woff2',
  '__INT400__':F+'inter/files/inter-latin-400-normal.woff2','__INT600__':F+'inter/files/inter-latin-600-normal.woff2','__INT800__':F+'inter/files/inter-latin-800-normal.woff2'}.items():
    css=css.replace(key,b64(path))
common=open('src/common.js').read(); mapjs=open('src/map.js').read()
qr=open('node_modules/qrcode-generator/dist/qrcode.js').read()
os.makedirs('public',exist_ok=True)
for name in ['tv.html','phone.html']:
    h=open('src/'+name).read()
    h=h.replace('/*CSS*/',css).replace('/*COMMONJS*/',common).replace('/*MAPJS*/',mapjs).replace('/*QRJS*/',qr)
    open('public/'+name,'w').write(h)
    print(name, len(h)//1024,'KB')
