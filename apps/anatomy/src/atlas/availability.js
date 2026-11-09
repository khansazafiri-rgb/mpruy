// Licence quarantine for the public Atlas build (see licensing/quarantine-policy.json in the
// MEDCOEL monorepo). Quarantined systems are never requested from the server and quarantined
// structures are absent from the shipped catalogue; the UI says so instead of hiding the gap or
// substituting other anatomy. tests/availability.test.js keeps this in sync with the policy.
export const QUARANTINED_SOURCES = Object.freeze(["nervous"]);
export const UNAVAILABLE_GROUPS = Object.freeze([
  { id: "nervous", label: "Saraf & indra", short: "Saraf", color: "#e4c875", source: "nervous" },
]);
export const UNAVAILABLE_MESSAGE =
  "Tidak tersedia sementara: sedang ditinjau lisensinya. MEDCOEL tidak menggantinya dengan model buatan.";

export const isQuarantinedSource = (source) => QUARANTINED_SOURCES.includes(source);

// Indonesian/English topic words that should explain the gap rather than return "no result".
export const UNAVAILABLE_TOPICS = Object.freeze([
  { terms: ["saraf", "nervous", "nerve", "otak", "brain", "serebrum", "cerebrum", "serebelum", "cerebellum", "batang otak", "medula spinalis", "sumsum tulang belakang", "spinal cord", "mata", "eye", "telinga", "ear", "koklea", "cochlea"],
    label: "Sistem saraf & indra (otak, medula spinalis, saraf, mata, telinga dalam)" },
  { terms: ["ginjal", "kidney", "renal", "pelvis renalis"], label: "Ginjal dan pelvis renalis" },
  { terms: ["osikel", "ossicle", "tulang pendengaran", "maleus", "malleus", "inkus", "incus", "stapes"], label: "Tulang-tulang pendengaran (maleus, inkus, stapes)" },
]);

let unavailable = [];
/** Load the public, name-only list of withheld structures (data/quarantine.json). */
export async function loadUnavailable(fetchJson) {
  try {
    const data = await fetchJson("data/quarantine.json");
    unavailable = Array.isArray(data?.structures)
      ? data.structures.filter((s) => typeof s?.id === "string").map((s) => ({ id: s.id, system: s.system || null }))
      : [];
  } catch {
    unavailable = [];
  }
  return unavailable;
}
export const unavailableStructures = () => unavailable;

/** Withheld structures whose name matches every token of the (already normalised) query. */
export function unavailableMatches(query, normalise, limit = 5) {
  const q = normalise(query);
  if (q.length < 3) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const seen = new Set(), out = [];
  for (const topic of UNAVAILABLE_TOPICS)
    if (topic.terms.some((t) => t === q || (q.length >= 4 && (t.startsWith(q) || q.includes(t)))))
      out.push({ id: "topic:" + topic.label, label: topic.label, system: null, topic: true });
  for (const s of unavailable) {
    const base = s.id.replace(/\.[lr]$/, "").replace(/^\((.*)\)$/, "$1").trim();
    const key = normalise(base);
    if (seen.has(key) || !tokens.every((t) => key.includes(t))) continue;
    seen.add(key);
    out.push({ id: s.id, label: base, system: s.system });
    if (out.length >= limit) break;
  }
  return out;
}
