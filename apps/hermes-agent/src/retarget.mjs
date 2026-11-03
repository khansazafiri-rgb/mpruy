// Ubah tujuan pengajuan lewat Telegram: jenis isi PDF (soal / PPT materi) dan/atau mata kuliahnya.
//
//   /jenis KODE materi|soal                 jenis isi saja, mata kuliah tetap
//   /matkul KODE NAMA MATA KULIAH           mata kuliah saja, jenis isi tetap
//   /pindah KODE materi|soal NAMA MATKUL    jenis isi dan mata kuliah sekaligus
//   /matkul [kata]                          daftar nama mata kuliah (boleh disaring)
//
// KODE boleh lebih dari satu (mis. /jenis MC261024-ABCD MC261025-EFGH materi). Yang bekerja adalah endpoint
// agen POST /api/medcoel/agent/submissions/{id}/retarget; kampus, cakupan, bahasa, berkas, dan status tidak berubah.
import { escapeHtml } from './telegram.mjs';
import { kindName, howToSubmit, statusLabel } from './notify.mjs';

export const MAX_CODES = 20;
const CODE_RE = /^MC\d{6}-[A-Z0-9]{4}$/i;
const COMMAND_RE = /^\/(jenis|matkul|pindah)(?:@[A-Za-z0-9_]+)?(?=\s|$)([\s\S]*)$/i;
const KIND_WORDS = { materi: 'materi', ppt: 'materi', slide: 'materi', slides: 'materi', soal: 'soal' };
const LIST_LIMIT = 3500;

export function parseKind(word) {
  return KIND_WORDS[String(word || '').toLowerCase()] || '';
}

function splitCodes(tokens) {
  const codes = [];
  let i = 0;
  while (i < tokens.length && CODE_RE.test(tokens[i])) codes.push(tokens[i++].toUpperCase());
  return { codes: [...new Set(codes)], rest: tokens.slice(i) };
}

function cleanName(words) {
  return words.join(' ').replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '').trim();
}

// null = bukan perintah ini. Selain itu { cmd, codes, contentKind?, subject?, list?, query? } atau { error } (HTML).
export function parseRetargetCommand(text) {
  const m = String(text || '').trim().match(COMMAND_RE);
  if (!m) return null;
  const cmd = m[1].toLowerCase();
  const tokens = m[2].trim().split(/\s+/).filter(Boolean);
  let { codes, rest } = splitCodes(tokens);

  if (cmd === 'matkul' && !codes.length) return { cmd, list: true, query: cleanName(tokens) };

  // /jenis dan /pindah menerima id internal juga: tanpa format MC, kata pertama dianggap kode.
  if (!codes.length && tokens.length) { codes = [tokens[0]]; rest = tokens.slice(1); }
  if (!codes.length) {
    return { error: usageFor(cmd, 'Kode pengajuan belum ditulis.') };
  }
  if (codes.length > MAX_CODES) return { error: `Satu perintah paling banyak ${MAX_CODES} kode pengajuan.` };

  if (cmd === 'jenis') {
    const kind = rest.length === 1 ? parseKind(rest[0]) : '';
    if (!kind) return { error: usageFor(cmd, 'Jenis isi harus <b>materi</b> atau <b>soal</b>.') };
    return { cmd, codes, contentKind: kind };
  }
  if (cmd === 'matkul') {
    const subject = cleanName(rest);
    if (!subject) return { error: usageFor(cmd, 'Nama mata kuliah belum ditulis. Kirim <code>/matkul</code> untuk melihat daftarnya.') };
    return { cmd, codes, subject };
  }
  // pindah
  const kind = parseKind(rest[0]);
  if (!kind) return { error: usageFor(cmd, 'Setelah kode harus ada jenis isi: <b>materi</b> atau <b>soal</b>. Kalau hanya mau ganti mata kuliah, pakai <code>/matkul KODE NAMA</code>.') };
  const subject = cleanName(rest.slice(1));
  if (!subject) return { error: usageFor(cmd, 'Nama mata kuliah belum ditulis. Kalau hanya mau ganti jenis isi, pakai <code>/jenis KODE materi</code>.') };
  return { cmd, codes, contentKind: kind, subject };
}

function usageFor(cmd, why) {
  const usage = {
    jenis: '<code>/jenis KODE materi</code> atau <code>/jenis KODE soal</code>',
    matkul: '<code>/matkul KODE NAMA MATA KULIAH</code>',
    pindah: '<code>/pindah KODE materi NAMA MATA KULIAH</code> (atau <code>soal</code>)',
  }[cmd];
  return `❌ ${why}\nFormat: ${usage}`;
}

export class RetargetFlow {
  constructor({ medcoel, telegram, importPlans }) {
    this.medcoel = medcoel;
    this.telegram = telegram;
    this.importPlans = importPlans;
  }

  helpText() {
    return [
      '<b>Ubah tujuan pengajuan (jenis isi / mata kuliah)</b>',
      'Pakai kalau pengaju salah pilih, mis. PDF PPT materi tercatat sebagai soal, atau mata kuliahnya keliru. <b>Yang tidak kamu sebut tidak berubah</b>; kampus, cakupan, bahasa, berkas PDF, dan status tetap.',
      '<code>/jenis KODE materi</code> — isi PDF jadi 📚 PPT materi. Mata kuliah tetap.',
      '<code>/jenis KODE soal</code> — isi PDF jadi 📝 soal. Mata kuliah tetap.',
      '<code>/matkul KODE NAMA MATA KULIAH</code> — ganti mata kuliah saja. Jenis isi tetap. Contoh: <code>/matkul MC261024-ABCD Ilmu Penyakit Dalam</code>',
      '<code>/pindah KODE materi NAMA MATA KULIAH</code> — ganti jenis isi <b>dan</b> mata kuliah sekaligus (<code>soal</code> atau <code>materi</code>). Contoh: <code>/pindah MC261024-ABCD soal Anatomi</code>',
      '<code>/matkul</code> — daftar nama mata kuliah; <code>/matkul bedah</code> — hanya yang namanya memuat "bedah".',
      'KODE boleh beberapa sekaligus: <code>/jenis MC261024-ABCD MC261025-EFGH materi</code>.',
      'Nama mata kuliah tidak peka huruf besar-kecil dan boleh sebagian, asal cocok ke satu mata kuliah; kalau cocok ke beberapa, Hermes menyebut kandidatnya dan tidak mengubah apa pun.',
      'Hanya untuk pengajuan yang belum diimpor: Menunggu konfirmasi, Antre, Diproses, Perlu perbaikan. Yang sudah Selesai atau dibatalkan ditolak.',
      'Setelah diubah, rencana impor lama pengajuan itu (dari <code>/put</code>) dibatalkan. Kirim JSON lagi dengan <code>/put KODE</code> sesuai jenis baru (JSON slide untuk materi, JSON soal untuk soal).',
      'Salah ubah? Kirim perintah yang sama dengan nilai semula.',
    ].join('\n');
  }

  async handleMessage(msg, text) {
    if (msg.document) return false;
    const parsed = parseRetargetCommand(text);
    if (!parsed) return false;
    const chatId = msg.chat.id;
    if (parsed.error) {
      await this.telegram.sendMessage(chatId, parsed.error);
      return true;
    }
    if (parsed.list) {
      await this.showSubjects(chatId, parsed.query);
      return true;
    }
    const results = [];
    for (const code of parsed.codes) results.push(await this.applyOne(code, parsed));
    await this.telegram.sendMessage(chatId, results.length === 1 ? results[0].detail : summaryOf(results));
    return true;
  }

  async showSubjects(chatId, query) {
    const all = await this.medcoel.listSubjects();
    const q = String(query || '').toLowerCase();
    const items = q ? all.filter((s) => `${s.name} ${s.slug}`.toLowerCase().includes(q)) : all;
    if (!items.length) {
      return this.telegram.sendMessage(chatId, q
        ? `Tidak ada mata kuliah yang namanya memuat "${escapeHtml(query)}". Kirim <code>/matkul</code> untuk daftar lengkap.`
        : 'Daftar mata kuliah kosong.');
    }
    const head = q ? `<b>Mata kuliah memuat "${escapeHtml(query)}" (${items.length})</b>` : `<b>Mata kuliah (${items.length})</b>`;
    const tail = '\n\nPakai namanya di <code>/matkul KODE NAMA</code> atau <code>/pindah KODE materi NAMA</code>.';
    const parts = [];
    let current = head;
    for (const s of items) {
      const line = `\n• ${escapeHtml(s.name)}`;
      if (current.length + line.length > LIST_LIMIT) { parts.push(current); current = '<b>Mata kuliah (lanjutan)</b>'; }
      current += line;
    }
    parts.push(current + tail);
    for (const part of parts) await this.telegram.sendMessage(chatId, part);
  }

  // Satu pengajuan. Mengembalikan { ok, changed, code, line, detail } dan tidak melempar untuk galat yang
  // dijelaskan server (400/403/404), supaya perintah dengan banyak kode tetap jalan untuk kode lainnya.
  async applyOne(code, parsed) {
    let res;
    try {
      res = await this.medcoel.retargetSubmission(code, { contentKind: parsed.contentKind, subject: parsed.subject });
    } catch (err) {
      const msg = err?.body?.message;
      if ([400, 403, 404].includes(err?.status) && msg) {
        const text = `${escapeHtml(msg)}`;
        return { ok: false, changed: false, code, line: `❌ <b>${escapeHtml(code)}</b>: ${text}`, detail: `❌ <b>${escapeHtml(code)}</b>\n${text}` };
      }
      throw err;
    }
    const r = res.retarget || {};
    const shownCode = res.code || code;
    const kindLine = describeKind(r.contentKind, parsed.contentKind);
    const subjectLine = describeSubject(r.subject, parsed.subject);

    if (!r.changed) {
      const same = [parsed.contentKind ? `jenis isi sudah ${kindName(res.contentKind)}` : '', parsed.subject ? `mata kuliah sudah ${escapeHtml(res.subject?.name || '-')}` : ''].filter(Boolean).join(' dan ');
      return { ok: true, changed: false, code: shownCode, line: `ℹ️ <b>${escapeHtml(shownCode)}</b>: ${same} (tidak ada yang berubah)`, detail: `ℹ️ Tidak ada perubahan untuk <b>${escapeHtml(shownCode)}</b>: ${same}.` };
    }

    const dropped = await this.importPlans.dropPlansForSubmission(res.id, shownCode);
    const droppedNote = dropped
      ? `\n⚠️ ${dropped} rencana impor lama untuk pengajuan ini dibatalkan. Kirim JSON lagi dengan <code>/put ${escapeHtml(shownCode)}</code>.`
      : '';
    const detail = [
      '✏️ <b>Tujuan pengajuan diubah</b>',
      `<b>${escapeHtml(shownCode)}</b> · ${escapeHtml(statusLabel(res.status))}`,
      kindLine.long,
      subjectLine.long,
      'Kampus, cakupan, bahasa, berkas PDF, dan status: tidak berubah.',
    ].filter(Boolean).join('\n') + droppedNote + '\n\n' + howToSubmit(shownCode, res.status, res.contentKind === 'materi' ? 'materi' : 'soal', Number(res.pdfCount || (res.files || []).length));
    const bits = [r.contentKind?.from !== r.contentKind?.to ? kindLine.short : '', r.subject?.from?.id !== r.subject?.to?.id ? subjectLine.short : ''].filter(Boolean).join(' · ');
    return { ok: true, changed: true, code: shownCode, line: `✅ <b>${escapeHtml(shownCode)}</b>: ${bits}`, detail };
  }
}

function describeKind(kind, asked) {
  if (!kind) return { long: '', short: '' };
  if (kind.from === kind.to) {
    return { long: `Jenis isi: ${kindName(kind.to)} <i>(${asked ? 'sudah begitu' : 'tidak berubah'})</i>`, short: '' };
  }
  return { long: `Jenis isi: ${kindName(kind.from)} → <b>${kindName(kind.to)}</b>`, short: `${kindName(kind.from)} → ${kindName(kind.to)}` };
}

function describeSubject(subject, asked) {
  if (!subject) return { long: '', short: '' };
  const from = escapeHtml(subject.from?.name || '-');
  const to = escapeHtml(subject.to?.name || '-');
  if (subject.from?.id === subject.to?.id) {
    return { long: `Mata kuliah: ${to} <i>(${asked ? 'sudah begitu' : 'tidak berubah'})</i>`, short: '' };
  }
  return { long: `Mata kuliah: ${from} → <b>${to}</b>`, short: `${from} → ${to}` };
}

function summaryOf(results) {
  const changed = results.filter((r) => r.changed).length;
  const failed = results.filter((r) => !r.ok).length;
  const head = `✏️ <b>Tujuan diubah untuk ${results.length} pengajuan</b> · ${changed} berubah${failed ? `, ${failed} gagal` : ''}`;
  const tip = changed ? '\n\nLanjutkan tiap pengajuan dengan <code>/put KODE</code> dan JSON sesuai jenis barunya.' : '';
  return `${head}\n\n${results.map((r) => r.line).join('\n')}${tip}`;
}
