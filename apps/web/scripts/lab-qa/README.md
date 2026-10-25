# Lab browser QA

Local-only helpers (they refuse non-local PocketBase hosts):

```bash
# PocketBase on :8090 (with a dev admin + student) and `npm run dev` on :3000
LAB_QA_ADMIN=admin.dev LAB_QA_ADMIN_PW=... node scripts/lab-qa/seed.mjs q1       # creates a published CXR pack + pathway, 3D lessons, and a DRAFT-only dev thorax
LAB_QA_STUDENT=... LAB_QA_STUDENT_PW=... LAB_QA_ADMIN=... LAB_QA_ADMIN_PW=... \
  LAB_QA_OUT=/tmp/lab-qa node scripts/lab-qa/qa.mjs q1 1280 820 390 360 320       # PASS/FAIL per check, screenshots to $LAB_QA_OUT-*.png
```

Use a fresh run id per execution (progress is stored per learner). Seeded records are disposable QA data; never run against production.
