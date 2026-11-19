# Bahasa visual revisi CT–MRI

1080×1920, 30 fps. Motion graphic 2D MEDCOEL dengan Raka kanonik dan helper easing repo. Raka memakai sweater teal harian di setiap kemunculan; tidak dibuat ulang.

Palet: navy #172B38, krem #F7F3E8, mint #CDEFDD, hijau #007060, emas #F8C038. Cyan #55DDEC untuk CT dan ungu muda #C6ABFF untuk MRI. Citra medis tetap grayscale asli dan web/logo tidak dipixelkan.

Font Plus Jakarta Sans asli repo; judul 62–70 px, label 32–42 px, takarir 44–47 px maksimal dua baris. Kartu radius 24–30 px, outline navy 4–5 px, bayangan keras 8–10 px. Panah bulat konsisten; sinar-X garis lurus tipis.

Area aman x54–1026, y120–1720. Citra biasanya y435–1080, anotasi di bawahnya, takarir y1510–1674. Tidak membuka dengan logo. Raka tidak menutupi scan atau web.

CT kiri dan MRI kanan, label modalitas bertahan. Anotasi berganti mengikuti struktur yang sedang diperhatikan. Scan tidak berputar, bergoyang, berubah bentuk, berubah window, atau berubah modalitas. Gerak citra hanya pull-back pembuka dan satu zoom perlahan pada CT.

Scanner menggunakan satu geometri pasien diam pada kedua alat. Diagram aksial merupakan inset konseptual yang terpisah. Jalur CT: sinar-X → detektor → data → irisan. Jalur MRI: magnet → RF → sinyal jaringan → penerima. Proton adalah simbol dalam inset, bukan atom raksasa di kepala.

Gerak karakter mengikuti pose dan ekspresi melalui lerpState/idle; pengarah perhatian dan hasil proses bergerak sesuai audio. Hindari seluruh shot diam sesudah gerak masuk.

Outro: materi5,8s, soal6s, lab CT/USG6,033s dan CTA3,3s pada klip yang sama; web92,6% lebar, laju1×. Label simulasi edukatif bertahan. Tidak ada fitur MRI pada MEDCOEL.
