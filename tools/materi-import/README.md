# materi-import

Mengubah dokumen "Catatan Belajar Lengkap" (.docx dari Google Docs/Word) menjadi catatan materi per BAB
untuk fitur **Belajar materi**. Penjelasan lengkap, format keluaran, dan cara memasukkannya ke server ada di
[docs/CATATAN_MATERI.md](../../docs/CATATAN_MATERI.md).

```bash
pip install python-docx
python3 tools/materi-import/docx_to_materi.py "Anatomi - Catatan Belajar.docx" --subject anatomi --subject-name Anatomi --report
```

Keluaran ditulis ke `apps/pocketbase/content/materi/` (satu `.md` per BAB + `index.json`). Jalankan ulang kapan saja;
hasilnya selalu sama untuk dokumen yang sama, jadi perubahan di dokumen terlihat sebagai diff di git.
