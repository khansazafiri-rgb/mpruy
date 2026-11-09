import { it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { GROUPS } from "../src/atlas/catalog.js";
import { QUARANTINED_SOURCES, UNAVAILABLE_GROUPS, unavailableMatches, loadUnavailable } from "../src/atlas/availability.js";
import { normalise } from "../src/utils/dataLoader.js";

const pub = new URL("../public/", import.meta.url);
const policyUrl = new URL("../../../licensing/quarantine-policy.json", import.meta.url);
const read = (rel) => JSON.parse(readFileSync(new URL(rel, pub)));

it("quarantined sources match the monorepo licensing policy and are never study groups", () => {
  if (existsSync(policyUrl)) {
    const policy = JSON.parse(readFileSync(policyUrl));
    expect([...QUARANTINED_SOURCES].sort()).toEqual(Object.keys(policy.quarantinedSystems).sort());
  }
  for (const s of QUARANTINED_SOURCES) {
    expect(GROUPS.some((g) => g.source === s)).toBe(false);
    expect(UNAVAILABLE_GROUPS.some((g) => g.source === s)).toBe(true);
    expect(existsSync(new URL(`models/${s}.glb`, pub))).toBe(false);
  }
});

it("withheld structures are absent from catalogue, systems and previews but listed by name", () => {
  const q = read("data/quarantine.json"), catalog = read("data/atlas-catalog.json"), systems = read("data/systems.json"), thumbs = read("data/structure-thumbnails.json");
  expect(q.structures.length).toBeGreaterThan(0);
  const listed = new Set(Object.values(systems).flat());
  for (const { id } of q.structures) {
    expect(catalog[id]).toBeUndefined();
    expect(listed.has(id)).toBe(false);
    expect(thumbs.structures[id]).toBeUndefined();
  }
  for (const s of ["Kidney.l", "Kidney.r", "Renal pelvis.l", "Renal pelvis.r", "Incus.l", "Malleus.r", "Stapes.l", "Cochlea.l", "White matter of telencephalon.l"])
    expect(q.structures.some((x) => x.id === s)).toBe(true);
  expect(systems.nervous).toEqual([]);
  expect(thumbs.systems.nervous).toBeUndefined();
  expect(thumbs.systems.visceral).toBeUndefined();
  expect(thumbs.models.nervous).toBeUndefined();
});

it("search explains withheld anatomy instead of fabricating or silently omitting it", async () => {
  await loadUnavailable(async () => read("data/quarantine.json"));
  expect(unavailableMatches("cochlea", normalise).some((r) => /cochlea/i.test(r.label))).toBe(true);
  expect(unavailableMatches("ginjal", normalise).some((r) => r.topic)).toBe(true);
  expect(unavailableMatches("otak", normalise).some((r) => r.topic)).toBe(true);
  expect(unavailableMatches("femur", normalise)).toEqual([]);
});
