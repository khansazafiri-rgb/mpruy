/// <reference path="../pb_data/types.d.ts" />

// SKEMA AWAL MEDCOEL
//
// Prinsip yang dipegang (lihat PRD bagian Keamanan):
// - Pendaftaran publik tidak lewat collection users (createRule null). Akun
//   hanya dibuat server di akhir pendaftaran lima langkah, selalu berperan
//   "user".
// - Pengguna hanya bisa membaca dan mengubah data miliknya, dan izin ubah akun
//   dibatasi per field: peran, status aktif, kampus, dan Login ID tidak bisa
//   diubah lewat API.
// - Soal (questions) tertutup total dari API biasa. Semua akses soal lewat
//   endpoint /api/medcoel/* yang menegakkan aturan kampus dan menyembunyikan
//   kunci jawaban sampai soal dijawab.
// - File (PDF, foto bukti) tidak disimpan permanen di server. stored_files
//   hanya mencatat id file Google Drive dan metadatanya.

migrate(
  (app) => {
    const ADMIN = "@request.auth.role = 'admin'";
    const AKTIF = "@request.auth.id != '' && @request.auth.disabled = false";

    const auto = [
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ];

    const buat = (def) => {
      const col = new Collection(def);
      app.save(col);
      return app.findCollectionByNameOrId(def.name);
    };

    // ------------------------------------------------------------------
    // campuses
    // ------------------------------------------------------------------
    const campuses = buat({
      type: "base",
      name: "campuses",
      listRule: "",
      viewRule: "",
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: "name", type: "text", required: true, max: 200 },
        { name: "city", type: "text", max: 100 },
        { name: "kind", type: "select", maxSelect: 1, values: ["ptn", "pts", "kedinasan", "lainnya"] },
        { name: "active", type: "bool" },
        { name: "order", type: "number", onlyInt: true },
        ...auto,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_campuses_name ON campuses (name)"],
    });

    // ------------------------------------------------------------------
    // subjects & chapters
    // ------------------------------------------------------------------
    const subjects = buat({
      type: "base",
      name: "subjects",
      listRule: AKTIF + " && (hidden = false || " + ADMIN + ")",
      viewRule: AKTIF + " && (hidden = false || " + ADMIN + ")",
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: "name", type: "text", required: true, max: 120 },
        { name: "slug", type: "text", required: true, max: 120, pattern: "^[a-z0-9-]+$" },
        { name: "description", type: "text", max: 400 },
        {
          name: "illustrationKey",
          type: "select",
          maxSelect: 1,
          values: [
            "anatomi", "histologi", "fisiologi", "biokimia", "parasitologi", "mikrobiologi",
            "patologi", "farmakologi", "imunologi", "genetika", "umum",
          ],
        },
        {
          name: "illustration",
          type: "file",
          maxSelect: 1,
          maxSize: 2 * 1024 * 1024,
          mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
        },
        { name: "order", type: "number", onlyInt: true },
        { name: "hidden", type: "bool" },
        ...auto,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_subjects_slug ON subjects (slug)"],
    });

    const chapters = buat({
      type: "base",
      name: "chapters",
      listRule: AKTIF + " && ((hidden = false && subject.hidden = false) || " + ADMIN + ")",
      viewRule: AKTIF + " && ((hidden = false && subject.hidden = false) || " + ADMIN + ")",
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: "subject", type: "relation", required: true, maxSelect: 1, collectionId: subjects.id, cascadeDelete: true },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "order", type: "number", onlyInt: true },
        { name: "hidden", type: "bool" },
        ...auto,
      ],
      indexes: ["CREATE INDEX idx_chapters_subject ON chapters (subject, `order`)"],
    });

    // ------------------------------------------------------------------
    // users (collection auth bawaan PocketBase)
    // ------------------------------------------------------------------
    const users = app.findCollectionByNameOrId("users");
    const tambah = (field) => {
      if (!users.fields.getByName(field.name)) users.fields.add(field);
    };
    tambah(new TextField({ name: "loginId", required: true, min: 4, max: 30, pattern: "^[a-z0-9._]+$" }));
    tambah(new TextField({ name: "whatsapp", max: 20 }));
    tambah(new NumberField({ name: "semester", onlyInt: true, min: 0, max: 20 }));
    tambah(new RelationField({ name: "campus", maxSelect: 1, collectionId: campuses.id }));
    tambah(new TextField({ name: "campusOther", max: 200 }));
    tambah(new RelationField({ name: "studyingSubjects", maxSelect: 50, collectionId: subjects.id }));
    tambah(new SelectField({ name: "role", maxSelect: 1, values: ["user", "admin", "agent"] }));
    tambah(new BoolField({ name: "disabled" }));
    tambah(new TextField({ name: "disabledReason", max: 300 }));
    tambah(new DateField({ name: "deletedAt" }));
    tambah(new BoolField({ name: "leaderboardAnonymous" }));
    tambah(new DateField({ name: "campusChangedAt" }));
    tambah(new DateField({ name: "lastActiveAt" }));

    // Field yang TIDAK boleh diubah pemilik akun lewat API.
    const terkunci = [
      "role", "disabled", "disabledReason", "deletedAt", "campus", "campusOther",
      "campusChangedAt", "loginId", "email", "verified", "emailVisibility", "lastActiveAt",
    ];
    const tanpaFieldTerkunci = terkunci.map((f) => "@request.body." + f + ":isset = false").join(" && ");
    users.listRule = "id = @request.auth.id";
    users.viewRule = "id = @request.auth.id";
    users.createRule = null;
    users.updateRule = "id = @request.auth.id && @request.auth.disabled = false && " + tanpaFieldTerkunci;
    users.deleteRule = null;
    // Login ditolak untuk akun nonaktif atau yang sudah dihapus lunak.
    users.authRule = "disabled = false && deletedAt = ''";
    users.manageRule = null;
    users.passwordAuth.enabled = true;
    users.passwordAuth.identityFields = ["email", "loginId"];
    users.indexes = (users.indexes || []).concat([
      "CREATE UNIQUE INDEX idx_users_loginId ON users (loginId)",
      "CREATE INDEX idx_users_campus ON users (campus)",
    ]);
    app.save(users);

    // ------------------------------------------------------------------
    // packages (aturan paket simulasi)
    // ------------------------------------------------------------------
    const packages = buat({
      type: "base",
      name: "packages",
      listRule: AKTIF + " && (active = true || " + ADMIN + ")",
      viewRule: AKTIF + " && (active = true || " + ADMIN + ")",
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: "subject", type: "relation", required: true, maxSelect: 1, collectionId: subjects.id, cascadeDelete: true },
        { name: "name", type: "text", required: true, max: 120 },
        { name: "description", type: "text", max: 400 },
        // Jumlah soal tiap BAB yang tidak punya kuota khusus.
        { name: "perChapter", type: "number", onlyInt: true, min: 0, max: 100 },
        // Batas total soal (100-200 menurut PRD). 0 = tanpa batas.
        { name: "total", type: "number", onlyInt: true, min: 0, max: 500 },
        // [{ chapter: "<id>", count: 5 }]
        { name: "quotas", type: "json", maxSize: 20000 },
        { name: "timerMinutes", type: "number", onlyInt: true, min: 0, max: 600 },
        { name: "active", type: "bool" },
        { name: "order", type: "number", onlyInt: true },
        ...auto,
      ],
    });

    // ------------------------------------------------------------------
    // stored_files (metadata file di Google Drive)
    // ------------------------------------------------------------------
    const storedFiles = buat({
      type: "base",
      name: "stored_files",
      // Admin dan agen boleh membaca metadata dan membuka file lokal (mode
      // pengembangan) lewat token file. Pengguna biasa tidak.
      listRule: "@request.auth.role = 'admin' || @request.auth.role = 'agent'",
      viewRule: "@request.auth.role = 'admin' || @request.auth.role = 'agent'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "kind", type: "select", required: true, maxSelect: 1, values: ["proof_whatsapp", "proof_instagram", "submission_pdf"] },
        { name: "owner", type: "relation", maxSelect: 1, collectionId: users.id },
        { name: "draftId", type: "text", max: 40 },
        { name: "submission", type: "text", max: 40 },
        { name: "storage", type: "select", maxSelect: 1, values: ["drive", "local"] },
        { name: "driveFileId", type: "text", max: 200 },
        // Hanya dipakai saat Google Drive belum diatur (mode pengembangan).
        {
          name: "localFile",
          type: "file",
          maxSelect: 1,
          maxSize: 50 * 1024 * 1024,
          protected: true,
          mimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        },
        { name: "name", type: "text", max: 300 },
        { name: "mime", type: "text", max: 100 },
        { name: "size", type: "number", onlyInt: true },
        { name: "status", type: "select", maxSelect: 1, values: ["pending", "ready", "archived", "deleted"] },
        { name: "uploadKey", type: "text", max: 80, hidden: true },
        ...auto,
      ],
      indexes: [
        "CREATE INDEX idx_stored_files_owner ON stored_files (owner, kind, created)",
        "CREATE INDEX idx_stored_files_submission ON stored_files (submission)",
      ],
    });

    // ------------------------------------------------------------------
    // signup_drafts (pendaftaran sementara, terhapus setelah 24 jam)
    // ------------------------------------------------------------------
    buat({
      type: "base",
      name: "signup_drafts",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "tokenHash", type: "text", required: true, max: 100, hidden: true },
        { name: "loginId", type: "text", max: 30 },
        { name: "email", type: "email" },
        { name: "profile", type: "json", maxSize: 5000 },
        { name: "passwordEnc", type: "text", max: 2000, hidden: true },
        { name: "emailCodeHash", type: "text", max: 100, hidden: true },
        { name: "emailCodeExpires", type: "date" },
        { name: "emailCodeAttempts", type: "number", onlyInt: true },
        { name: "emailCodeSends", type: "number", onlyInt: true },
        { name: "emailVerified", type: "bool" },
        { name: "subjects", type: "json", maxSize: 5000 },
        { name: "proofWhatsapp", type: "text", max: 40 },
        { name: "proofInstagram", type: "text", max: 40 },
        { name: "step", type: "number", onlyInt: true },
        { name: "ip", type: "text", max: 80 },
        { name: "expiresAt", type: "date", required: true },
        ...auto,
      ],
      indexes: ["CREATE INDEX idx_signup_drafts_expires ON signup_drafts (expiresAt)"],
    });

    // ------------------------------------------------------------------
    // community_proofs
    // ------------------------------------------------------------------
    buat({
      type: "base",
      name: "community_proofs",
      listRule: ADMIN,
      viewRule: ADMIN,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: "kind", type: "select", required: true, maxSelect: 1, values: ["whatsapp", "instagram"] },
        { name: "file", type: "relation", maxSelect: 1, collectionId: storedFiles.id },
        ...auto,
      ],
      indexes: ["CREATE INDEX idx_community_proofs_user ON community_proofs (user)"],
    });

    // ------------------------------------------------------------------
    // email_codes (kode reset password)
    // ------------------------------------------------------------------
    buat({
      type: "base",
      name: "email_codes",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "email", type: "text", required: true, max: 200 },
        { name: "purpose", type: "select", required: true, maxSelect: 1, values: ["reset_password", "change_password"] },
        { name: "codeHash", type: "text", required: true, max: 100, hidden: true },
        { name: "expiresAt", type: "date", required: true },
        { name: "used", type: "bool" },
        { name: "attempts", type: "number", onlyInt: true },
        ...auto,
      ],
      indexes: ["CREATE INDEX idx_email_codes_email ON email_codes (email, purpose, created)"],
    });

    // ------------------------------------------------------------------
    // submissions (pengajuan soal lewat Chat Admin)
    // ------------------------------------------------------------------
    const submissions = buat({
      type: "base",
      name: "submissions",
      listRule: "(user = @request.auth.id && @request.auth.disabled = false) || " + ADMIN,
      viewRule: "(user = @request.auth.id && @request.auth.disabled = false) || " + ADMIN,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "code", type: "text", required: true, max: 30 },
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id },
        { name: "subject", type: "relation", required: true, maxSelect: 1, collectionId: subjects.id },
        { name: "hasKey", type: "bool" },
        { name: "language", type: "select", maxSelect: 1, values: ["id", "en", "both"] },
        { name: "scope", type: "select", required: true, maxSelect: 1, values: ["campus", "all"] },
        { name: "campus", type: "relation", maxSelect: 1, collectionId: campuses.id },
        { name: "pdfCount", type: "number", onlyInt: true, min: 0, max: 500 },
        { name: "viaWhatsapp", type: "bool" },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["draft", "menunggu_konfirmasi", "antre", "diproses", "selesai", "perlu_perbaikan", "dibatalkan", "kedaluwarsa"],
        },
        { name: "statusNote", type: "text", max: 1000 },
        { name: "agreement", type: "bool" },
        { name: "submittedAt", type: "date" },
        { name: "confirmedAt", type: "date" },
        { name: "completedAt", type: "date" },
        { name: "importedCount", type: "number", onlyInt: true },
        { name: "createdByAdmin", type: "bool" },
        ...auto,
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_submissions_code ON submissions (code)",
        "CREATE INDEX idx_submissions_status ON submissions (status, confirmedAt)",
        "CREATE INDEX idx_submissions_user ON submissions (user, created)",
      ],
    });

    // ------------------------------------------------------------------
    // questions (tertutup dari API biasa)
    // ------------------------------------------------------------------
    const questions = buat({
      type: "base",
      name: "questions",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "subject", type: "relation", required: true, maxSelect: 1, collectionId: subjects.id },
        { name: "chapter", type: "relation", required: true, maxSelect: 1, collectionId: chapters.id, cascadeDelete: true },
        { name: "qtype", type: "select", required: true, maxSelect: 1, values: ["A", "K", "isian", "esai"] },
        { name: "difficulty", type: "select", required: true, maxSelect: 1, values: ["easy", "medium", "hard"] },
        // Teks soal: string biasa atau daftar blok konten kaya.
        { name: "stem", type: "json", maxSize: 200000 },
        { name: "image", type: "text", max: 1000 },
        // Tipe K: empat pernyataan bernomor.
        { name: "statements", type: "json", maxSize: 50000 },
        // Tipe A/K: [{ label: "A", text, explanation }]
        { name: "options", type: "json", maxSize: 200000 },
        // Huruf kunci untuk tipe A/K.
        { name: "answer", type: "text", max: 5 },
        // Isian/esai: [{ label, question, validAnswers, answerCount, explanation, keyPoints }]
        { name: "subQuestions", type: "json", maxSize: 200000 },
        { name: "explanation", type: "json", maxSize: 400000 },
        { name: "hint", type: "text", max: 3000 },
        { name: "scope", type: "select", required: true, maxSelect: 1, values: ["all", "campus"] },
        { name: "campuses", type: "relation", maxSelect: 999, collectionId: campuses.id },
        { name: "source", type: "select", maxSelect: 1, values: ["admin", "submission", "agent"] },
        { name: "submission", type: "relation", maxSelect: 1, collectionId: submissions.id },
        { name: "status", type: "select", required: true, maxSelect: 1, values: ["published", "draft"] },
        { name: "schemaVersion", type: "number", onlyInt: true },
        { name: "code", type: "text", max: 100 },
        { name: "order", type: "number", onlyInt: true },
        ...auto,
      ],
      indexes: [
        "CREATE INDEX idx_questions_chapter ON questions (chapter, status, difficulty)",
        "CREATE INDEX idx_questions_subject ON questions (subject, status)",
      ],
    });

    // ------------------------------------------------------------------
    // attempts & answers
    // ------------------------------------------------------------------
    const attempts = buat({
      type: "base",
      name: "attempts",
      listRule: "user = @request.auth.id && @request.auth.disabled = false",
      viewRule: "user = @request.auth.id && @request.auth.disabled = false",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: "kind", type: "select", required: true, maxSelect: 1, values: ["practice", "simulation", "package"] },
        { name: "mode", type: "select", required: true, maxSelect: 1, values: ["learning", "exam"] },
        { name: "title", type: "text", max: 300 },
        { name: "subject", type: "relation", maxSelect: 1, collectionId: subjects.id },
        { name: "package", type: "relation", maxSelect: 1, collectionId: packages.id },
        { name: "settings", type: "json", maxSize: 50000 },
        { name: "questionIds", type: "json", maxSize: 50000 },
        { name: "status", type: "select", required: true, maxSelect: 1, values: ["in_progress", "finished"] },
        { name: "score", type: "number" },
        { name: "correctCount", type: "number", onlyInt: true },
        { name: "scoredCount", type: "number", onlyInt: true },
        { name: "breakdown", type: "json", maxSize: 50000 },
        { name: "points", type: "number", onlyInt: true },
        { name: "flagged", type: "bool" },
        { name: "timerMinutes", type: "number", onlyInt: true },
        { name: "startedAt", type: "date" },
        { name: "finishedAt", type: "date" },
        { name: "durationSec", type: "number", onlyInt: true },
        ...auto,
      ],
      indexes: ["CREATE INDEX idx_attempts_user ON attempts (user, status, created)"],
    });

    buat({
      type: "base",
      name: "answers",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: "attempt", type: "relation", required: true, maxSelect: 1, collectionId: attempts.id, cascadeDelete: true },
        { name: "question", type: "relation", required: true, maxSelect: 1, collectionId: questions.id, cascadeDelete: true },
        { name: "subject", type: "relation", maxSelect: 1, collectionId: subjects.id },
        { name: "chapter", type: "relation", maxSelect: 1, collectionId: chapters.id },
        { name: "difficulty", type: "text", max: 10 },
        { name: "qtype", type: "text", max: 10 },
        { name: "response", type: "json", maxSize: 50000 },
        { name: "correct", type: "bool" },
        // false untuk esai (tidak dinilai)
        { name: "scored", type: "bool" },
        // true kalau ini pertama kalinya pengguna menjawab soal ini
        { name: "firstTry", type: "bool" },
        { name: "locked", type: "bool" },
        { name: "points", type: "number", onlyInt: true },
        ...auto,
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_answers_attempt_question ON answers (attempt, question)",
        "CREATE INDEX idx_answers_user_question ON answers (user, question)",
        "CREATE INDEX idx_answers_points ON answers (points, created)",
      ],
    });

    // Aktivitas harian, ada di skema sejak awal (catatan dari web lama).
    buat({
      type: "base",
      name: "daily_activity",
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        // Tanggal kalender WIB, format YYYY-MM-DD.
        { name: "date", type: "text", required: true, max: 10 },
        { name: "answered", type: "number", onlyInt: true },
        { name: "correct", type: "number", onlyInt: true },
        ...auto,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_daily_activity_user_date ON daily_activity (user, date)"],
    });

    // ------------------------------------------------------------------
    // exam_schedules
    // ------------------------------------------------------------------
    buat({
      type: "base",
      name: "exam_schedules",
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      createRule: AKTIF + " && @request.body.user = @request.auth.id && @request.body.remindersSent:isset = false",
      updateRule: "user = @request.auth.id && @request.auth.disabled = false && (@request.body.user:isset = false || @request.body.user = @request.auth.id) && @request.body.remindersSent:isset = false",
      deleteRule: "user = @request.auth.id",
      fields: [
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: "subject", type: "relation", required: true, maxSelect: 1, collectionId: subjects.id },
        { name: "title", type: "text", required: true, max: 120 },
        // Waktu absolut (UTC) dari tanggal + jam + zona yang dipilih.
        { name: "examAt", type: "date", required: true },
        { name: "timezone", type: "select", required: true, maxSelect: 1, values: ["WIB", "WITA", "WIT"] },
        // Hari sebelum ujian untuk pengingat, mis. [7, 3, 1].
        { name: "reminderDays", type: "json", maxSize: 500 },
        { name: "remindersSent", type: "json", maxSize: 500 },
        ...auto,
      ],
      indexes: ["CREATE INDEX idx_exam_schedules_user ON exam_schedules (user, examAt)"],
    });

    // ------------------------------------------------------------------
    // question_reports
    // ------------------------------------------------------------------
    buat({
      type: "base",
      name: "question_reports",
      listRule: "reporter = @request.auth.id || " + ADMIN,
      viewRule: "reporter = @request.auth.id || " + ADMIN,
      createRule: null,
      updateRule: ADMIN + " && @request.body.reporter:isset = false && @request.body.question:isset = false",
      deleteRule: ADMIN,
      fields: [
        { name: "question", type: "relation", required: true, maxSelect: 1, collectionId: questions.id, cascadeDelete: true },
        { name: "reporter", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        {
          name: "reason",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["kunci_salah", "salah_ketik", "gambar_tidak_muncul", "pembahasan_keliru", "lainnya"],
        },
        { name: "note", type: "text", max: 1000 },
        { name: "status", type: "select", required: true, maxSelect: 1, values: ["baru", "ditangani", "selesai"] },
        { name: "adminNote", type: "text", max: 1000 },
        ...auto,
      ],
      indexes: ["CREATE INDEX idx_question_reports_status ON question_reports (status, created)"],
    });

    // ------------------------------------------------------------------
    // announcements
    // ------------------------------------------------------------------
    const announcements = buat({
      type: "base",
      name: "announcements",
      listRule: ADMIN,
      viewRule: ADMIN,
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: "title", type: "text", required: true, max: 200 },
        { name: "body", type: "text", max: 5000 },
        { name: "imageUrl", type: "text", max: 1000 },
        { name: "target", type: "select", required: true, maxSelect: 1, values: ["all", "campuses"] },
        { name: "campuses", type: "relation", maxSelect: 999, collectionId: campuses.id },
        { name: "startAt", type: "date" },
        { name: "endAt", type: "date" },
        { name: "active", type: "bool" },
        { name: "order", type: "number", onlyInt: true },
        ...auto,
      ],
    });

    buat({
      type: "base",
      name: "announcement_dismissals",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "announcement", type: "relation", required: true, maxSelect: 1, collectionId: announcements.id, cascadeDelete: true },
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        ...auto,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_dismissals_unique ON announcement_dismissals (announcement, user)"],
    });

    // ------------------------------------------------------------------
    // notifications
    // ------------------------------------------------------------------
    buat({
      type: "base",
      name: "notifications",
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      createRule: null,
      // Pemilik hanya boleh menandai sudah dibaca.
      updateRule:
        "user = @request.auth.id && @request.body.user:isset = false && @request.body.kind:isset = false && " +
        "@request.body.title:isset = false && @request.body.body:isset = false && @request.body.link:isset = false",
      deleteRule: "user = @request.auth.id",
      fields: [
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: "kind", type: "select", required: true, maxSelect: 1, values: ["submission", "question_live", "report", "exam_reminder", "info"] },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "body", type: "text", max: 2000 },
        { name: "link", type: "text", max: 500 },
        { name: "read", type: "bool" },
        ...auto,
      ],
      indexes: ["CREATE INDEX idx_notifications_user ON notifications (user, read, created)"],
    });

    // ------------------------------------------------------------------
    // campus_changes (riwayat ganti kampus)
    // ------------------------------------------------------------------
    buat({
      type: "base",
      name: "campus_changes",
      listRule: "user = @request.auth.id || " + ADMIN,
      viewRule: "user = @request.auth.id || " + ADMIN,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: "fromCampus", type: "relation", maxSelect: 1, collectionId: campuses.id },
        { name: "toCampus", type: "relation", maxSelect: 1, collectionId: campuses.id },
        { name: "fromOther", type: "text", max: 200 },
        { name: "toOther", type: "text", max: 200 },
        ...auto,
      ],
    });

    // ------------------------------------------------------------------
    // app_settings (satu baris)
    // ------------------------------------------------------------------
    buat({
      type: "base",
      name: "app_settings",
      listRule: ADMIN,
      viewRule: ADMIN,
      createRule: null,
      updateRule: ADMIN,
      deleteRule: null,
      fields: [
        { name: "waCommunityUrl", type: "text", max: 500 },
        { name: "instagramUrl", type: "text", max: 500 },
        { name: "instagramHandle", type: "text", max: 100 },
        { name: "adminWhatsapp", type: "text", max: 30 },
        { name: "dailyCapacity", type: "number", onlyInt: true, min: 1, max: 10000 },
        { name: "submissionsOpen", type: "bool" },
        { name: "confirmDays", type: "number", onlyInt: true, min: 1, max: 60 },
        { name: "maxPdfMb", type: "number", onlyInt: true, min: 1, max: 100 },
        { name: "dailyUploadQuota", type: "number", onlyInt: true, min: 1, max: 200 },
        { name: "expiredFilePolicy", type: "select", maxSelect: 1, values: ["archive", "delete"] },
        { name: "campusChangeDays", type: "number", onlyInt: true, min: 0, max: 3650 },
        { name: "pointsEasy", type: "number", onlyInt: true, min: 0, max: 100 },
        { name: "pointsMedium", type: "number", onlyInt: true, min: 0, max: 100 },
        { name: "pointsHard", type: "number", onlyInt: true, min: 0, max: 100 },
        { name: "simulationTypes", type: "json", maxSize: 200 },
        { name: "requireProofApproval", type: "bool" },
        { name: "reminderDaysDefault", type: "json", maxSize: 200 },
        { name: "privacyPolicy", type: "text", max: 20000 },
        { name: "copyrightPolicy", type: "text", max: 20000 },
        { name: "landingShowUsers", type: "bool" },
        { name: "landingShowSubjects", type: "bool" },
        // Kunci acak untuk mengenkripsi password di pendaftaran sementara bila
        // MEDCOEL_SECRET tidak diatur. Tersembunyi dari API.
        { name: "secret", type: "text", max: 100, hidden: true },
        ...auto,
      ],
    });

    const settingsCol = app.findCollectionByNameOrId("app_settings");
    const s = new Record(settingsCol);
    s.set("dailyCapacity", 40);
    s.set("submissionsOpen", true);
    s.set("confirmDays", 3);
    s.set("maxPdfMb", 20);
    s.set("dailyUploadQuota", 10);
    s.set("expiredFilePolicy", "archive");
    s.set("campusChangeDays", 30);
    s.set("pointsEasy", 1);
    s.set("pointsMedium", 2);
    s.set("pointsHard", 3);
    s.set("simulationTypes", ["A", "K"]);
    s.set("requireProofApproval", false);
    s.set("reminderDaysDefault", [7, 3, 1]);
    s.set("landingShowUsers", true);
    s.set("landingShowSubjects", true);
    s.set("secret", $security.randomString(32));
    app.save(s);
  },
  (app) => {
    const nama = [
      "app_settings", "campus_changes", "notifications", "announcement_dismissals", "announcements",
      "question_reports", "exam_schedules", "daily_activity", "answers", "attempts", "questions",
      "submissions", "email_codes", "community_proofs", "signup_drafts", "stored_files", "packages",
    ];
    for (const n of nama) {
      try { app.delete(app.findCollectionByNameOrId(n)); } catch (_) {}
    }
    const users = app.findCollectionByNameOrId("users");
    for (const f of [
      "loginId", "whatsapp", "semester", "campus", "campusOther", "studyingSubjects", "role", "disabled",
      "disabledReason", "deletedAt", "leaderboardAnonymous", "campusChangedAt", "lastActiveAt",
    ]) {
      users.fields.removeByName(f);
    }
    users.indexes = [];
    app.save(users);
    for (const n of ["chapters", "subjects", "campuses"]) {
      try { app.delete(app.findCollectionByNameOrId(n)); } catch (_) {}
    }
  },
);
