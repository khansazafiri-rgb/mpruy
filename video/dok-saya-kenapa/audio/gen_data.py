"""Susun dialog.wav (klip asli dipasang di linimasa, tidak diubah) + data.json (kata per kata, envelope bibir)."""
import json,subprocess,numpy as np,wave
A='audio/'
meta=json.load(open(A+'clips.json'))
START={'N01':0.50,'N02':1.50,'N03':6.00,'N04':8.00,'P01':10.00,'N05':12.80,'N06':16.65,'N07':18.45,'N08':19.55,'N09':21.10,'N10':23.25,'N11':25.95,
'N12':28.15,'N13':33.55,'N14':36.10,'N15':39.70,'R02':41.95,'N16':44.95,'N17':47.05,'N18':50.40,'N19':54.40,'N20':58.45,'N21':60.70,'N22':66.00,
'N23':71.00,'N23b':73.65,'N24':75.20,'P01b':81.00,'R03':83.85,'N25':89.20}
SRC={'P01b':'P01'}
WORDS={
'N01':[('Ini',3),('Raka.',5)],
'N02':[('Di',2),('luar',4),('ruangan,',8),('dia',3),('sudah',5),('menyiapkan',10),('pertanyaan',10),('untuk',5),('pasien',6),('pertamanya.',10)],
'N03':[('Lalu,',5),('pintu',5),('dibuka.',7)],
'N04':[('Pasiennya',9),('benar-benar',10),('ada.',3)],
'P01':[('Dok,',3),('saya',4),('harus',5),('cerita',6),('dari',4),('mana?',5)],
'N05':[('Dan',3),('seluruh',6),('pertanyaan',10),('itu,',3),('mendadak',8),('mengajukan',10),('cuti.',5)],
'N06':[('Raka',4),('menarik',7),('napas.',6)],
'N07':[('Tersenyum.',10)],
'N08':[('Mencoba',7),('bicara.',6)],
'N09':[('Tidak',5),('ada',3),('yang',4),('keluar',6),('selain...',8)],
'N10':[('Ehh...',6)],
'N11':[('Oke,',4),('kita',4),('mundur',6),('sebentar.',8)],
'N12':[('Selama',6),('kuliah,',7),('Raka',4),('belajar',7),('teori,',6),('ikut',4),('praktikum,',9),('mengerjakan',11),('tugas.',5)],
'N13':[('Dia',3),('juga',4),('sempat',6),('main',4),('dan',3),('bersenang-senang.',14)],
'N14':[('Wajar,',6),('yang',4),('selalu',6),('dia',3),('tunda',5),('cuma',4),('satu.',4)],
'N15':[('Latihan',7),('menghadapi',10),('kasus.',6)],
'R02':[('Eh,',2),('nanti',5),('aja.',4),('Masih',5),('lama.',5)],
'N16':[('Nanti',5),('aja,',4),('katanya.',8)],
'N17':[('Tanggung',8),('jawab',5),('itu',3),('dia',3),('berikan',7),('kepada',6),('Raka',4),('minggu',6),('depan.',5)],
'N18':[('Sayangnya,',9),('Raka',4),('minggu',6),('depan',5),('juga',4),('bilang,',6),('nanti',5),('aja.',4)],
'N19':[('Sampai',6),('suatu',5),('hari,',4),('dia',3),('mencoba',7),('Simulasi',8),('Dokter',6),('di',2),('MEDCOEL.',7)],
'N20':[('Dia',3),('belajar',7),('memulai',7),('pertanyaan.',10)],
'N21':[('Mencari',7),('informasi,',9),('lalu',4),('melihat',7),('bagian',6),('mana',4),('dari',4),('keputusannya',12),('yang',4),('perlu',5),('diperbaiki.',10)],
'N22':[('Awalnya',7),('salah,',6),('iya,',4),('tapi',4),('di',2),('sini',4),('dia',3),('bisa',4),('mencoba',7),('lagi.',5)],
'N23':[('Sekarang,',8),('kita',4),('kembali',7),('ke',2),('pintu',5),('tadi.',5)],
'N23b':[('Raka',4),('masih',5),('gugup.',6)],
'N24':[('Jasnya',6),('tidak',5),('mendadak',8),('memberi',7),('kekuatan',8),('super,',6),('tapi',4),('kali',4),('ini',3),('dia',3),('tahu',4),('cara',4),('memulai.',8)],
'R03':[('Baik.',5),('Boleh',5),('ceritakan',9),('keluhan',7),('yang',4),('paling',6),('mengganggu',10),('sekarang?',8)],
'N25':[('Mau',3),('latihan',7),('menghadapi',10),('kasus',5),('sebelum',7),('panik',5),('seperti',7),('Raka,',5),('coba',4),('Simulasi',8),('Dokter',6),('gratis',6),('di',2),('MEDCOEL.',7)],
}
GAPS={'N13':20}
WORDS['P01b']=WORDS['P01']
GROUPS={'P01':[1],'P01b':[1],'R03':[1],'N25':[8],'N12':[2,5],'N14':[1],'R02':[3],'N16':[2],'N21':[2],'N22':[2,3],'N24':[6]}
WHO={'N':'N','T':'T','R':'R'}
sr=44100; FPS=30; DUR=100.0
N=int(DUR*sr); mix=np.zeros(N,dtype=np.float32)
def load(p):
    raw=subprocess.run(["ffmpeg","-v","error","-i",p,"-f","f32le","-ac","1","-ar",str(sr),"-"],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype=np.float32)
out={'fps':FPS,'dur':DUR,'lines':[]}
env={'P':np.zeros(int(DUR*FPS)+2),'R':np.zeros(int(DUR*FPS)+2)}
for cid,t0 in START.items():
    x=load(A+f'clips/{SRC.get(cid,cid)}.wav'); i=int(round(t0*sr)); mix[i:i+len(x)]+=x[:N-i]
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
    if cid[0] in 'PR' or cid=='N10':
        ev=np.clip(e/(np.percentile(e,95)+1e-9),0,1)
        key='R' if cid=='N10' else cid[0]
        for f in range(int(t0*FPS),int((t0+len(x)/sr)*FPS)+1):
            k=int((f/FPS-t0)*100)
            if 0<=k<len(ev): env[key][f]=float(ev[max(0,k-1):k+2].mean())
out['envP']=[round(float(v),3) for v in env['P']]; out['envR']=[round(float(v),3) for v in env['R']]
json.dump(out,open('stage/data.json','w'),ensure_ascii=False)
pk=np.abs(mix).max(); print('peak',pk)
w=wave.open('dialog.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(mix,-1,1)*32767).astype(np.int16).tobytes()); w.close()
# cek tabrakan antar klip
ls=sorted(out['lines'],key=lambda l:l['clip0'])
for a,b in zip(ls,ls[1:]):
    if b['clip0']<a['clip1']-0.001: print('TUMPANG TINDIH',a['id'],b['id'],a['clip1'],b['clip0'])
print('akhir dialog',max(l['clip1'] for l in out['lines']))
for l in out['lines']:
    if l['id'] in('N12',): print(l['id'],[(w['w'],w['s'],w['e']) for w in l['words']])
