/// <reference path="../pb_data/types.d.ts" />

// Pengaturan server PocketBase: nama aplikasi, batas laju, dan batas ukuran
// unggahan. Alamat pengirim email dan SMTP diatur di dashboard PocketBase
// (/_/ > Settings > Mail settings) supaya kredensial tidak masuk repositori.

migrate(
  (app) => {
    const settings = app.settings();
    settings.meta.appName = "MEDCOEL";
    if (!settings.meta.appURL || settings.meta.appURL.indexOf("localhost") >= 0) {
      settings.meta.appURL = "https://medcoel.com";
    }
    settings.meta.senderName = "MEDCOEL";
    settings.meta.hideControls = false;

    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      { label: "/api/", audience: "", duration: 60, maxRequests: 600 },
      // Login: tahan tebak password.
      { label: "*:auth", audience: "@guest", duration: 300, maxRequests: 20 },
      // Pendaftaran dan kode email per alamat IP.
      { label: "/api/medcoel/signup/", audience: "@guest", duration: 600, maxRequests: 60 },
      { label: "POST /api/medcoel/signup/start", audience: "@guest", duration: 3600, maxRequests: 10 },
      { label: "POST /api/medcoel/signup/resend", audience: "@guest", duration: 3600, maxRequests: 10 },
      { label: "/api/medcoel/password/", audience: "", duration: 3600, maxRequests: 20 },
      { label: "/api/medcoel/upload/", audience: "", duration: 600, maxRequests: 60 },
      { label: "/api/medcoel/agent/", audience: "", duration: 60, maxRequests: 120 },
      // Endpoint bawaan yang tidak dipakai MEDCOEL ditutup rapat.
      { label: "POST /api/collections/users/request-password-reset", audience: "", duration: 3600, maxRequests: 3 },
      { label: "POST /api/collections/users/request-otp", audience: "", duration: 3600, maxRequests: 3 },
    ];
    app.save(settings);

    // Peringatan "login dari perangkat baru" bawaan PocketBase dimatikan:
    // MEDCOEL sengaja membolehkan satu akun di banyak perangkat.
    const users = app.findCollectionByNameOrId("users");
    users.authAlert.enabled = false;
    // Reset password memakai kode 6 digit dari endpoint MEDCOEL, bukan tautan bawaan.
    users.otp.enabled = false;
    app.save(users);
  },
  () => {},
);
