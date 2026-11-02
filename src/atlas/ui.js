import {loadStructurePreviews,structurePreview,regionPreview} from '../data/previews.js';
import {deselectPart} from '../viewer/selection.js';
import {hostedShareUrl} from "../integration/host.js";
import * as THREE from "three";
import {ghostAllExcept, clearGhost} from "../viewer/visibility.js";
import { state, subscribe } from "../state/store.js";
import { setInert, focusFirst, trapFocus } from "../ui/focus.js";
import { loadAllData, normalise } from "../utils/dataLoader.js";
import { REGIONS, GROUPS, ALIASES } from "./catalog.js";
import {
  settings,
  getStatus,
  canUndo,
  hasIsolation,
  chooseRegion,
  toggleGroup,
  stepGroup,
  preset,
  viewGroup,
  reveal,
  metadata,
  frame,
  counts,
  idsForGroup,
  isolateSelected,
  returnContext,
  hideSelected,
  fadeSelected,
  restoreScene,
  undo,
  shareView,
  visibleBounds,
} from "./engine.js";
const $ = (id) => document.getElementById(id);
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let pending = 0,
  detailGroup = null,
  listLimit = 50,
  searchTicket = 0,
  searchRows = [],
  active = -1;
let moveMode = false;
function announce(message) {
  $("atlasStatus").textContent = message;
}
async function run(fn) {
  pending++;
  update();
  try {
    await fn();
  } catch (e) {
    announce(e.message);
    console.error(e);
  } finally {
    pending--;
    update();
  }
}

// Short labels for the bottom systems bar; the full label stays in the tooltip and the browse panel.
const SHORT = {muscular:"Otot",skeletal:"Tulang",joints:"Sendi",arterial:"Arteri",venous:"Vena",heart:"Jantung",nervous:"Saraf",lymphatic:"Limfatik",respiratory:"Napas",digestive:"Cerna",urinary:"Kemih",reproductive:"Reproduksi",endocrine:"Endokrin"};
const PRESETS = [["muscles","Otot"],["bones","Tulang"],["organs","Organ"],["all","Semua"]];
// Systems bar, like Complete Anatomy: one tile per system, + and − above it step through its layers
// (+ adds the next outer layer back, − peels the outermost visible one), the tile toggles the system.
function renderGroups() {
  $("atlasGroups").innerHTML = GROUPS.map((g) => {
    const value = settings.groups[g.id], count = counts(g.id), loaded = state.loadedSystems.includes(g.source);
    const total = g.layers.length, shown = value.enabled ? total - value.removed : 0;
    const layerName = value.enabled ? g.layers[value.removed] : "Disembunyikan";
    const dots = total > 1 ? `<span class="sys-layers" aria-hidden="true">${g.layers.map((_, i) => `<i class="${i >= total - shown ? "on" : ""}"></i>`).join("")}</span>` : "";
    return `<div class="sys-tile${value.enabled ? " is-on" : ""}${detailGroup === g.id ? " is-browsing" : ""}" style="--group-color:${g.color}">
   <div class="sys-steps"><button type="button" data-step="${g.id}" data-delta="1" aria-label="Tambah lapisan luar ${escape(g.label)}" title="Tambah lapisan luar" ${pending || (value.enabled && value.removed === 0) ? "disabled" : ""}>+</button><button type="button" data-step="${g.id}" data-delta="-1" aria-label="Buka lapisan ${escape(g.label)} lebih dalam" title="Buka ke lapisan lebih dalam" ${pending || !value.enabled ? "disabled" : ""}>−</button></div>
   <button type="button" class="sys-toggle" data-toggle="${g.id}" aria-pressed="${value.enabled}" ${pending ? "disabled" : ""} title="${escape(g.label)} · ${escape(layerName)} · ${count} struktur${loaded ? "" : " · belum dimuat"}"><span class="sys-dot"></span><span class="sys-name">${SHORT[g.id] || escape(g.label)}</span>${dots}</button>
   <button type="button" class="sys-more" data-browse="${g.id}" aria-label="Daftar struktur ${escape(g.label)}" aria-expanded="${detailGroup === g.id}" title="Daftar struktur">⋯</button>
  </div>`;
  }).join("");
  renderPartList();
}
function renderPartList() {
  const panel = $("atlasBrowse");
  if (!panel) return;
  panel.hidden = !detailGroup;
  if (!detailGroup) { panel.innerHTML = ""; return; }
  const group = GROUPS.find((g) => g.id === detailGroup);
  const ids = idsForGroup(detailGroup).sort((a, b) => a.localeCompare(b));
  panel.innerHTML = `<div class="atlas-browse-head" style="--group-color:${group.color}"><span class="sys-dot"></span><strong>${escape(group.label)}</strong><small>${ids.length} struktur di regio ini</small><button type="button" data-browse="${detailGroup}" aria-label="Tutup daftar">×</button></div>
  <button type="button" class="atlas-view-system" data-view-system="${detailGroup}">Lihat seluruh ${escape(group.label)} ↗</button>
  <div id="atlasPartList" class="atlas-parts">${ids.slice(0, listLimit).map((id) => {
    const image = structurePreview(id);
    return `<button type="button" data-part="${escape(id)}">${image ? `<img src="${escape(image)}" alt="" loading="lazy"/>` : "<i></i>"}<span>${escape(state.partsData[id]?.name.en || id)}</span></button>`;
  }).join("") || "<p>Tidak ada struktur di regio ini.</p>"}</div>${ids.length > listLimit ? `<button type="button" class="browse-structures" data-more>Tampilkan 50 lagi (${ids.length - listLimit} tersisa)</button>` : ""}`;
}
function renderRegions() {
  $("regionMenu").innerHTML = `<p class="atlas-region-menu-title">Pilih regio tubuh</p><div class="atlas-region-grid">${REGIONS.map(([id, label, sub]) => {
    const image = regionPreview(id);
    return `<button type="button" data-region="${id}" aria-pressed="${settings.region === id}">${image ? `<img src="${escape(image)}" alt="" loading="lazy"/>` : ""}<span><strong>${escape(label)}</strong><small>${escape(sub)}</small></span></button>`;
  }).join("")}</div>`;
}
function update() {
  if (!$("atlasGroups")) return;
  renderGroups();
  document.querySelectorAll("[data-region]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.region === settings.region));
    b.disabled = !!pending;
  });
  document.querySelectorAll("[data-preset]").forEach((b) => { b.disabled = !!pending; });
  const region = REGIONS.find((r) => r[0] === settings.region);
  $("sceneTitle").textContent = region?.[1] || "Whole body";
  $("sceneSubtitle").textContent = region?.[2] || "";
  const thumb = regionPreview(settings.region);
  $("regionThumb").hidden = !thumb;
  if (thumb && $("regionThumb").getAttribute("src") !== thumb) $("regionThumb").src = thumb;
  $("undoAtlas").disabled = !canUndo() || !!pending;
  $("returnContext").hidden = !hasIsolation();
  $("footerIsolateBtn").disabled = hasIsolation();
  $("atlasStatus").textContent = pending ? getStatus() : getStatus() === "Ready" ? "Siap dijelajahi" : getStatus();
  $("emptyScene").hidden = !visibleBounds().isEmpty() || !!pending;
  $("atlasSelection").textContent = state.selectedPart?.displayName || "Pilih struktur untuk dipelajari";
  $("footerBar").style.display = state.selectedPart ? "flex" : "none";
}
function search(query) {
  const q = normalise(query);
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/);
  const out = [];
  const systemAliases = {heart:['heart','jantung','cor'], respiratory:['respiratory','pernapasan','pernafasan','paru'],digestive:['digestive','pencernaan'],urinary:['urinary','kemih'],nervous:['nervous','saraf'],skeletal:['skeleton','tulang'],muscular:['muscle','muscles','otot'],arterial:['artery','arteries','arteri'],venous:['vein','veins','vena'],lymphatic:['lymphatic','limfatik'],reproductive:['reproductive','reproduksi'],endocrine:['endocrine','endokrin']};
  for (const group of GROUPS) {
    const terms = [normalise(group.label), ...(systemAliases[group.id] || [])];
    if (terms.some(term => term === q || (q.length >= 3 && term.startsWith(q))))
      out.push({id:group.id,label:`${group.label} · Whole system`,group:group.id,system:true,score:200});
  }
  for (const [id, info] of Object.entries(state.partsData)) {
    if (!metadata(id)) continue;
    const n = normalise(info.baseName),
      terms = [n, normalise(info.latinName || "")];
    for (const [key, aliases] of Object.entries(ALIASES))
      if (n.includes(key)) terms.push(...aliases);
    if (metadata(id).group === "heart")
      terms.push("jantung", "heart");
    const groupAliases = {
      muscular: ["otot"],
      skeletal: ["tulang"],
      nervous: ["saraf"],
      arterial: ["arteri", "pembuluh"],
      venous: ["vena", "pembuluh"],
      heart: ["jantung"],
      digestive: ["pencernaan"],
      respiratory: ["pernapasan"],
      urinary: ["kemih"],
      reproductive: ["reproduksi"],
      endocrine: ["endokrin"],
      lymphatic: ["limfatik"],
    };
    terms.push(...(groupAliases[metadata(id).group] || []));
    if (!tokens.every((t) => terms.some((term) => term.includes(t)))) continue;
    const best = terms.some((t) => t === q)
      ? 100
      : terms.some((t) => t.startsWith(q))
        ? 75
        : 40;
    out.push({
      id,
      label: info.name.en,
      group: metadata(id).group,
      score: best - Math.min(n.length / 20, 5),
    });
  }
  return out
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 24);
}
function closeSearch() {
  searchTicket++;
  $("searchResults").classList.remove("show");
  $("searchInput").setAttribute("aria-expanded", "false");
  $("searchInput").removeAttribute("aria-activedescendant");
  active = -1;
}
function showSearch() {
  searchRows = search($("searchInput").value);
  active = -1;
  const panel = $("searchResults");
  panel.classList.add("show");
  $("searchInput").setAttribute("aria-expanded", "true");
  panel.innerHTML = `<div class="search-scope">${searchRows.length ? `${searchRows.length} hasil · semua regio · memilih hasil langsung menampilkannya` : "Semua regio"}</div>${searchRows.map((r, i) => {
    const group = GROUPS.find((g) => g.id === r.group), image = !r.system && structurePreview(r.id);
    const where = r.system ? "Tampilkan seluruh sistem" : `${group.label} · ${REGIONS.find((g) => g[0] === metadata(r.id).regions[0])?.[1] || "Whole body"}`;
    return `<button type="button" role="option" aria-selected="false" id="atlas-result-${i}" class="atlas-result${r.system ? " is-system" : ""}" data-result="${i}" style="--group-color:${group.color}"><span class="atlas-result-thumb">${image ? `<img class="atlas-result-preview" src="${escape(image)}" alt="" decoding="async"/>` : `<i aria-hidden="true"></i>`}</span><span class="atlas-result-text"><span>${escape(r.label)}</span><small><i class="group-dot" aria-hidden="true"></i>${escape(where)}</small></span></button>`;
  }).join("") || '<p class="search-empty">Tidak ada struktur yang cocok. Coba nama Latin, Inggris, atau Indonesia.</p>'}`;
}
async function chooseSearch(index) {
  const row = searchRows[index];
  if (!row) return;
  closeSearch();
  document.querySelector(".header").classList.remove("search-open");
  $("searchOpen").setAttribute("aria-expanded", "false");
  $("searchInput").blur();
  await run(async () => {
    if (row.system) await viewGroup(row.group); else await reveal(row.id);
    announce(`Showing ${row.label}`);
  });
}
function initSearch() {
  const input = $("searchInput"),
    results = $("searchResults");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-label", "Search anatomy across all regions");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", "searchResults");
  results.setAttribute("role", "listbox");
  input.addEventListener("input", () => {
    const ticket = ++searchTicket;
    setTimeout(() => {
      if (ticket !== searchTicket) return;
      if (input.value.trim().length < 2) closeSearch();
      else showSearch();
    }, 120);
  });
  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2) showSearch();
  });
  results.addEventListener("click", (e) => {
    const button = e.target.closest("[data-result]");
    if (button) chooseSearch(Number(button.dataset.result));
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSearch();
      return;
    }
    if (!results.classList.contains("show")) return;
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      if (!searchRows.length) return;
      active =
        (active + (e.key === "ArrowDown" ? 1 : -1) + searchRows.length) %
        searchRows.length;
      results
        .querySelectorAll("[data-result]")
        .forEach((r, i) =>
          r.setAttribute("aria-selected", String(i === active)),
        );
      const row = $("atlas-result-" + active);
      input.setAttribute("aria-activedescendant", row.id);
      row.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      chooseSearch(active < 0 ? 0 : active);
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) closeSearch();
  });
}

function initPanels() {
  const app = $("app");
  // The infobox follows the selection: open while something is selected, closing it deselects.
  function info(on) {
    app.classList.toggle("info-open", on);
    setInert($("infoSidebar"), !on);
    $("infoOpen").setAttribute("aria-expanded", String(on));
  }
  $("infoOpen").onclick = () => info(!app.classList.contains("info-open"));
  // On phones the infobox opens compact (name + actions) so the selected structure stays in view.
  const expand = (on) => { app.classList.toggle("info-expanded", on); $("infoExpand").setAttribute("aria-expanded", String(on)); $("infoExpand").textContent = on ? "Ringkas" : "Detail"; };
  $("infoExpand").onclick = () => expand(!app.classList.contains("info-expanded"));
  subscribe("selectedPart", () => expand(false));
  $("infoToggle").onclick = () => { info(false); deselectPart(); };
  subscribe("selectedPart", (part) => { info(!!part); update(); });
  info(false);
  $("searchOpen").onclick = () => {
    const open = !document.querySelector(".header").classList.contains("search-open");
    document.querySelector(".header").classList.toggle("search-open", open);
    $("searchOpen").setAttribute("aria-expanded", String(open));
    if (open) $("searchInput").focus();
  };
  // Region picker.
  const menu = $("regionMenu"), button = $("regionButton");
  const regionMenu = (open) => { menu.hidden = !open; button.setAttribute("aria-expanded", String(open)); if (open) menu.querySelector('[aria-pressed="true"]')?.focus(); };
  button.onclick = () => regionMenu(menu.hidden);
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-region]");
    if (!b) return;
    regionMenu(false);
    run(() => chooseRegion(b.dataset.region));
  });
  document.addEventListener("click", (e) => { if (!menu.hidden && !e.target.closest(".atlas-region")) regionMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!menu.hidden) { regionMenu(false); button.focus(); }
    else if (detailGroup) { detailGroup = null; renderGroups(); }
  });
  let release;
  $("helpBtn").onclick = () => {
    $("helpModal").classList.remove("hidden");
    setInert($("helpModal"), false);
    release = trapFocus(document.querySelector(".modal-content"), { onEscape: closeHelp, returnFocusTo: $("helpBtn") });
    focusFirst(document.querySelector(".modal-content"));
  };
  function closeHelp() {
    $("helpModal").classList.add("hidden");
    setInert($("helpModal"), true);
    release?.();
  }
  $("helpClose").onclick = closeHelp;
  document.querySelector(".modal-overlay").onclick = closeHelp;
  setInert($("helpModal"), true);
  initTip();
  initBackLink();
}
// Kori's first-visit tip. Shown once per device; never inside a quiz or the annotator.
function initTip() {
  const tip = $("atlasTip"), key = "medcoel.atlas.tip.v1";
  let seen = false;
  try { seen = localStorage.getItem(key) === "1"; } catch { seen = true; }
  const embedded = new URLSearchParams(location.search).get("annotator") === "1";
  if (seen || embedded) return;
  tip.hidden = false;
  const close = () => { tip.hidden = true; try { localStorage.setItem(key, "1"); } catch { /* storage off */ } };
  $("atlasTipClose").onclick = close;
  subscribe("selectedPart", (part) => { if (part) close(); });
}
// The host page says where "back" goes (structure page, library...). Only same-site paths are accepted.
function initBackLink() {
  const params = new URLSearchParams(location.search);
  const back = params.get("back") || "", label = (params.get("backLabel") || "").slice(0, 40);
  if (/^\/(anatomy|lab|beranda)(\/[\w%.\-/]*)?$/.test(back)) $("atlasBack").href = back;
  if (label) $("atlasBackLabel").textContent = label;
}
export async function initUI() {
  await Promise.all([loadAllData(), loadStructurePreviews()]);
  $("systemsList").innerHTML = `<div class="atlas-presets" role="group" aria-label="Tampilan cepat"><span>Cepat</span>${PRESETS.map(([id, label]) => `<button type="button" data-preset="${id}">${label}</button>`).join("")}</div>
 <div id="atlasGroups" class="atlas-groups"></div>
 <div id="atlasBrowse" class="atlas-browse" hidden></div>`;
  renderRegions();
  $("systemsList").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.preset) run(() => preset(b.dataset.preset));
    else if (b.dataset.step) run(() => stepGroup(b.dataset.step, Number(b.dataset.delta)));
    else if (b.dataset.toggle) run(() => toggleGroup(b.dataset.toggle, !settings.groups[b.dataset.toggle].enabled));
    else if (b.dataset.viewSystem) run(() => viewGroup(b.dataset.viewSystem));
    else if (b.dataset.browse) {
      detailGroup = detailGroup === b.dataset.browse ? null : b.dataset.browse;
      listLimit = 50;
      renderGroups();
    } else if (b.hasAttribute("data-more")) {
      listLimit += 50;
      renderPartList();
    } else if (b.dataset.part) run(() => reveal(b.dataset.part));
  });
  $("frontViewBtn").onclick = () => frame(undefined, new THREE.Vector3(0, 0, 1));
  $("backViewBtn").onclick = () => frame(undefined, new THREE.Vector3(0, 0, -1));
  $("sideViewBtn").onclick = () => frame(undefined, new THREE.Vector3(1, 0, 0));
  $("topViewBtn").onclick = () => frame(undefined, new THREE.Vector3(0, 1, 0.001).normalize());
  $("resetBtn").onclick = () => frame();
  $("panAtlas").onclick = () => {
    moveMode = !moveMode;
    const c = state.viewer.controls;
    c.mouseButtons.LEFT = moveMode ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    c.touches.ONE = moveMode ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    $("panAtlas").setAttribute("aria-pressed", String(moveMode));
    $("panAtlas").title = moveMode ? "Mode geser aktif · klik untuk kembali memutar" : "Mode geser (atau Shift + seret)";
    announce(moveMode ? "Mode geser: seret untuk menggeser model" : "Mode putar: seret untuk memutar model");
  };
  $("zoomInAtlas").onclick = () => zoom(0.8);
  $("zoomOutAtlas").onclick = () => zoom(1.25);
  $("undoAtlas").onclick = undo;
  $("restoreAtlas").onclick = restoreScene;
  $("returnContext").onclick = returnContext;
  $("footerFocusBtn").onclick = () => {
    const meta = metadata(state.selectedPart?.id);
    if (!meta) return;
    frame(new THREE.Box3(new THREE.Vector3(...meta.box.slice(0, 3)), new THREE.Vector3(...meta.box.slice(3))));
  };
  let fadedOthers = true;
  $("footerFadeOthersBtn").onclick = () => {
    if (!state.selectedPart) return;
    fadedOthers = !fadedOthers;
    if (fadedOthers) ghostAllExcept(state.selectedPart.id);
    else clearGhost();
    $("footerFadeOthersBtn").setAttribute("aria-pressed", String(fadedOthers));
    $("footerFadeOthersBtn").textContent = fadedOthers ? "Tampilkan lainnya" : "Pudarkan lainnya";
  };
  subscribe("selectedPart", (part) => {
    fadedOthers = !!part;
    $("footerFadeOthersBtn").setAttribute("aria-pressed", String(!!part));
    $("footerFadeOthersBtn").textContent = part ? "Tampilkan lainnya" : "Pudarkan lainnya";
  });
  $("footerIsolateBtn").onclick = isolateSelected;
  $("footerHideBtn").onclick = hideSelected;
  $("footerTransparentBtn").onclick = fadeSelected;
  $("footerShowAllBtn").onclick = restoreScene;
  $("shareAtlas").onclick = async () => {
    try {
      await navigator.clipboard.writeText(hostedShareUrl(shareView()));
      announce("Tautan tampilan disalin");
    } catch {
      const input = $("shareUrl");
      input.hidden = false;
      input.value = hostedShareUrl(shareView());
      input.focus();
      input.select();
      announce("Salin tautan tampilan yang terpilih");
    }
  };
  $("emptyRestore").onclick = restoreScene;
  initPanels();
  initSearch();
  subscribe("atlasChanged", update);
  subscribe("atlasLoading", announce);
  update();
  state.viewer.canvas.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
  });
}
function zoom(scale) {
  const { camera, controls } = state.viewer;
  const delta = camera.position
    .clone()
    .sub(controls.target)
    .multiplyScalar(scale);
  delta.setLength(
    THREE.MathUtils.clamp(
      delta.length(),
      controls.minDistance,
      controls.maxDistance,
    ),
  );
  camera.position.copy(controls.target).add(delta);
  controls.update();
  state.viewer.render();
}
export const selectStructureAnywhere = reveal;
export const systemLabel = (id) => GROUPS.find((g) => g.id === id)?.label || id;
