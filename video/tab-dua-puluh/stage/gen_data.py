import json, re, wave, numpy as np, os
S='/tmp/claude-0/-home-user/c3dc5e70-a599-57ff-91be-f3087c292010/scratchpad'
tl=json.load(open(S+'/audio/timeline.json'))['timeline']
FPS=30; TOTAL=100.5
LINES={
"A01":"Ujian dekat, tab-ku udah {20|dua puluh}! Latihan soal kedokteran yang lengkap tapi gratis tuh di mana sih?!",
"B01":"Coba MEDCOEL. Gratis… isinya {38.400|tiga puluh delapan ribu empat ratus} soal.",
"A02":"Serius gratis? Kebetulan aku lagi pusing banget sama Anatomi.",
"B02":"Pilih mata kuliahnya, lalu bab yang lagi kamu pelajari. Bab yang belum ada soalnya ditandai segera hadir.",
"A03":"Oke, aku mulai dari bab yang ini.",
"B03":"Kerjain satu soal. Pakai Mode Learning, jadi pembahasannya langsung muncul.",
"A04":"Hmm… B? Atau C?",
"B04":"Cek jawabannya. Pembahasan ada di tiap pilihan, bukan cuma kunci.",
"A05":"Ooh, jadi salahnya di situ! Baru ngerti aku.",
"B05":"Mau latihan lebih serius? Coba Simulasi. Atur bab, jumlah soal, mode Learning atau Ujian, dan timer kalau perlu.",
"A06":"Aku ambil {15|lima belas} soal, timer {20|dua puluh} menit. Gas!",
"B06":"Terus ada Simulasi Dokter. Pilih poli, nanti pasiennya diundi.",
"A07":"Anamnesis dulu… Keluhannya sejak kapan, Pak?",
"B07":"Lanjut periksa fisik, minta pemeriksaan penunjang, terus tentukan diagnosisnya.",
"A08":"Diagnosisku… ini! Duh, deg-degan.",
"B08":"Selesai, kamu dapat laporan sesi: skor, diagnosis, sama urutan tindakanmu.",
"A09":"Seru! Salah di sini aman, belajarnya tetap dapet.",
"B09":"Semua latihanmu tercatat, progres tiap bab kelihatan. Ada leaderboard juga biar semangat.",
"A10":"Kalau aku punya PDF soal angkatan?",
"B10":"Ajukan lewat Chat Admin. Admin periksa dulu sebelum soalnya tayang.",
"A11":"Oke, nggak perlu nyari-nyari lagi. Aku mulai sekarang!",
"B11":"Mulai dari satu bab dulu. {medcoel.com|medcoel titik com}",
}
def load(code):
    w=wave.open(f'{S}/audio/clips/{code}.wav'); sr=w.getframerate(); n=w.getnframes()
    a=np.frombuffer(w.readframes(n),dtype=np.int16).astype(np.float32)/32768
    if w.getnchannels()>1: a=a.reshape(-1,w.getnchannels()).mean(1)
    return a,sr
def tokens(s):
    return re.findall(r'(?:\{[^}]*\}|\S)+',s)
lines=[]
N=int(TOTAL*FPS)+1
envA=np.zeros(N); envB=np.zeros(N)
for code,st,en,dur in tl:
    a,sr=load(code)
    hop=sr//100
    rms=np.array([np.sqrt(np.mean(a[i:i+hop]**2)+1e-12) for i in range(0,len(a)-hop,hop)])
    sm=np.convolve(rms,np.ones(3)/3,mode='same')
    mx=np.percentile(sm,98)
    thr=0.14*mx
    voiced=sm>thr
    # tutup celah pendek (<120ms), buang semburan <40ms
    v=voiced.copy(); i=0
    while i<len(v):
        if not v[i]:
            j=i
            while j<len(v) and not v[j]: j+=1
            if i>0 and j<len(v) and (j-i)<12: v[i:j]=True
            i=j
        else: i+=1
    segs=[];i=0
    while i<len(v):
        if v[i]:
            j=i
            while j<len(v) and v[j]: j+=1
            if j-i>=4: segs.append((i/100,j/100))
            i=j
        else: i+=1
    toks=tokens(LINES[code])
    ws=[]
    for tk in toks:
        disp=re.sub(r'\{([^|}]*)\|[^}]*\}',r'\1',tk); spk=re.sub(r'\{[^|}]*\|([^}]*)\}',r'\1',tk)
        wt=len(re.sub(r'[^A-Za-z0-9]','',spk))+1.2
        if 'medcoel' in spk.lower() and '{' in tk: wt=8
        ws.append([disp,wt])
    tot=sum(w for _,w in ws); voiced_total=sum(e-s for s,e in segs)
    def at_voiced(x):  # x in [0,voiced_total] -> clip time
        acc=0
        for s,e in segs:
            if x<=acc+(e-s)+1e-9: return s+(x-acc)
            acc+=e-s
        return segs[-1][1]
    words=[];cum=0
    for d,wt in ws:
        s=at_voiced(cum/tot*voiced_total); cum+=wt; e=at_voiced(cum/tot*voiced_total)
        words.append({'w':d,'s':round(st+s,3),'e':round(st+e,3)})
    speech=[round(st+segs[0][0],3),round(st+segs[-1][1],3)]
    lines.append({'code':code,'who':code[0],'t0':st,'t1':en,'speech':speech,'text':' '.join(w['w'] for w in words),'words':words})
    # envelope per video frame
    env=np.clip(sm/mx,0,1.2)
    for f in range(int(st*FPS),min(N,int(en*FPS)+1)):
        t=f/FPS-st
        k=int(t*100)
        if 0<=k<len(env):
            (envA if code[0]=='A' else envB)[f]=float(env[k])
json.dump({'fps':FPS,'total':TOTAL,'lines':lines,'envA':[round(x,3) for x in envA],'envB':[round(x,3) for x in envB]},open('data.json','w'))
for l in lines[:3]: print(l['code'],l['speech'],[(w['w'],w['s'],w['e']) for w in l['words']][:20])
