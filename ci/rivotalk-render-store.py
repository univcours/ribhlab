import sys,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import cairosvg
out=Path('store-assets/rivotalk')
out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(sys.argv[1]) as z:
    name=next(n for n in z.namelist() if n.endswith('/res/drawable/ic_rivotalk.xml'))
    root=ET.fromstring(z.read(name))
ns='{http://schemas.android.com/apk/res/android}'
parts=[]
for e in root.findall('path'):
    a=e.attrib
    fill=a.get(ns+'fillColor','none')
    if fill=='#00000000':fill='none'
    attrs={'d':a[ns+'pathData'],'fill':fill}
    for x,y in [('strokeColor','stroke'),('strokeWidth','stroke-width'),('strokeLineCap','stroke-linecap')]:
        if ns+x in a:attrs[y]=a[ns+x]
    parts.append('<path '+' '.join(f'{k}="{v}"' for k,v in attrs.items())+'/>')
svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">'+''.join(parts)+'</svg>'
cairosvg.svg2png(bytestring=svg.encode(),write_to=str(out/'icon.png'),output_width=512,output_height=512)
icon=Image.open(out/'icon.png').convert('RGB')
im=Image.new('RGB',(1024,500),'#112B28')
d=ImageDraw.Draw(im)
for r in [176,220,264]:
    d.ellipse((766-r,250-r,766+r,250+r),outline='#24554a',width=2)
im.paste(icon.resize((300,300),Image.Resampling.LANCZOS),(616,100))
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
regular='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
d.text((58,100),'RivoTalk',font=ImageFont.truetype(font,76),fill='#B2F5D6')
d.text((62,212),'Offline walkie-talkie',font=ImageFont.truetype(font,37),fill='#ffffff')
d.text((62,282),'Bluetooth push-to-talk',font=ImageFont.truetype(regular,30),fill='#b9d8cf')
d.text((62,329),'Local group communication',font=ImageFont.truetype(regular,27),fill='#b9d8cf')
im.save(out/'feature.png',optimize=True)
