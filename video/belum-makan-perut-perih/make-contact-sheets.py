from pathlib import Path
from PIL import Image,ImageDraw
import json
p=Path(__file__).resolve().parent/'out';qa=json.loads((p/'qa-index.json').read_text())
for n,start in enumerate(range(0,len(qa),12)):
 group=qa[start:start+12];im=Image.new('RGB',(810,504*((len(group)+2)//3)),'#F7F3E8');d=ImageDraw.Draw(im)
 for i,q in enumerate(group):
  a=Image.open(p/f'shot-{q["id"]}-{q["tag"]}.png');a.thumbnail((270,480));x=i%3*270;y=i//3*504;im.paste(a,(x,y+24));d.text((x+5,y+5),f'{q["id"]} {q["tag"]} {q["time"]:.2f}s',fill='#172B38')
 im.save(p/f'lembar-shot-{n+1}.jpg',quality=94)
print('Contact sheets:',(len(qa)+11)//12,'/',len(qa),'frames')
