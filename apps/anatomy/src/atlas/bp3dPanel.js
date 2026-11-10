// Banner for the optional BodyParts3D preview (?models=bp3d): says what the source covers, offers the translucent skin
// reference and a one-click way back to the Atlas models. Renders nothing unless the source was requested.
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { state } from "../state/store.js";
import { GROUPS } from "./catalog.js";
import { bp3dRequested, bp3dSummary, loadBp3dInventory, loadBp3dSkin } from "../viewer/bp3dSource.js";

const fmt = (n) => new Intl.NumberFormat("id-ID").format(n);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function bp3dNoteForSearch(missed) {
  const s = bp3dSummary();
  if (!bp3dRequested() || s.status !== "ready" || !missed) return "";
  return `<div class="search-unavailable" role="note" data-testid="bp3d-search-note"><strong>Belum ada di BodyParts3D</strong><small>${fmt(missed)} struktur yang cocok tidak termasuk dalam ${fmt(s.structures)} struktur pratinjau ini.</small></div>`;
}

function backToAtlasHref() {
  const url = new URL(globalThis.location.href);
  url.searchParams.delete("models");
  return url.pathname + (url.searchParams.toString() ? "?" + url.searchParams : "") + url.hash;
}

let skinNode = null, skinLoading = false;
async function setSkin(on) {
  if (on && !skinNode && !skinLoading) {
    skinLoading = true;
    try {
      skinNode = await loadBp3dSkin(new GLTFLoader());
      if (skinNode) state.viewer.scene.add(skinNode);
    } catch (error) { console.error("[bp3d] skin reference failed", error); }
    skinLoading = false;
  }
  if (skinNode) skinNode.visible = on;
  state.viewer?.render?.();
}

export async function initBp3dBanner() {
  if (!bp3dRequested()) return;
  const host = document.getElementById("bp3dBanner");
  if (!host) return;
  host.hidden = false;
  host.innerHTML = `<strong>Pratinjau BodyParts3D</strong><span>Memeriksa data lokal…</span>`;
  await loadBp3dInventory();
  const s = bp3dSummary();
  if (s.status !== "ready") {
    host.dataset.state = "unavailable";
    host.innerHTML = `<strong>BodyParts3D tidak tersedia di server ini</strong><span>Memakai model Atlas. Pratinjau lokal: <code>npm run preview:4d-lab</code> setelah <code>npm run batch:bodyparts3d -- --all</code>.</span><a href="${esc(backToAtlasHref())}">Tutup</a>`;
    return;
  }
  const catalogTotal = Object.keys(state.partsData || {}).length || 2237;
  const rows = GROUPS.map((g) => g.source).filter((v, i, a) => a.indexOf(v) === i)
    .map((src) => `${esc(src)} ${fmt(s.perSystem[src] || 0)}`).join(" · ");
  host.dataset.state = "ready";
  host.innerHTML = `<strong>Pratinjau BodyParts3D</strong>
    <span>${fmt(s.structures)} dari ${fmt(catalogTotal)} struktur · <b>belum lengkap</b>, bukan CT/USG${s.systems ? " · sistem: " + esc(s.systems.join(", ")) : ""}</span>
    <label><input id="bp3dSkin" type="checkbox" data-testid="bp3d-skin"> Kulit referensi</label>
    <details><summary>Cakupan</summary><p>${rows}</p></details>
    <a href="${esc(backToAtlasHref())}" data-testid="bp3d-back">Kembali ke model Atlas</a>`;
  host.querySelector("#bp3dSkin").addEventListener("change", (e) => setSkin(e.target.checked));
}
