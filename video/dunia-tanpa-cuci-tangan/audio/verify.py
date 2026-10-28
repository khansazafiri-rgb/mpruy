import json,subprocess,numpy as np,difflib,re,wave
from faster_whisper import WhisperModel
SCRIPT={"N01":"Kalau satu kebiasaan ini hilang dari rumah sakit... apa yang ikut berpindah?","N02":"Pagi yang sibuk di bangsal.","N03":"Tangannya menyentuh pagar ranjang. Benda di sekitar pasien juga bagian dari lingkungan perawatan.","N04":"Titik-titik ini hanya gambaran mikroorganisme yang mungkin ada di sana.","N05":"Perawat bergegas ke pasien kedua. Titik-titik itu ikut di tangannya.","N06":"Tunggu.","N07":"Kita biasanya tidak melihat yang berpindah. Tapi perpindahan itu bisa meningkatkan risiko infeksi.","N08":"Dari lingkungan pasien pertama, ke tangan, ke pasien kedua.","N09":"Sekarang, kita putar ulang.","N10":"Selesai dari pasien pertama, perawat membersihkan tangannya sebelum menyentuh pasien kedua.","N11":"Gosok dengan cairan berbasis alkohol, atau cuci dengan sabun dan air kalau tangannya tampak kotor. Sarung tangan tidak menggantikan ini.","N12":"Ruangan yang sama. Jalurnya terputus.","N13":"Risikonya belum tentu jadi infeksi. Tapi beberapa detik ini bisa membantu melindungi orang berikutnya.","N14":"Cerita kedokteran lainnya bareng MEDCOEL.","P01":"Baik, Pak, istirahat dulu ya.","P02":"Permisi, Bu, saya periksa dulu ya.","P03":"Tangan bersih dulu, baru periksa."}
def norm(t): return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9 ]"," ",t.lower().replace("-"," "))).strip()
def load(p): return np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",p,"-f","f32le","-ac","1","-ar","16000","-"],capture_output=True,check=True).stdout,dtype=np.float32)
m=WhisperModel("small",device="cpu",compute_type="int8"); rows=[]
for k in SCRIPT:
    a=load(f"clips/{k}.wav")
    segs,_=m.transcribe(a,language="id",beam_size=5,condition_on_previous_text=False)
    got=" ".join(s.text for s in segs).strip(); r=difflib.SequenceMatcher(None,norm(got),norm(SCRIPT[k])).ratio()
    h=160; e=np.sqrt(np.array([ (a[i:i+h]**2).mean() for i in range(0,len(a)-h,h)])+1e-12); pk=e.max()
    head=20*np.log10(e[:3].mean()/pk); tail=20*np.log10(e[-3:].mean()/pk)
    rows.append((k,r,got,head,tail))
    print(f"{k} sim {r:.2f} head {head:.0f}dB tail {tail:.0f}dB | {got}")
