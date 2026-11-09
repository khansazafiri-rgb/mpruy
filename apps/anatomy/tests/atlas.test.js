import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  GROUPS,
  initialSettings,
  visibleBySettings,
  groupFor,
  layerFor,
} from "../src/atlas/catalog.js";
const catalog = JSON.parse(
  fs.readFileSync(
    new URL("../public/data/atlas-catalog.json", import.meta.url),
  ),
);
describe("Model-backed atlas catalogue", () => {
  it("maps every supplied structure to a valid study group and finite geometry", () => {
    // 2827 meshes upstream minus 590 withheld by the licence quarantine (data/quarantine.json).
    expect(Object.keys(catalog)).toHaveLength(2237);
    for (const p of Object.values(catalog)) {
      const group = GROUPS.find((g) => g.id === p.group);
      expect(group).toBeDefined();
      expect(p.layer).toBeGreaterThanOrEqual(0);
      expect(p.layer).toBeLessThan(group.layers.length);
      expect(p.box).toHaveLength(6);
      expect(p.box.every(Number.isFinite)).toBe(true);
      expect(p.regions.length).toBeGreaterThan(0);
    }
  });
  it("keeps complete thighs and feet in lower limbs and forearms in upper limbs", () => {
    for (const id of [
      "Femur.l",
      "Femur.r",
      "Tibia.l",
      "Talus.r",
      "Gluteus maximus muscle.l",
    ]) {
      expect(catalog[id].regions).toContain("lowerLimb");
      expect(catalog[id].regions).not.toContain("upperLimb");
    }
    for (const id of ["Ulna.l", "Humerus.r", "Scapula.l", "Clavicle.r"]) {
      expect(catalog[id].regions).toContain("upperLimb");
      expect(catalog[id].regions).not.toContain("thorax");
    }
  });
  it("separates abdominal and pelvic organs from limbs despite matching height", () => {
    expect(catalog.Stomach.regions).toEqual(["abdomen"]);
    expect(catalog.Liver.regions).toEqual(["abdomen"]);
    expect(catalog["Urinary bladder"].regions).toEqual(["pelvis"]);
    expect(catalog["Left ventricle"].regions).toEqual(["thorax"]);
  });
  it("removes fascia first, then platysma, while retaining deeper neck muscles", () => {
    const s = initialSettings();
    s.region = "headNeck";
    s.groups.muscular.enabled = true;
    const fascia = catalog["Superficial investing cervical fascia.l"],
      platysma = catalog["Platysma.l"],
      scm = catalog["Sternocleidomastoid muscle.l"];
    expect(visibleBySettings(fascia, s)).toBe(true);
    s.groups.muscular.removed = 1;
    expect(visibleBySettings(fascia, s)).toBe(false);
    expect(visibleBySettings(platysma, s)).toBe(true);
    s.groups.muscular.removed = 2;
    expect(visibleBySettings(platysma, s)).toBe(false);
    expect(visibleBySettings(scm, s)).toBe(true);
  });
  it("keeps arteries, veins and heart independently switchable in a shared file", () => {
    expect(groupFor("Aortic arch", "cardiovascular")).toBe("arterial");
    expect(groupFor("Deep palmar arch.l", "cardiovascular")).toBe("arterial");
    expect(groupFor("Inferior vena cava", "cardiovascular")).toBe("venous");
    expect(groupFor("Left ventricle", "cardiovascular")).toBe("heart");
    expect(groupFor("Left coronary leaflet", "cardiovascular")).toBe("heart");
    const s = initialSettings();
    s.groups.heart.enabled = true;
    expect(visibleBySettings(catalog["Left ventricle"], s)).toBe(true);
    expect(visibleBySettings(catalog["Aortic arch"], s)).toBe(false);
  });
  it("does not use the glTF parent hierarchy as a dissection depth", () => {
    expect(layerFor("Platysma.l", "muscular")).toBe(1);
    expect(layerFor("Deep part of masseter.l", "muscular")).toBe(3);
  });
});
