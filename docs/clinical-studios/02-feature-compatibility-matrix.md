# 02 — Feature compatibility matrix

Every row must stay as it is through Loop 1. "Guard" = the existing test that already protects it; "New" = added in Loop 1.

| Feature | URL / entry | Code | Must not change | Guard (existing) | New check in Loop 1 |
|---|---|---|---|---|---|
| Green Atlas (viewer) | `/anatomy/viewer/`, `/anatomy/explore` | `apps/anatomy`, `LibraryViewer.jsx`, `hostProtocol.mjs` | UI, CSS, models, catalogue, Caddy route | `test:anatomy`, `original-viewer-e2e` (16), `test:anatomy-integration` | Screenshot diff of `/anatomy/explore` before/after (PR-D) |
| Anatomy library | `/anatomy`, `/anatomy/library`, `/structure/:id`, `/region/:id`, `/system/:id` | `AnatomyLibrary.jsx`, `registry.mjs` | Routes, registry API | web unit tests | Route smoke (STUDIO-018) |
| Anatomy quiz (Identify / Find) | `/anatomy/study?mode=identify|find` | `study.mjs` | Modes, scoring, `libraryProgress` | `library.test.mjs` | STUDIO-019 browser check |
| Live 4D Lab | `/anatomy/live?scenario=&ws=`, `/anatomy/4d-lab/` | `LiveLab.jsx`, `liveLab.mjs`, `apps/4d-lab` | Deep-link keys, availability check, release path | `liveLab.test.mjs`, `test:4d-lab`, e2e | STUDIO-020 |
| Lab Hub | `/lab` | `LabHub.jsx` | Existing sections, order, links | `labDiscovery.test.mjs` | New section appended only (PR-D) |
| 14 tracks / 60 steps | `/lab/sistem/:track`, `/lab/keterampilan/:track` | `shared/lab-tracks.json`, `labTracks.js` | Track keys, step keys, progress | `labTracks.test.mjs`, `lab-api` (102) | Snapshot of keys (STUDIO-018/022) |
| Lab objects/pathways/modules | `/lab/objek/:slug`, `/lab/jalur/:slug`, `/lab/modul/:key` | `pages/Lab*.jsx`, `lab.pb.js` | All | `lab-api` | Route smoke |
| ECG module | `/lab/ekg` | `LabEcg.jsx`, server gate | Stays closed to students unless `MEDCOEL_LAB_ECG_PUBLIC=1` | `study-api` ECG check | `ecg` studio entry = `blocked`/`review`, never opens the gate |
| Study Planner / Exam Center | `/jadwal`, `/jadwal/:exam/rencana`, `/rencana-belajar` | `study.pb.js`, `studyLib.js` | APIs, `study_plans` | `study-api` (92) | STUDIO-021 rerun |
| Kampusmu / Drilling, Latihan soal, Simulasi Dokter | existing | existing | All | `api.test` (55), `decks-api` | Rerun only |
| Licence quarantine | build/stage guards | `licensing/tools/*` | Policy, hashes, evidence register | `test:licensing` (36) | Scan of `apps/studios/*/dist` added to the distribution check |
| Caddy routes | `/anatomy/viewer/*`, `/anatomy/4d-lab/*` | `deploy/*` | Unchanged | — | STUDIO-030: diff of `deploy/` must be empty in Loop 1 |
