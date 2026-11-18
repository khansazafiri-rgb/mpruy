from pathlib import Path
from PIL import Image,ImageDraw
import json
p=Path(__file__).resolve().parent/'out'
qa=json.loads((p/'qa-index.json').read_text())
groups=[qa[i:i+12] for i in range(0,len(qa),12)]
for n,group in enumerate(groups):
 s=Image.new('RGB',(810,504*((len(group)+2)//3)),'#F5F1E6');d=ImageDraw.Draw(s)
 for i,q in enumerate(group):
  im=Image.open(p/f'shot-{q["id"]}-{q["tag"]}.png');im.thumbnail((270,480));x=i%3*270;y=i//3*504
  s.paste(im,(x,y+24));d.text((x+5,y+5),f'{q["id"]} / {q["tag"]} / {q["time"]:.2f}s',fill='#212739')
 s.save(p/f'lembar-shot-{n+1}.jpg',quality=93)
print('Saved',len(groups),'contact sheets with',len(qa),'frames')
