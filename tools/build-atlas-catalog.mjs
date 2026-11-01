// Uses glTF accessor bounds and node transforms: no mesh decoding or estimates
// from a screenshot. Re-run when the supplied model files change.
import fs from "node:fs";
import * as THREE from "three";
import { groupFor, layerFor } from "../src/atlas/catalog.js";
const parts = {};
for (const file of fs
  .readdirSync("public/models")
  .filter((f) => f.endsWith(".glb"))) {
  const buffer = fs.readFileSync("public/models/" + file);
  const gltf = JSON.parse(
    buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString(),
  );
  const objects = gltf.nodes.map((n) => {
    const o = new THREE.Object3D();
    if (n.matrix) o.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));
    else {
      if (n.translation) o.position.fromArray(n.translation);
      if (n.rotation) o.quaternion.fromArray(n.rotation);
      if (n.scale) o.scale.fromArray(n.scale);
    }
    return o;
  });
  gltf.nodes.forEach((n, i) =>
    n.children?.forEach((c) => objects[i].add(objects[c])),
  );
  objects.filter((o) => !o.parent).forEach((o) => o.updateMatrixWorld(true));
  gltf.nodes.forEach((n, i) => {
    const id = n.extras?.za_name;
    if (!id) return;
    const box = new THREE.Box3();
    function walk(k) {
      const nd = gltf.nodes[k];
      if (k !== i && nd.extras?.za_name) return;
      if (nd.mesh !== undefined)
        gltf.meshes[nd.mesh].primitives.forEach((p) => {
          const a = gltf.accessors[p.attributes.POSITION];
          if (a.min && a.max)
            box.union(
              new THREE.Box3(
                new THREE.Vector3().fromArray(a.min),
                new THREE.Vector3().fromArray(a.max),
              ).applyMatrix4(objects[k].matrixWorld),
            );
        });
      nd.children?.forEach(walk);
    }
    walk(i);
    if (box.isEmpty()) return;
    parts[id] = {
      source: file.slice(0, -4),
      box: [...box.min.toArray(), ...box.max.toArray()],
    };
  });
}
const upper =
  /humer|ulna|radius|radial|brachi|axillary|cephalic vein|basilic vein|deltoid|clavicl|scapul|carp|hand|palmar|pollic|teres (major|minor)|supraspinat|infraspinat|subscapular|pronator|supinator|anconeus/;
const lower =
  /femur|femor|tibia|fibula|patella|calcane|talus|tarsal|foot|plantar|halluc|glute|sciatic|saphen|poplite|sartorius|gracilis|pectineus|adductor (longus|brevis|magnus|minimus)|gemellus|piriformis|iliacus|iliopsoas|psoas|obturator|semitendin|semimembran|vastus|gastrocnemius|soleus/;
const back =
  /vertebra|sacrum|coccyx|spinal cord|spinalis|multifid|rotatores|interspinal|intertransvers|longissimus|iliocostalis|splenius|trapezius|rhomboid|latissimus|thoracolumbar|serratus posterior|rectus posterior|obliquus (inferior|superior) capitis/;
for (const [id, p] of Object.entries(parts)) {
  const n = id.toLowerCase();
  const b = p.box;
  const x = Math.abs((b[0] + b[3]) / 2),
    y = (b[1] + b[4]) / 2;
  p.group = groupFor(id, p.source);
  p.layer = layerFor(id, p.group);
  p.regions = [];
  // Explicit anatomical names take priority for limbs. Positional fallback is
  // for unnamed branches and structures such as numbered phalanges.
  const isLower = lower.test(n) && !/vena cava|inferior epigastric/.test(n);
  const isUpper =
    !isLower && (upper.test(n) || (x > 0.175 && y > 0.68 && y < 1.47));
  if (isLower || (!isUpper && b[4] < 0.73)) p.regions.push("lowerLimb");
  if (isUpper) p.regions.push("upperLimb");
  if (!isUpper && !isLower) {
    if (b[4] > 1.38) p.regions.push("headNeck");
    if (b[4] > 1.08 && b[1] < 1.46) p.regions.push("thorax");
    if (b[4] > 0.86 && b[1] < 1.28) p.regions.push("abdomen");
    if (b[4] > 0.7 && b[1] < 1.04) p.regions.push("pelvis");
  }
  // Organ membership follows anatomy rather than vertical overlap with ribs.
  if (p.group === "digestive") {
    p.regions = /oesophagus/.test(n)
      ? ["headNeck", "thorax", "abdomen"]
      : /gingiva|parotid|sublingual|submandibular|palate|tongue|pharynx/.test(n)
        ? ["headNeck"]
        : /sigmoid|rectum|anal/.test(n)
          ? ["abdomen", "pelvis"]
          : ["abdomen"];
  }
  if (p.group === "respiratory")
    p.regions = /nasal|epiglottis/.test(n)
      ? ["headNeck"]
      : /trachea/.test(n)
        ? ["headNeck", "thorax"]
        : ["thorax"];
  if (p.group === "urinary")
    p.regions = /bladder|urethra/.test(n)
      ? ["pelvis"]
      : /ureter/.test(n)
        ? ["abdomen", "pelvis"]
        : ["abdomen"];
  if (p.group === "reproductive") p.regions = ["pelvis"];
  if (p.group === "endocrine")
    p.regions = /suprarenal/.test(n) ? ["abdomen"] : ["headNeck"];
  if (p.group === "heart") p.regions = ["thorax"];
  if (/^(ilium|ischium|pubis|hip bone)/.test(n))
    p.regions = ["pelvis", "lowerLimb"];
  if (back.test(n)) p.regions.push("back");
  if (!p.regions.length)
    p.regions.push(
      y > 1.44
        ? "headNeck"
        : y > 1.08
          ? "thorax"
          : y > 0.99
            ? "abdomen"
            : y > 0.73
              ? "pelvis"
              : "lowerLimb",
    );
}
fs.writeFileSync("public/data/atlas-catalog.json", JSON.stringify(parts));
console.log(`Atlas catalogue: ${Object.keys(parts).length} structures`);
