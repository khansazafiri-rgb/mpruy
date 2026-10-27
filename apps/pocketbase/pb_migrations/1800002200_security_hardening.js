/// <reference path="../pb_data/types.d.ts" />

// IP asli pengunjung di belakang Caddy.
//
// PocketBase hanya mendengar 127.0.0.1:8090 dan semua lalu lintas datang lewat
// Caddy, jadi tanpa trustedProxy setiap permintaan tampak berasal dari
// 127.0.0.1. Akibatnya batas laju per IP (login 20 per 5 menit, pendaftaran 10
// per jam, kode email, dst.) berlaku untuk SELURUH pengunjung sekaligus: saat
// ramai, login dan pendaftaran bisa tertolak untuk semua orang. Allowlist IP
// akun agen dan verifikasi Turnstile juga menerima IP yang salah.
//
// Caddy menimpa X-Forwarded-For dengan IP klien dan port 8090 tidak terbuka ke
// internet, jadi header ini tidak bisa dipalsukan dari luar. Bila suatu saat
// PocketBase dibuka langsung tanpa Caddy, kosongkan lagi pengaturan ini.
migrate((app) => {
  const settings = app.settings();
  settings.trustedProxy.headers = ["X-Forwarded-For"];
  settings.trustedProxy.useLeftmostIP = false;
  app.save(settings);
}, (app) => {
  const settings = app.settings();
  settings.trustedProxy.headers = [];
  app.save(settings);
});
