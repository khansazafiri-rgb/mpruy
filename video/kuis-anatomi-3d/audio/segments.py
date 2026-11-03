# Teks narasi final (hasil pengenalan suara Whisper pada audio asli, dikoreksi ejaan istilah), dibagi menjadi frasa takarir.
# Tiap entri: (awal, akhir) ucapan menurut jeda audio, daftar frasa takarir. Titik potong antar-frasa dicari oleh align_breaks.py.
CAPS = [
 (0.08, 2.35, ["Semalaman menghafalin atlas anatomi."]),
 (2.81, 4.83, ["Tapi begitu berdiri di depan kadaver,"]),
 (5.15, 7.67, ["semua nama yang kamu hafal", "mendadak menghilang."]),
 (8.16, 21.64, ["Coba uji ingatanmu di kuis anatomi 3D MEDCOEL.", "Pilih bagian tubuh,", "pilih sistemnya,", "lalu tentukan cara kamu mau latihan.", "Di mode Kenali Struktur,", "satu bagian akan disorot pada model 3D.", "Tugasmu: pilih nama yang benar."]),
 (21.95, 49.39, ["Mau tantangan sebaliknya?", "Di mode Temukan di 3D,", "namanya sudah diberikan.", "Sekarang, cari dan klik strukturnya", "langsung pada model.", "Kamu juga bisa menebak sistem", "dan regio dari struktur yang ditampilkan.", "Salah jawab, tenang!", "Jawaban yang benar akan ditampilkan,", "jadi kamu bisa belajar", "dan lanjut ke soal berikutnya.", "Sebelum bilang \"aku udah hafal\",", "coba buktikan dulu di sini.", "Latihan anatomi gratis di MEDCOEL.", "Buka medcoel.com dan mulai kuisnya."]),
]
