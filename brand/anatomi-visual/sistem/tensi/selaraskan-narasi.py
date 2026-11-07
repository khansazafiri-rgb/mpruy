import re, subprocess, json, itertools
import numpy as np
S=[
"Baru berdiri dari kursi, pandangannya mendadak gelap.",
"Kenapa tubuhnya seperti mau jatuh?",
"Saat kita berdiri, gravitasi membuat sebagian darah berkumpul di kaki dan perut.",
"Darah yang kembali ke jantung berkurang.",
"Tekanan bisa turun sesaat, dan aliran darah ke otak ikut berkurang.",
"Tapi tubuh biasanya cepat mengimbangi.",
"Sensor tekanan di pembuluh darah memberi sinyal.",
"Jantung berdetak lebih cepat, pembuluh menyempit, dan tekanan kembali terjaga.",
"Kalau respons itu terlambat, kita bisa merasa pusing atau bahkan pingsan.",
"Kurang cairan, obat tertentu, dan kehilangan darah juga bisa membuat tekanan turun.",
"Lalu, apakah ada hal khusus pada perempuan?",
"Saat hamil, pembuluh darah cenderung lebih rileks sehingga tekanan bisa lebih rendah.",
"Perdarahan haid yang sangat banyak juga perlu diperhatikan: kehilangan darah yang berat bisa menurunkan tekanan.",
"Tapi jangan samakan anemia dengan tensi rendah.",
"Haid banyak bisa menyebabkan anemia dan pusing, meskipun tekanan darahnya tidak rendah.",
"Angka di bawah sembilan puluh per enam puluh sering disebut tensi rendah.",
"Namun, yang penting juga adalah gejalanya dan penyebabnya.",
"Kalau sampai pingsan, perdarahannya banyak, atau pusingnya berat dan menetap, segera cari pertolongan medis.",
]
def syl(s): return max(1,len(re.findall(r'[aeiou]+',s.lower())))
w=np.array([syl(s) for s in S],float)
out=subprocess.run(['ffmpeg','-hide_banner','-i','narasi.wav','-af','silencedetect=noise=-38dB:d=0.2','-f','null','-'],capture_output=True,text=True).stderr
st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',out)]; en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',out)]
sil=[(a,b) for a,b in zip(st,en)]
T0=en[0]; Tend=78.4
# kandidat batas = tengah tiap jeda (kecuali jeda awal)
cand=[( (a+b)/2, b-a, a, b) for a,b in sil[1:] if b<Tend-0.3]
print(len(cand),'kandidat; total suku kata',w.sum())
# DP: pilih 17 batas dari kandidat; waktu bicara total = Tend - T0; jeda total harus ikut
n=len(S); K=len(cand)
cum=np.cumsum(w)/w.sum()
best={}
def cost(i,j_prev,j):
    # kalimat i berada di antara batas j_prev dan j (indeks kandidat; -1 awal, K akhir)
    a = T0 if j_prev<0 else cand[j_prev][3]
    b = Tend-0.1 if j>=K else cand[j][2]
    dur=b-a
    # durasi bicara diharapkan = suku kata / laju; laju diestimasi global
    return dur
# laju bicara global: total bicara = Tend-T0 - total jeda antar-kalimat; aproksimasi: laju = w.sum()/(sum speech segments)
speech=sum((b2-a2) for (a1,a2),(b1,b2) in zip([(0,0)]+[(x,y) for x,y in sil[:-1]],[(x,y) for x,y in sil]) for _ in [0])
seg=[]; prev=en[0]
for a,b in sil[1:]:
    seg.append((prev,a)); prev=b
seg.append((prev,Tend))
spk=sum(b-a for a,b in seg)
rate=w.sum()/spk
print('laju suku kata/dtk',round(rate,2),'bicara total',round(spk,1))
INF=1e18
dp=[[INF]*(K+1) for _ in range(n+1)]; bk=[[None]*(K+1) for _ in range(n+1)]
dp[0][0]=0  # j=0 berarti 'sebelum kandidat 0' ; gunakan indeks batas terakhir+1
for i in range(1,n+1):
    for j in range(0,K+1):          # batas akhir kalimat i = kandidat j-1 (j=K+1 -> akhir audio)
        for jp in range(0,j+1):
            if dp[i-1][jp]>=INF: continue
            if i==n and j!=K: continue
            a = T0 if jp==0 else cand[jp-1][3]
            b = (Tend-0.1) if j==K else cand[j-1][2]
            if j==jp and i<n: continue
            if b<=a: continue
            # waktu bicara bersih dalam [a,b]: hitung jeda internal
            inner=sum(min(b,y)-max(a,x) for x,y in sil if x<b and y>a)
            sp=(b-a)-max(0,inner)
            exp=w[i-1]/rate
            c=(sp-exp)**2/ (exp+0.5)
            # bonus jeda panjang pada batas
            bonus = 0 if j==K else -0.35*min(cand[j-1][1],1.0)
            tot=dp[i-1][jp]+c+bonus
            if tot<dp[i][j]: dp[i][j]=tot; bk[i][j]=jp
# rekonstruksi
j=K; path=[]
for i in range(n,0,-1):
    jp=bk[i][j]; path.append((i-1,jp,j)); j=jp
path.reverse()
res=[]
for i,jp,j in path:
    a = T0 if jp==0 else cand[jp-1][3]
    b = (Tend-0.1) if j==K else cand[j-1][2]
    res.append({'i':i,'teks':S[i],'t0':round(a,2),'t1':round(b,2)})
for r in res: print(f"{r['t0']:6.2f}-{r['t1']:6.2f}  {r['t1']-r['t0']:5.2f}s  {syl(r['teks']):3d}suku  {r['teks'][:60]}")
json.dump({'durasi':Tend,'kalimat':res,'jeda':sil},open('waktu-narasi.json','w'),indent=1)
