#!/usr/bin/env bash
# Memeriksa apakah PocketBase di server sudah memuat migrasi dan hook terbaru, tanpa mengubah apa pun.
#   bash deploy/cek-server.sh [folder-repo, bawaan /opt/medcoel]
# Gejala server tertinggal: Simulasi menulis "1 kasus" per poli, Drilling "tidak ditemukan", dan dashboard admin
# menampilkan "Server belum memuat pembaruan terbaru". Produksi memakai --hooksWatch=false, jadi hook dan migrasi baru
# baru terpasang setelah PocketBase di-restart (PocketBase harus restart, bukan hanya web yang di-build ulang).
set -uo pipefail
REPO="${1:-/opt/medcoel}"
echo "== 1. Proses PocketBase yang sedang jalan"
ps -eo pid,etime,args | grep -i '[p]ocketbase' || echo "(tidak ada proses bernama pocketbase)"
echo
echo "== 2. Layanan systemd terkait"
(systemctl list-units --type=service --all --no-pager 2>/dev/null | grep -i -E 'medcoel|pocketbase|pb' ) || echo "(tidak ada)"
echo
echo "== 3. Docker / pm2 (bila dipakai)"
(command -v docker >/dev/null && docker ps --format '{{.Names}}  {{.Image}}  {{.Status}}' 2>/dev/null | grep -i -E 'medcoel|pocketbase') || true
(command -v pm2 >/dev/null && pm2 list 2>/dev/null | grep -i -E 'medcoel|pocketbase') || true
echo
echo "== 4. Migrasi terbaru di KODE (apa yang seharusnya terpasang)"
CODE_LAST=$(ls "$REPO"/apps/pocketbase/pb_migrations 2>/dev/null | sort | tail -1)
echo "${CODE_LAST:-(folder $REPO/apps/pocketbase/pb_migrations tidak ditemukan)}"
echo
echo "== 5. Migrasi terbaru yang SUDAH dijalankan di DATABASE"
DB=$(find "$REPO" /opt /var/lib -maxdepth 6 -name data.db -path '*pb_data*' 2>/dev/null | head -1)
if [ -z "$DB" ]; then echo "(data.db PocketBase tidak ditemukan; beri folder repo yang benar sebagai argumen)"; else
  echo "database: $DB"
  python3 - "$DB" <<'PY'
import sqlite3, sys
con = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
rows = con.execute("select file from _migrations order by file desc limit 3").fetchall()
print("\n".join(r[0] for r in rows) or "(kosong)")
try:
    n = con.execute("select count(*) from sim_cases").fetchone()[0]; print(f"\nJumlah kasus Simulasi di database: {n} (seharusnya 50)")
except Exception as e:
    print("\n(tabel sim_cases tidak terbaca:", e, ")")
PY
fi
echo
echo "== Cara membaca hasilnya"
echo "- Bila migrasi di DATABASE lebih tua dari migrasi di KODE: PocketBase belum di-restart sejak kode diperbarui."
echo "- Restart proses yang tampil di bagian 1/2/3, mis.:  sudo systemctl restart <nama layanan>"
echo "  (docker: docker restart <nama>;  pm2: pm2 restart <nama>). Migrasi baru berjalan otomatis saat PocketBase menyala."
echo "- Bila kode di server sendiri masih lama: git pull di $REPO, build web (npm run build --prefix apps/web), lalu restart."
echo "- Setelah restart, buka web dengan hard refresh (Ctrl+Shift+R); layar awal Simulasi harus menulis 10 kasus per poli."
