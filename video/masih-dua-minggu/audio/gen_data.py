"""Susun dialog.wav (klip asli dipasang di linimasa, tidak diubah) + data.json (kata per kata, envelope bibir)."""
import json,subprocess,numpy as np,wave
A='audio/'
meta=json.load(open(A+'clips.json'))
START={'N01':0.62,'N02':1.67,'N03':4.39,'T01':8.40,'N04':11.75,'N05':14.31,'N06':15.55,'N07':17.97,'N08':20.29,'N09':24.35,'N10':26.09,'N11':27.81,
'N12':29.69,'N13':32.45,'R01':35.45,'N14':37.10,'N15':39.70,'N16':44.50,'N17':47.40,'N18':49.90,'N19':52.50,'N20':55.10,'N21':57.30,'N22':59.80,
'T02':63.90,'R02':65.90,'N23':69.10,'N24':70.90,'N25':77.15}
# kata tampilan + bobot (panjang ucapan; angka dieja)
WORDS={
'N01':[('Ini',3),('Raka.',5)],
'N02':[('Dia',3),('punya',5),('14',11),('hari',4),('sebelum',7),('ujian.',6)],
'N03':[('Dalam',5),('3',4),('detik,',6),('dia',3),('akan',4),('merasa',6),('punya',5),('waktu',5),('untuk',5),('liburan.',8)],
'T01':[('Santai,',7),('Rak.',3),('Ujiannya',8),('masih',5),('dua',3),('minggu.',6)],
'N04':[('Nah.',4),('Dia',3),('sudah',5),('di',2),('pantai.',7)],
'N05':[('Secara',6),('mental.',7)],
'N06':[('H-13:',17),('praktikum.',9)],
'N07':[('H-10:',15),('tugas',5),('kelompok.',8)],
'N08':[('H-7:',13),('kuliah,',7),('lalu',4),('tugas',5),('dari',4),('kuliah',6),('itu.',3)],
'N09':[('Katanya',7),('dua',3),('minggu.',6)],
'N10':[('Kok',3),('hari',4),('kosongnya',9),('tidak',5),('ikut?',5)],
'N11':[('Tiga',4),('hari',4),('lagi.',5)],
'N12':[('Raka',4),('membuka',7),('semua',5),('materi',6),('sekaligus.',9)],
'N13':[('Strateginya...',12),('belum',5),('ditemukan.',9)],
'R01':[('Aku',3),('mulai',5),('dari',4),('mana?',5)],
'N14':[('Pertanyaan',10),('bagus.',6)],
'N15':[('Sayangnya,',9),('dia',3),('baru',4),('bertanya',8),('setelah',7),('membuka',7),('semua',5),('mata',4),('kuliah.',7)],
'N16':[('Oke,',3),('Rak.',3),('Tutup',5),('yang',4),('lain.',4)],
'N17':[('Pilih',5),('satu',4),('bab.',3)],
'N18':[('Coba',4),('soalnya.',7)],
'N19':[('Kalau',5),('salah,',6),('baca',4),('pembahasannya.',13)],
'N20':[('Baru',4),('lanjut.',6)],
'N21':[('Dia',3),('belum',5),('berubah',7),('jadi',4),('ensiklopedia.',12)],
'N22':[('Tapi',4),('sekarang,',8),('dia',3),('tahu',4),('bagian',6),('mana',4),('yang',4),('belum',5),('dia',3),('pahami.',7)],
'T02':[('Rak,',3),('jadi',4),('liburan?',8)],
'R02':[('Masih.',6),('Di',2),('kepalaku.',8)],
'N23':[('Pantainya',9),('bisa',4),('menunggu.',8)],
'N24':[('Buat',4),('mulai',5),('belajar,',8),('ada',3),('38.400',35),('soal',4),('dan',3),('pembahasan',10),('gratis',6),('di',2),('MEDCOEL.',7)],
'N25':[('Satu',4),('bab',3),('dulu.',4)],
}
GAPS={'N13':20}
GROUPS={'T01': 2, 'N04': 1, 'N06': 1, 'N07': 1, 'N08': [1, 2], 'N13': 1, 'N16': 2, 'T02': 1, 'R02': 1}
WHO={'N':'N','T':'T','R':'R'}
sr=44100; FPS=30; DUR=83.0
N=int(DUR*sr); mix=np.zeros(N,dtype=np.float32)
def load(p):
    raw=subprocess.run(["ffmpeg","-v","error","-i",p,"-f","f32le","-ac","1","-ar",str(sr),"-"],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype=np.float32)
out={'fps':FPS,'dur':DUR,'lines':[]}
env={'T':np.zeros(int(DUR*FPS)+2),'R':np.zeros(int(DUR*FPS)+2)}
for cid,t0 in START.items():
    x=load(A+f'clips/{cid}.wav'); i=int(round(t0*sr)); mix[i:i+len(x)]+=x[:N-i]
    h=sr//100; n=len(x)//h; e=np.sqrt((x[:n*h].reshape(n,h)**2).mean(1)+1e-12)
    thr=0.05*np.percentile(e,98)
    v=e>thr
    # tutup lubang pendek (<120 ms) supaya satu frasa tidak terpecah
    idx=np.where(v)[0]; segs=[]
    if len(idx):
        s=idx[0]; p=idx[0]
        for k in idx[1:]:
            if k-p>GAPS.get(cid,25): segs.append((s,p+1)); s=k
            p=k
        segs.append((s,p+1))
    tot=sum(b-a for a,b in segs); ws=WORDS[cid]; W=sum(w for _,w in ws)
    # distribusikan kata sesuai bobot pada waktu bersuara saja
    words=[]
    cuts=GROUPS.get(cid,[]); cuts=[cuts] if isinstance(cuts,int) else cuts
    bounds=[0]+list(cuts)+[len(ws)]; groups=[ws[bounds[i]:bounds[i+1]] for i in range(len(bounds)-1)]
    if len(groups)==len(segs):
        for g,(a,b) in zip(groups,segs):
            Wg=sum(w for _,w in g); acc=0
            for w,wt in g:
                s_=a+(b-a)*acc/Wg; acc+=wt; e_=a+(b-a)*acc/Wg
                words.append({'w':w,'s':round(t0+s_/100,3),'e':round(t0+e_/100,3)})
    else:
        print('PERINGATAN',cid,'kelompok',len(groups),'segmen',len(segs),[(a/100,b/100) for a,b in segs])
        acc=0
        def pos(c):
            r=c
            for a,b in segs:
                if r<=b-a: return a+r
                r-=b-a
            return segs[-1][1]
        for w,wt in ws:
            s_=pos(acc/W*tot); acc+=wt; e_=pos(acc/W*tot)
            words.append({'w':w,'s':round(t0+s_/100,3),'e':round(t0+e_/100,3)})
    out['lines'].append({'id':cid,'who':cid[0],'t0':round(t0+segs[0][0]/100,3),'t1':round(t0+segs[-1][1]/100,3),'clip0':t0,'clip1':round(t0+len(x)/sr,3),'words':words})
    if cid[0] in 'TR':
        ev=np.clip(e/(np.percentile(e,95)+1e-9),0,1)
        for f in range(int(t0*FPS),int((t0+len(x)/sr)*FPS)+1):
            k=int((f/FPS-t0)*100)
            if 0<=k<len(ev): env[cid[0]][f]=float(ev[max(0,k-1):k+2].mean())
out['envT']=[round(float(v),3) for v in env['T']]; out['envR']=[round(float(v),3) for v in env['R']]
json.dump(out,open('stage/data.json','w'),ensure_ascii=False)
pk=np.abs(mix).max(); print('peak',pk)
w=wave.open('dialog.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(mix,-1,1)*32767).astype(np.int16).tobytes()); w.close()
# cek tabrakan antar klip
ls=sorted(out['lines'],key=lambda l:l['clip0'])
for a,b in zip(ls,ls[1:]):
    if b['clip0']<a['clip1']-0.001: print('TUMPANG TINDIH',a['id'],b['id'],a['clip1'],b['clip0'])
print('akhir dialog',max(l['clip1'] for l in out['lines']))
for l in out['lines']:
    if l['id'] in('T01','N08','N24'): print(l['id'],[(w['w'],w['s'],w['e']) for w in l['words']])
