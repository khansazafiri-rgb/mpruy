/// <reference path="../pb_data/types.d.ts" />

// STATUS TUTORIAL
// POST /api/medcoel/me/tutorial { key: "fk" | "dokter", status: "done" | "skipped" }
// "done" tidak pernah diturunkan menjadi "skipped".
routerAdd("POST", "/api/medcoel/me/tutorial", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  const KEYS = ["fk", "dokter"];
  const STATUS = ["done", "skipped"];
  const key = String(b.key || "");
  const status = String(b.status || "");
  if (KEYS.indexOf(key) < 0) throw new BadRequestError("Tutorial tidak dikenal.");
  if (STATUS.indexOf(status) < 0) throw new BadRequestError("Status tutorial tidak dikenal.");
  const rec = e.app.findRecordById("users", user.id);
  const cur = u.tutorialsOf(rec);
  if (!(cur[key] === "done" && status === "skipped")) cur[key] = status;
  rec.set("tutorials", cur);
  e.app.saveNoValidate(rec);
  return e.json(200, { tutorials: cur });
});
