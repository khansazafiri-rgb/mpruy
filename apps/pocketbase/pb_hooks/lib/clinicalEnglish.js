// Editable display paths only. Clinical IDs, answer keys, relevance ratings,
// expressions, dates and score rules are never translation targets.
function parts(data) {
  const out = [];
  const add = (path, value) => { if (typeof value === 'string' && value.trim()) out.push({ path: path, source: value, label: path.join(' / ') }); };
  add(['id'], data.id);
  (data.intro || []).forEach((line, i) => add(['intro', i, 't'], line.t));
  add(['ref'], data.ref);
  Object.keys(data.A || {}).sort().forEach((id) => {
    const answer = data.A[id];
    ['say', 'note', 't', 'title', 'sub', 'rows'].forEach((key) => {
      if (typeof answer[key] === 'string') add(['A', id, key], answer[key]);
    });
  });
  return out;
}
function apply(data, texts) {
  const out = JSON.parse(JSON.stringify(data));
  const list = parts(data);
  if (list.length !== texts.length) throw new Error('Clinical translation shape changed.');
  list.forEach((part, i) => {
    let node = out;
    part.path.slice(0, -1).forEach((key) => { node = node[key]; });
    node[part.path[part.path.length - 1]] = texts[i];
  });
  return out;
}
function validate(data, texts) {
  const errors = [];
  parts(data).forEach((part, i) => {
    if (part.path[part.path.length - 1] !== 'rows' || typeof texts[i] !== 'string') return;
    const source = part.source.split(';'); const translated = texts[i].split(';');
    if (source.length !== translated.length || translated.some((row) => row.split('=').length !== 2)) errors.push('Pertahankan susunan baris kartu hasil: label=nilai;label=nilai.');
  });
  return errors;
}
module.exports = { parts, apply, validate };
