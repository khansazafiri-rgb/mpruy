"""Prepare timing, verbatim corrected transcript, subtitles and original audio stems."""
import json,wave,hashlib,re
from pathlib import Path
P=Path(__file__).resolve().parent
def save(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
EDITS=[(2.8,.8),(28.85,1.6),(40.4,1.2),(44.1,1.4),(65.08,4),(66.2,4.6),(67.8,3)]
def shift(t):return round(t+sum(d for a,d in EDITS if t>=a),8)
raw=json.loads((P/'audio/transkrip-asr.json').read_text())
texts=[
 'Belum makan, tapi kok perut malah perih?',
 'Saat lambung kosong, ia tidak mendadak berhenti menghasilkan asam.',
 'Namun, dinding lambung punya pelindung, lapisan lendir dan bikarbonat.',
 'Pada sebagian orang, sensasi dari lambung bisa terasa lebih mengganggu ketika perut kosong.',
 'Rasa perih ini belum berarti dinding lambungnya luka.',
 'Lalu, kapan bisa jadi masalah yang berbeda?',
 'Infeksi H. pylori atau penggunaan obat antiinflamasi tertentu dapat mengganggu pertahanan dinding lambung.',
 'Jika terbentuk luka, itulah tukak.',
 'Pada sebagian orang, nyerinya terasa saat lambung kosong.',
 'Obatnya pun bekerja dengan cara berbeda.',
 'Antasida menetralkan asam yang sudah ada.',
 'Obat penghambat pompa proton mengurangi asam yang diproduksi.',
 'Kalau penyebabnya H. pylori, pengobatannya perlu menangani bakterinya juga.',
 'Jadi, keluhan yang sering kita sebut maag, tidak selalu punya penyebab atau obat yang sama.',
 'Kalau perihnya berulang, makin berat atau disertai muntah darah maupun tinja hitam, periksakan diri.',
 'Mau memahami mekanisme tubuh lebih jauh?',
 'Di MEDCOEL, kamu bisa belajar materi per bab, latihan soal, dan mencoba Simulasi Dokter.',
 'Belajar FK gratis di medcoel.com.'
]
sent=[];words=[]
for i,(seg,text)in enumerate(zip(raw,texts)):
 a=29.2 if i==7 else 54.64 if i==14 else seg['start'];b=seg['end']
 sent.append(dict(sourceStart=a,sourceEnd=b,start=shift(a),end=shift(b),text=text))
 ws=seg['words']
 corrections={'osong,':'kosong,','bicarbonat.':'bikarbonat.','peri':'perih','nyirinya':'nyerinya','haplory':'H. pylori','mah,':'maag,','perinya':'perihnya','tinjah':'tinja','MedCool,':'MEDCOEL,','perbap,':'per bab,','medcool':'medcoel'}
 j=0
 while j<len(ws):
  w=dict(ws[j]);v=w['word'].strip()
  if i==12 and v=='HP':w['word']='H. pylori,';w['end']=ws[j+1]['end'];j+=1
  elif i==17 and v=='medcool':w['word']='medcoel.com.';w['end']=ws[j+1]['end'];j+=1
  else:w['word']=corrections.get(v,v)
  if i==7 and j==0:w['start']=29.2
  if i==14 and j==0:w['start']=54.64
  words.append(dict(sourceStart=w['start'],sourceEnd=w['end'],start=shift(w['start']),end=shift(w['end']),word=w['word']))
  j+=1
save('sentence-timing.json',sent);save('word-timing.json',words);(P/'naskah-final.txt').write_text('\n\n'.join(texts)+'\n')
# Chunk at natural sentence/phrase boundaries; all words remain in source order.
groups=[(0,2.6,'Belum makan, tapi kok|perut malah perih?'),(3.14,4.4,'Saat lambung kosong,'),(4.5,6.72,'ia tidak mendadak berhenti|menghasilkan asam.'),(7,8.92,'Namun, dinding lambung|punya pelindung,'),(9.18,10.92,'lapisan lendir|dan bikarbonat.'),(11.52,12.5,'Pada sebagian orang,'),(12.82,14.4,'sensasi dari lambung|bisa terasa lebih'),(14.4,15.8,'mengganggu|ketika perut kosong.'),(16.26,18.96,'Rasa perih ini belum berarti|dinding lambungnya luka.'),(19.84,22.06,'Lalu, kapan bisa jadi|masalah yang berbeda?'),(23.04,24.4,'Infeksi H. pylori'),(24.4,26.7,'atau penggunaan obat|antiinflamasi tertentu'),(26.7,28.7,'dapat mengganggu pertahanan|dinding lambung.'),(29.2,31.4,'Jika terbentuk luka,|itulah tukak.'),(31.62,32.6,'Pada sebagian orang,'),(32.82,34.42,'nyerinya terasa|saat lambung kosong.'),(35.46,37.58,'Obatnya pun bekerja|dengan cara berbeda.'),(38.02,40.26,'Antasida menetralkan|asam yang sudah ada.'),(40.7,42.2,'Obat penghambat|pompa proton'),(42.2,43.9,'mengurangi asam|yang diproduksi.'),(44.5,45.9,'Kalau penyebabnya H. pylori,'),(46.3,48.55,'pengobatannya perlu|menangani bakterinya juga.'),(49.48,51.95,'Jadi, keluhan yang sering|kita sebut maag,'),(52.12,54.2,'tidak selalu punya penyebab|atau obat yang sama.'),(54.64,55.98,'Kalau perihnya berulang,'),(56.2,57.4,'makin berat atau disertai'),(57.4,58.9,'muntah darah|maupun tinja hitam,'),(59.06,60.46,'periksakan diri.'),(60.48,62.35,'Mau memahami mekanisme tubuh|lebih jauh?'),(62.7,64.2,'Di MEDCOEL, kamu bisa belajar'),(64.2,64.98,'materi per bab,'),(65.2,66.06,'latihan soal,'),(66.36,67.62,'dan mencoba Simulasi Dokter.'),(68,70.06,'Belajar FK gratis|di medcoel.com.')]
caps=[dict(start=shift(a),end=shift(b),lines=s.upper().split('|'))for a,b,s in groups]
save('captions.json',caps)
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
assert norm(' '.join(' '.join(c['lines'])for c in caps))==norm(' '.join(texts))
def tc(t,sep=','):
 n=round(t*1000);h,n=divmod(n,3600000);m,n=divmod(n,60000);s,n=divmod(n,1000);return f'{h:02}:{m:02}:{s:02}{sep}{n:03}'
(P/'out').mkdir(exist_ok=True)
for ext in ['srt','vtt']:
 (P/'out'/('MEDCOEL-perut-perih.'+ext)).write_text(('WEBVTT\n\n'if ext=='vtt'else'')+'\n\n'.join((str(i+1)+'\n'if ext=='srt'else'')+tc(c['start'],','if ext=='srt'else'.')+' --> '+tc(c['end'],','if ext=='srt'else'.')+'\n'+'\n'.join(c['lines'])for i,c in enumerate(caps))+'\n')
with wave.open(str(P/'audio/narasi-google-ai-studio.wav'))as w:params=w.getparams();original=w.readframes(w.getnframes())
r=params.framerate;u=params.nchannels*params.sampwidth;pieces=[];last=0
for a,d in EDITS:
 n=round(a*r)*u;pieces.extend([original[last:n],bytes(round(d*r)*u)]);last=n
pieces.append(original[last:]);pcm=b''.join(pieces);duration=87.5;tail=round(duration*r)*u-len(pcm);pcm+=bytes(tail)
with wave.open(str(P/'audio/narasi-timeline.wav'),'wb')as w:w.setparams(params);w.writeframes(pcm)
save('audio-edits.json',dict(sourceDuration=70.28,duration=duration,speed=1,edits=[dict(sourceTime=a,silenceAdded=d)for a,d in EDITS],tailSilence=tail/(r*u),verification='Every original PCM sample preserved bit for bit and in order in narration stem; silence inserted only in quiet gaps. No voice speed, pitch or word changes.'))
shots=[('hook',0,3.94),('asam',3.94,7.8),('pelindung',7.8,12.32),('sinyal',12.32,17.06),('bukan-luka',17.06,20.64),('percabangan',20.64,23.84),('penyebab',23.84,31.6),('tukak',31.6,37.86),('obat-beda',37.86,40.42),('antasida',40.42,44.3),('ppi',44.3,49.5),('terapi-penyebab',49.5,54.48),('maag',54.48,59.64),('bantuan',59.64,65.48),('belajar',65.48,67.7),('materi',67.7,74.2),('soal',74.2,79.96),('simulasi',79.96,duration)]
save('timeline.json',dict(status='IN_PRODUCTION',width=1080,height=1920,fps=30,duration=duration,outroStart=65.48,webStart=67.7,ctaStart=84.4,shots=[dict(id=i,start=a,end=b)for i,a,b in shots],web=[dict(id='materi',start=67.7,end=74.2,source='assets/materi-soal.mp4',sourceStart=0,speed=1),dict(id='soal',start=74.2,end=79.96,source='assets/materi-soal.mp4',sourceStart=7.5,speed=1),dict(id='simulasi',start=79.96,end=duration,source='assets/simulasi-dokter.mp4',sourceStart=0,speed=1)],markers={'asam':shift(6.18),'lendir':shift(9.48),'bikarbonat':shift(10.08),'H. pylori':shift(23.76),'NSAID':shift(25.42),'luka':shift(29.9),'antasida':shift(38.02),'netralisasi':shift(38.62),'pompa proton':shift(41.44),'penghambatan':shift(42.14),'muntah darah':shift(57.36),'tinja hitam':shift(58.14)}))
print('Prepared 87.5-second project: original narration 70.28 seconds, all words and PCM unchanged; quiet-gap padding only.')
