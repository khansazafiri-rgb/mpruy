import json,subprocess
CL={ # id: (start,end,speaker,text)
'N01':(0.04,0.74,'N','Ini Raka.'),
'N02':(1.12,3.38,'N','Dia punya empat belas hari sebelum ujian.'),
'N03':(3.84,7.42,'N','Dalam tiga detik, dia akan merasa punya waktu untuk liburan.'),
'T01':(59.86,62.98,'T','Santai, Rak. Ujiannya masih dua minggu.'),
'N04':(7.96,10.14,'N','Nah. Dia sudah di pantai.'),
'N05':(10.52,11.36,'N','Secara mental.'),
'N06':(11.86,13.84,'N','H minus tiga belas: praktikum.'),
'N07':(14.28,16.22,'N','H minus sepuluh: tugas kelompok.'),
'N08':(16.60,20.22,'N','H minus tujuh: kuliah, lalu tugas dari kuliah itu.'),
'N09':(20.66,21.92,'N','Katanya dua minggu.'),
'N10':(22.40,23.64,'N','Kok hari kosongnya tidak ikut?'),
'N11':(24.12,25.00,'N','Tiga hari lagi.'),
'N12':(25.50,27.88,'N','Raka membuka semua materi sekaligus.'),
'N13':(28.26,30.86,'N','Strateginya... belum ditemukan.'),
'R01':(65.16,66.26,'R','Aku mulai dari mana?'),
'N14':(31.28,32.30,'N','Pertanyaan bagus.'),
'N15':(32.64,36.92,'N','Sayangnya, dia baru bertanya setelah membuka semua mata kuliah.'),
'N16':(37.28,38.80,'N','Oke, Rak. Tutup yang lain.'),
'N17':(39.18,39.82,'N','Pilih satu bab.'),
'N18':(40.22,40.90,'N','Coba soalnya.'),
'N19':(41.24,43.20,'N','Kalau salah, baca pembahasannya.'),
'N20':(43.50,44.08,'N','Baru lanjut.'),
'N21':(44.54,46.62,'N','Dia belum berubah jadi ensiklopedia.'),
'N22':(47.00,50.46,'N','Tapi sekarang, dia tahu bagian mana yang belum dia pahami.'),
'T02':(63.48,64.90,'T','Rak, jadi liburan?'),
'R02':(66.80,68.44,'R','Masih. Di kepalaku.'),
'N23':(50.86,52.16,'N','Pantainya bisa menunggu.'),
'N24':(52.54,58.40,'N','Buat mulai belajar, ada tiga puluh delapan ribu empat ratus soal dan pembahasan gratis di Medcoel.'),
'N25':(58.82,59.54,'N','Satu bab dulu.'),
}
meta={}
for k,(a,b,sp,tx) in CL.items():
    s=max(0,a-0.07); e=min(68.67,b+0.09)
    subprocess.run(['ffmpeg','-y','-v','error','-i','bian.mp3','-af',f'atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st={e-s-0.02:.3f}:d=0.02','-ar','44100','-ac','1',f'clips/{k}.wav'],check=True)
    meta[k]={'start':round(s,3),'end':round(e,3),'dur':round(e-s,3),'who':sp,'text':tx}
json.dump(meta,open('clips.json','w'),ensure_ascii=False,indent=1)
print(sum(m['dur'] for m in meta.values()))
