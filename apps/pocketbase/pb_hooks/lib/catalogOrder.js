// User selections are pinned first. Alphabetic order is independent of admin order.
function byName(a, b) {
  return String(a.name || a.title || '').trim().toLowerCase().localeCompare(String(b.name || b.title || '').trim().toLowerCase());
}
function byPreference(a, b) {
  return Number(!!b.studying) - Number(!!a.studying) || byName(a, b);
}
module.exports = { byName, byPreference };
