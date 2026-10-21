function serialize(r) { return { id: r.id, text: r.getString("text"), senderRole: r.getString("senderRole"), category: r.getString("category"), created: r.getString("created") }; }
function messages(app, userId, before) {
  let filter = "user = {:user}";
  const params = { user: userId };
  if (before) {
    let cursor;
    try { cursor = app.findRecordById("support_messages", before); } catch (_) { throw new NotFoundError("Pesan tidak ditemukan."); }
    if (cursor.getString("user") !== userId) throw new NotFoundError("Pesan tidak ditemukan.");
    filter += " && (created < {:date} || (created = {:date} && id < {:id}))";
    params.date = cursor.getString("created"); params.id = cursor.id;
  }
  const rows = app.findRecordsByFilter("support_messages", filter, "-created,-id", 51, 0, params);
  const page = rows.slice(0, 50).reverse();
  return { items: page.map(serialize), hasMore: rows.length > 50, nextBefore: page.length ? page[0].id : "" };
}
function send(app, actor, userId, b, admin) {
  const text = String(b.text || "").trim();
  const clientKey = String(b.clientKey || "");
  if (!text || text.length > 4000) throw new BadRequestError("Tulis pesan antara 1 sampai 4.000 karakter.");
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(clientKey)) throw new BadRequestError("Identitas pesan belum valid. Muat ulang lalu coba lagi.");
  const existing = app.findRecordsByFilter("support_messages", "author = {:a} && clientKey = {:k}", "", 1, 0, { a: actor.id, k: clientKey });
  if (existing.length) {
    const r = existing[0];
    if (r.getString("user") !== userId || r.getString("text") !== text) throw new BadRequestError("Pesan ini sudah dipakai. Kirim sebagai pesan baru.");
    return serialize(r);
  }
  const r = new Record(app.findCollectionByNameOrId("support_messages"));
  r.set("user", userId); r.set("author", actor.id); r.set("senderRole", admin ? "admin" : "user"); r.set("text", text); r.set("clientKey", clientKey);
  r.set("category", ["question", "problem", "feedback"].indexOf(b.category) >= 0 ? b.category : "question");
  app.save(r);
  return serialize(r);
}
module.exports = { messages, send };
