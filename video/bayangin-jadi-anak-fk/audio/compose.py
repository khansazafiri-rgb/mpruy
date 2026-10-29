# Menyusun linimasa video dari klip hasil potong: waktu tiap klip, waktu tiap kata (disejajarkan dengan naskah),
# titik jangkar adegan, dan amplop suara per frame untuk gerak mulut Raka. Hasil: ../stage/data.json
import json,re,subprocess,difflib,numpy as np,os
HERE=os.path.dirname(os.path.abspath(__file__))
FPS=30
C=json.load(open(HERE+"/clips.json")); S=json.load(open(HERE+"/script.json"))
# urutan dan jeda hening SEBELUM tiap klip (detik). Jeda panjang = napas adegan.
ORDER=[("N01",0.35),("R01",0.36),("N02",0.42),("R02",0.40),("N03",0.50),("R03",0.38),("N04",0.58),
       ("R04",1.15),("N05",1.45),("R05",0.38),("N06",0.50),("N07",0.48),("R06",0.54),("N08",0.62)]
TAIL=2.6  # kartu penutup setelah kata terakhir
t=0.0; clips={}
for cid,gap in ORDER:
    t+=gap; clips[cid]={"start":round(t,3),"end":round(t+C[cid]["dur"],3),"dur":C[cid]["dur"]}; t+=C[cid]["dur"]
TOTAL=round(t+TAIL,3)
TOTAL=round(np.ceil(TOTAL*FPS)/FPS,3)

norm=lambda s: re.sub(r"[^a-z0-9 ]","",s.lower().replace("-"," "))
def sim(a,b):
    if a==b: return 1.0
    return difflib.SequenceMatcher(None,a,b).ratio()
def align(script_tokens, asr_words):
    """Penyelarasan monoton (Needleman-Wunsch) token naskah dengan kata ASR; mengembalikan (s,e) tiap token naskah."""
    A=[norm(w)for w in script_tokens]; B=[norm(w["w"]) for w in asr_words]
    n,m=len(A),len(B); gap=-0.55
    D=np.zeros((n+1,m+1)); P=np.zeros((n+1,m+1),dtype=int)
    for i in range(1,n+1): D[i,0]=i*gap; P[i,0]=1
    for j in range(1,m+1): D[0,j]=j*gap; P[0,j]=2
    for i in range(1,n+1):
        for j in range(1,m+1):
            sc=sim(A[i-1],B[j-1]); sc=(sc-0.45)*2
            c=[D[i-1,j-1]+sc,D[i-1,j]+gap,D[i,j-1]+gap]; k=int(np.argmax(c)); D[i,j]=c[k]; P[i,j]=k
    i,j=n,m; m_=[None]*n
    while i>0 or j>0:
        k=P[i,j]
        if i>0 and j>0 and k==0:
            if sim(A[i-1],B[j-1])>=0.5: m_[i-1]=j-1
            i-=1; j-=1
        elif i>0 and (j==0 or k==1): i-=1
        else: j-=1
    res=[None]*n
    for i,j in enumerate(m_):
        if j is not None: res[i]=(asr_words[j]["s"],asr_words[j]["e"])
    # token tanpa pasangan: interpolasi di antara tetangga (sebanding panjang huruf)
    i=0
    while i<n:
        if res[i] is None:
            k=i
            while k<n and res[k] is None: k+=1
            lo=res[i-1][1] if i>0 else 0.0
            hi=res[k][0] if k<n else asr_words[-1]["e"]
            L=[max(2,len(A[x])) for x in range(i,k)]; tot=sum(L); cur=lo
            for x,l in zip(range(i,k),L):
                d=(hi-lo)*l/tot; res[x]=(cur,cur+d); cur+=d
            i=k
        else: i+=1
    return res

words=[]
for cid,_ in ORDER:
    toks=S[cid].split()
    asrw=C[cid]["words"]
    if not asrw: raise SystemExit("tidak ada kata ASR untuk "+cid)
    # "MEDCOEL," diucapkan sebagai dua kata ("Med koel"); sejajarkan dengan bentuk lisannya
    spoken=[]
    for tk in toks: spoken+= (["Med","koel"] if re.sub(r"[^A-Za-z]","",tk).upper()=="MEDCOEL" else [tk])
    al=align(spoken,asrw); out=[]; k=0
    for tk in toks:
        if re.sub(r"[^A-Za-z]","",tk).upper()=="MEDCOEL":
            s=al[k][0]; e=al[k+1][1]; k+=2
        else: s,e=al[k]; k+=1
        out.append({"w":tk,"s":round(clips[cid]["start"]+s,3),"e":round(clips[cid]["start"]+e,3),"clip":cid})
    words+=out

def anchor(cid,phrase,occ=0):
    """Waktu mulai frasa (kata pertama) di dalam klip; frasa diketik dengan kata dipisah spasi."""
    ws=[w for w in words if w["clip"]==cid]; P=norm(phrase).split()
    hits=[]
    for i in range(len(ws)-len(P)+1):
        if [norm(x["w"]) for x in ws[i:i+len(P)]]==P: hits.append(ws[i]["s"])
    return hits[occ]
ANCHORS={
 "bulan_pertama":anchor("N03","Bulan pertama"),"folder":anchor("N03","Folder kuliah"),"menandai":anchor("N03","Kamu menandai"),
 "pagi":anchor("N03","Pagi berangkat"),"malam":anchor("N03","malam membuka"),
 "bulan_kedua":anchor("N04","Bulan kedua"),"baca_semalaman":anchor("N04","Kamu baca"),"satu_soal":anchor("N04","Begitu mencoba"),"campur":anchor("N04","mendadak"),
 "akhir_tahun":anchor("N05","Akhir tahun"),"tapi_setiap":anchor("N05","Tapi setiap"),"tahun_kedua":anchor("N05","Masuk tahun"),"anatomi":anchor("N05","anatomi"),"farmakologi":anchor("N05","farmakologi"),
 "uang":anchor("N06","uang jajanmu"),"buku":anchor("N06","buku"),"fotokopi":anchor("N06","fotokopi"),"perjalanan":anchor("N06","perjalanan"),"kopi":anchor("N06","kopi"),
 "butuh_tempat":anchor("N07","Kamu butuh"),"tanpa_biaya":anchor("N07","Tanpa harus"),"kenalin":anchor("N07","Kenalin"),"gratis":anchor("N07","Gratis"),
 "pilih_matkul":anchor("N07","Pilih mata"),"kerjakan":anchor("N07","kerjakan soal"),"pembahasan":anchor("N07","lalu baca"),"simulasi":anchor("N07","Ada juga"),
 "tidak_harus":anchor("N07","Kamu nggak"),"mulai_dari":anchor("N07","Mulai dari"),
}
# amplop suara per frame (untuk mulut Raka dan ducking musik)
SR=44100
def env(cid):
    raw=subprocess.run(["ffmpeg","-v","error","-i",f"{HERE}/clips/{cid}.wav","-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True,check=True).stdout
    a=np.frombuffer(raw,dtype=np.float32); h=SR//FPS; n=len(a)//h+1
    r=np.array([np.sqrt((a[i*h:(i+1)*h]**2).mean()+1e-12) if len(a[i*h:(i+1)*h]) else 0.0 for i in range(n)]); return np.nan_to_num(r)
nf=int(round(TOTAL*FPS)); R_ENV=np.zeros(nf); N_ENV=np.zeros(nf)
for cid,_ in ORDER:
    e=env(cid); f0=int(round(clips[cid]["start"]*FPS)); tgt=R_ENV if cid[0]=="R" else N_ENV
    e=e/ (np.percentile(e,95)+1e-9); seg=np.clip(e,0,1.2)
    tgt[f0:f0+len(seg)]=np.maximum(tgt[f0:f0+len(seg)][:len(seg)],seg[:max(0,nf-f0)][:len(tgt[f0:f0+len(seg)])])
json.dump({"fps":FPS,"total":TOTAL,"order":[c for c,_ in ORDER],"clips":clips,"words":words,"anchors":ANCHORS,
           "envR":[round(float(x),3) for x in R_ENV],"envN":[round(float(x),3) for x in N_ENV]},
          open(HERE+"/../stage/data.json","w"),ensure_ascii=False)
print("total",TOTAL,"detik,",nf,"frame")
for k,v in clips.items(): print(k,v["start"],v["end"])
print(json.dumps(ANCHORS,indent=0))
