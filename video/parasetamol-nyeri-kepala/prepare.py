"""Prepare the narration timeline. No time stretching or replacement speech."""
import json,wave,math,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def save(name,data): (ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
sentences=[
 (0,3.32,'Kalau kepala nyeri, kita sering langsung cari parasetamol.'),
 (3.82,6.64,'Tapi obat ini sebenarnya bekerja di mana?'),
 (7.8,12.38,'Parasetamol membantu meredakan nyeri, terutama lewat kerja di sistem saraf pusat.'),
 (12.9,14.34,'Mekanismenya kompleks.'),
 (14.8,21.22,'Salah satu jalur yang dipelajari adalah berkurangnya pembentukan prostaglandin yang ikut berperan dalam munculnya rasa nyeri.'),
 (21.68,27.06,'Jadi rasa sakitnya bisa mereda, tapi penyebab sakit kepalanya belum tentu hilang.'),
 (27.8,32.64,'Kalau sakit kepala hanya sesekali, meminum parasetamol sesuai aturan kemasan bisa membantu.'),
 (33.24,37.2,'Tapi kalau kamu jadi sering membutuhkannya, cari tahu penyebabnya.'),
 (38.06,43.62,'Obat pereda nyeri yang digunakan terlalu sering dapat berkaitan dengan sakit kepala akibat penggunaan obat berlebihan.'),
 (44.36,46.86,'Terlalu banyak parasetamol juga bisa merusak hati.'),
 (47.56,51.58,'Cek obat flu yang kamu minum, karena mungkin juga mengandung parasetamol.'),
 (52.26,58.16,'Kalau sakit kepala datang mendadak dan sangat berat atau disertai kelemahan tubuh, segera cari bantuan medis.'),
 (59.06,62.16,'Mau belajar farmakologi sampai paham cara kerjanya?'),
 (62.82,65.78,'Di MEDCOEL, kamu bisa buka materi FK per bab,'),
 (66.14,67.64,'latihan soal dan pembahasannya,'),
 (67.92,69.54,'lalu mencoba Simulasi Dokter.'),
 (70.14,72.26,'Belajar gratis di medcoel.com.')
]
def shifted(t):return t+(145/30 if t>=67.9 else 0)+(18/30 if t>=70 else 0)
timings=[{'sourceStart':a,'sourceEnd':b,'start':shifted(a),'end':shifted(b),'text':s} for a,b,s in sentences]
save('sentence-timing.json',timings)
(ROOT/'naskah-final.txt').write_text('\n\n'.join(s for _,_,s in sentences)+'\n')
cues=[
 (0,1.18,'Kalau kepala nyeri,'),(1.54,3.36,'kita sering langsung cari|parasetamol.'),
 (3.82,6.7,'Tapi obat ini sebenarnya|bekerja di mana?'),
 (7.8,10.16,'Parasetamol membantu|meredakan nyeri,'),(10.36,12.43,'terutama lewat kerja|di sistem saraf pusat.'),
 (12.9,14.38,'Mekanismenya kompleks.'),(14.8,16.12,'Salah satu jalur|yang dipelajari'),
 (16.12,18.84,'adalah berkurangnya|pembentukan prostaglandin'),(18.84,21.28,'yang ikut berperan dalam|munculnya rasa nyeri.'),
 (21.68,23.94,'Jadi rasa sakitnya|bisa mereda,'),(24.3,27.12,'tapi penyebab sakit kepalanya|belum tentu hilang.'),
 (27.8,29.78,'Kalau sakit kepala|hanya sesekali,'),(30.12,31.98,'meminum parasetamol|sesuai aturan kemasan'),(31.98,32.7,'bisa membantu.'),
 (33.24,35.76,'Tapi kalau kamu jadi|sering membutuhkannya,'),(36.18,37.28,'cari tahu penyebabnya.'),
 (38.06,40.12,'Obat pereda nyeri yang|digunakan terlalu sering'),(40.12,41.98,'dapat berkaitan dengan|sakit kepala'),(42,43.7,'akibat penggunaan|obat berlebihan.'),
 (44.36,45.5,'Terlalu banyak parasetamol'),(45.5,46.96,'juga bisa merusak hati.'),
 (47.56,49.08,'Cek obat flu|yang kamu minum,'),(49.32,51.68,'karena mungkin juga|mengandung parasetamol.'),
 (52.26,54.88,'Kalau sakit kepala datang|mendadak dan sangat berat'),(54.88,56.66,'atau disertai|kelemahan tubuh,'),(56.9,58.26,'segera cari bantuan medis.'),
 (59.06,62.26,'Mau belajar farmakologi|sampai paham cara kerjanya?'),
 (62.82,64.34,'Di MEDCOEL, kamu bisa'),(64.34,65.86,'buka materi FK per bab,'),
 (66.14,67.76,'latihan soal|dan pembahasannya,'),(67.92,69.64,'lalu mencoba|Simulasi Dokter.'),
 (70.14,72.38,'Belajar gratis|di medcoel.com.')
]
caps=[{'start':shifted(a),'end':shifted(b),'lines':s.upper().split('|')} for a,b,s in cues]
save('captions.json',caps)
def tc(t,sep=','):
 ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
 return f'{h:02}:{m:02}:{s:02}{sep}{ms:03}'
(ROOT/'out'/'medcoel-parasetamol.srt').write_text('\n\n'.join(f'{i+1}\n{tc(c["start"])} --> {tc(c["end"])}\n'+ '\n'.join(c['lines']) for i,c in enumerate(caps))+'\n')
(ROOT/'out'/'medcoel-parasetamol.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{tc(c["start"],".")} --> {tc(c["end"],".")}\n'+'\n'.join(c['lines']) for c in caps)+'\n')
src=ROOT/'audio'/'narasi-google-ai-studio.wav'
with wave.open(str(src),'rb') as w:params=w.getparams();raw=w.readframes(w.getnframes())
rate=params.framerate;unit=params.sampwidth*params.nchannels
def span(a,b):return raw[round(a*rate)*unit:round(b*rate)*unit]
total=2372/30
parts=[span(0,67.9),b'\0'*(round(145/30*rate)*unit),span(67.9,70),b'\0'*(round(.6*rate)*unit),span(70,72.68)]
pcm=b''.join(parts);pcm+=b'\0'*(round(total*rate)*unit-len(pcm))
with wave.open(str(ROOT/'audio'/'narasi-timeline.wav'),'wb') as w:w.setparams(params);w.writeframes(pcm)
edits={'source':src.name,'sourceDuration':72.68,'output':'narasi-timeline.wav','duration':total,'speed':1,'operations':[{'type':'insert_silence','sourceTime':67.9,'duration':145/30},{'type':'insert_silence','sourceTime':70,'duration':.6},{'type':'tail_silence','duration':total-(72.68+145/30+.6)}],'verification':'All source PCM samples preserved, in order; only digital silence added. No EQ, pitch change, time stretch, fades, or replacement voice.','sourceSHA256':hashlib.sha256(raw).hexdigest()}
save('audio-edits.json',edits)
shots=[
 ('pembuka',0,6.64),('sinyal',6.64,10.36),('ssp',10.36,14.8),('prostaglandin',14.8,21.68),('gejala',21.68,27.8),('sesekali',27.8,33.24),('sering',33.24,38.06),('berlebihan',38.06,44.36),('hati',44.36,47.56),('kandungan',47.56,52.26),('bantuan',52.26,59.0666666667),('materi',59.0666666667,66.1333333333),('soal',66.1333333333,72.6333333333),('simulasi',72.6333333333,total)
]
timeline={'status':'IN_PRODUCTION','format':{'width':1080,'height':1920,'fps':30},'duration':total,'audio':'audio/narasi-timeline.wav','originalAudio':'audio/narasi-google-ai-studio.wav','sentences':'sentence-timing.json','captions':'captions.json','shots':[{'id':i,'start':a,'end':b} for i,a,b in shots],'markers':{'sistem saraf pusat':11.4,'mekanismenya kompleks':12.9,'prostaglandin':17.88,'sering membutuhkannya':34.76,'hati':46.54},'outro':{'start':59.0666666667,'duration':20,'ctaStart':75.5666666667,'clips':[{'id':'materi','start':59.0666666667,'end':66.1333333333,'source':'assets/materi-soal.mp4','sourceStart':0,'speed':1},{'id':'soal','start':66.1333333333,'end':72.6333333333,'source':'assets/materi-soal.mp4','sourceStart':7,'speed':1},{'id':'simulasi','start':72.6333333333,'end':total,'source':'assets/simulasi-dokter.mp4','sourceStart':6,'speed':1}]}}
save('timeline.json',timeline)
print(f'Prepared {len(shots)} shots, {len(caps)} captions, {total:.3f} seconds; original voice at 1×.')
