import json,subprocess
CL={
'N01':(0.06,0.68,'N','Ini Raka.'),
'N02':(1.16,5.24,'N','Di luar ruangan, dia sudah menyiapkan pertanyaan untuk pasien pertamanya.'),
'N03':(5.72,7.12,'N','Lalu, pintu dibuka.'),
'N04':(7.56,9.12,'N','Pasiennya benar-benar ada.'),
'P01':(77.08,79.40,'P','Dok, saya harus cerita dari mana?'),
'N05':(9.50,12.86,'N','Dan seluruh pertanyaan itu, mendadak mengajukan cuti.'),
'N06':(13.32,14.64,'N','Raka menarik napas.'),
'N07':(15.08,15.66,'N','Tersenyum.'),
'N08':(16.00,17.04,'N','Mencoba bicara.'),
'N09':(17.40,19.04,'N','Tidak ada yang keluar selain...'),
'N10':(19.50,20.30,'N','Ehh...'),
'N11':(20.84,22.48,'N','Oke, kita mundur sebentar.'),
'N12':(22.90,27.82,'N','Selama kuliah, Raka belajar teori, ikut praktikum, mengerjakan tugas.'),
'N13':(28.18,30.24,'N','Dia juga sempat main dan bersenang-senang.'),
'N14':(30.56,33.70,'N','Wajar, yang selalu dia tunda cuma satu.'),
'N15':(34.04,35.82,'N','Latihan menghadapi kasus.'),
'R02':(79.72,82.22,'R','Eh, nanti aja. Masih lama.'),
'N16':(36.20,37.84,'N','Nanti aja, katanya.'),
'N17':(38.26,41.14,'N','Tanggung jawab itu dia berikan kepada Raka minggu depan.'),
'N18':(41.52,45.06,'N','Sayangnya, Raka minggu depan juga bilang, nanti aja.'),
'N19':(45.44,48.98,'N','Sampai suatu hari, dia mencoba Simulasi Dokter di MEDCOEL.'),
'N20':(49.38,51.14,'N','Dia belajar memulai pertanyaan.'),
'N21':(51.44,56.26,'N','Mencari informasi, lalu melihat bagian mana dari keputusannya yang perlu diperbaiki.'),
'N22':(56.70,60.94,'N','Awalnya salah, iya, tapi di sini dia bisa mencoba lagi.'),
'N23':(61.44,63.58,'N','Sekarang, kita kembali ke pintu tadi.'),
'N23b':(64.00,65.04,'N','Raka masih gugup.'),
'N24':(65.42,70.68,'N','Jasnya tidak mendadak memberi kekuatan super, tapi kali ini dia tahu cara memulai.'),
'R03':(82.70,86.20,'R','Baik. Boleh ceritakan keluhan yang paling mengganggu sekarang?'),
'N25':(71.12,76.54,'N','Mau latihan menghadapi kasus sebelum panik seperti Raka, coba Simulasi Dokter gratis di MEDCOEL.'),
}
meta={}
for k,(a,b,sp,tx) in CL.items():
    pre=0.07; post=0.20 if k=='N10' else 0.09
    s=max(0,a-pre); e=min(86.43,b+post)
    subprocess.run(['ffmpeg','-y','-v','error','-i','bian2.mp3','-af',f'atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st={e-s-0.02:.3f}:d=0.02','-ar','44100','-ac','1',f'clips/{k}.wav'],check=True)
    meta[k]={'start':round(s,3),'end':round(e,3),'dur':round(e-s,3),'who':sp,'text':tx}
json.dump(meta,open('clips.json','w'),ensure_ascii=False,indent=1)
print(round(sum(m['dur'] for m in meta.values()),2)); print({k:m['dur'] for k,m in meta.items()})
