import {loadStructurePreviews,structurePreview} from '../data/previews.js';
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
function renderGroups() {
  $("atlasGroups").innerHTML = GROUPS.map((g) => {
    const value = settings.groups[g.id],
      count = counts(g.id),
      loaded = state.loadedSystems.includes(g.source);
    return `<section class="atlas-group" style="--group-color:${g.color}">
   <div class="atlas-compact-row"><label class="atlas-group-label"><input type="checkbox" data-toggle="${g.id}" ${value.enabled ? "checked" : ""} ${pending ? "disabled" : ""}><span class="group-dot"></span><strong title="${g.label} · ${value.enabled ? g.layers[value.removed] : "Hidden"} · ${count} structures${loaded ? "" : " · not loaded"}">${g.label}</strong></label><button type="button" data-step="${g.id}" data-delta="-1" aria-label="Remove outer layer of ${g.label}" ${pending || !value.enabled ? "disabled" : ""}>−</button><button type="button" data-step="${g.id}" data-delta="1" aria-label="Add outer layer of ${g.label}" ${pending || (value.enabled && value.removed === 0) ? "disabled" : ""}>+</button><button type="button" data-browse="${g.id}" aria-label="Browse ${g.label}" aria-expanded="${detailGroup === g.id}">⋯</button></div>
   ${detailGroup === g.id ? '<div id="atlasPartList"></div>' : ""}
  </section>`;
  }).join("");
  if (detailGroup) renderPartList();
}
function renderPartList() {
  const container = $("atlasPartList");
  if (!container) return;
  const ids = idsForGroup(detailGroup).sort((a, b) => a.localeCompare(b));
  container.innerHTML = `<button type="button" class="atlas-view-system" data-view-system="${detailGroup}">View whole ${escape(GROUPS.find(g => g.id === detailGroup).label)} ↗</button><div class="atlas-parts">${
    ids
      .slice(0, listLimit)
      .map(
        (id) =>
          `<button type="button" data-part="${escape(id)}">${escape(state.partsData[id]?.name.en || id)}</button>`,
      )
      .join("") || "<p>No structures in this region.</p>"
  }</div>${ids.length > listLimit ? `<button type="button" class="browse-structures" data-more>Show 50 more (${ids.length - listLimit} remaining)</button>` : ""}`;
}
function update() {
  if (!$("atlasGroups")) return;
  renderGroups();
  document.querySelectorAll("[data-region]").forEach((b) => {
    b.setAttribute(
      "aria-pressed",
      String(b.dataset.region === settings.region),
    );
    b.disabled = !!pending;
  });
  document.querySelectorAll("[data-preset]").forEach((b) => {
    b.disabled = !!pending;
  });
  $("sceneTitle").textContent =
    REGIONS.find((r) => r[0] === settings.region)?.[1] || "Whole body";
  $("sceneSubtitle").textContent =
    REGIONS.find((r) => r[0] === settings.region)?.[2] || "";
  $("undoAtlas").disabled = !canUndo() || !!pending;
  $("returnContext").hidden = !hasIsolation();
  $("footerIsolateBtn").disabled = hasIsolation();
  $("atlasStatus").textContent = pending
    ? getStatus()
    : getStatus() === "Ready"
      ? "Ready to explore"
      : getStatus();
  $("emptyScene").hidden = !visibleBounds().isEmpty() || !!pending;
  $("atlasSelection").textContent =
    state.selectedPart?.displayName || "Select a structure to study";
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
  panel.innerHTML = `<div class="search-scope">Search all regions · selecting a result reveals it</div>${searchRows.map((r, i) => `<button type="button" role="option" aria-selected="false" id="atlas-result-${i}" class="atlas-result" data-result="${i}">${!r.system&&structurePreview(r.id)?`<img class="atlas-result-preview" src="${escape(structurePreview(r.id))}" alt="" loading="lazy"/>`:""}<span>${escape(r.label)}</span><small>${r.system ? "View all available structures together" : `${GROUPS.find((g) => g.id === r.group).label} · ${REGIONS.find((g) => g[0] === metadata(r.id).regions[0])?.[1] || "Whole body"}`}</small></button>`).join("") || '<p class="search-empty">No matching structure in this model.</p>'}`;
}
async function chooseSearch(index) {
  const row = searchRows[index];
  if (!row) return;
  closeSearch();
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
  const app = $("app"),
    narrow = matchMedia("(max-width: 1024px)");
  function panel(name, on) {
    app.classList.toggle(name + "-open", on);
    const el = $(name === "systems" ? "systemsSidebar" : "infoSidebar");
    if (name === "systems")
      el.style.transform = narrow.matches
        ? on
          ? "translateX(0)"
          : "translateX(-100%)"
        : "";
    else el.style.transform = on ? "translateX(0)" : "translateX(100%)";
    setInert(el, name === "systems" ? !on && narrow.matches : !on);
    $(name === "systems" ? "systemsOpen" : "infoOpen").setAttribute(
      "aria-expanded",
      String(on),
    );
  }
  for (const name of ["systems", "info"]) {
    $(name === "systems" ? "systemsOpen" : "infoOpen").onclick = () =>
      panel(name, !app.classList.contains(name + "-open"));
    $(name === "systems" ? "systemsToggle" : "infoToggle").onclick = () =>
      panel(name, false);
  }
  narrow.addEventListener("change", () => {
    panel("systems", app.classList.contains("systems-open"));
    panel("info", app.classList.contains("info-open"));
  });
  subscribe("selectedPart", (part) => {
    if (!narrow.matches || !part) panel("info", !!part);
    update();
  });
  panel("systems", false);
  panel("info", false);
  $("searchOpen").onclick = () => {
    document.querySelector(".header").classList.toggle("search-open");
    $("searchInput").focus();
  };
  let release;
  $("helpBtn").onclick = () => {
    $("helpModal").classList.remove("hidden");
    setInert($("helpModal"), false);
    release = trapFocus(document.querySelector(".modal-content"), {
      onEscape: closeHelp,
      returnFocusTo: $("helpBtn"),
    });
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
}
export async function initUI() {
  await Promise.all([loadAllData(),loadStructurePreviews()]);
  $("systemsList").innerHTML =
    `<div class="atlas-kicker">EXPLORE THE HUMAN BODY</div><div class="atlas-region-grid">${REGIONS.map(([id, label]) => `<button type="button" data-region="${id}" aria-pressed="${settings.region === id}">${label}</button>`).join("")}</div>
 <div class="atlas-section-heading"><h3>Systems & layers</h3><span>Outer → inner</span></div>
 <div class="atlas-presets"><button data-preset="muscles">Muscles</button><button data-preset="bones">Bones</button><button data-preset="organs">Organs</button><button data-preset="all">All systems</button></div>
 <div id="atlasGroups"></div><p class="atlas-data-note">Explore the supplied Z-Anatomy structures. Layer groups are curated study controls; skin and muscle motion are not included in this model.</p>`;
  $("systemsList").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.region) run(() => chooseRegion(b.dataset.region));
    else if (b.dataset.preset) run(() => preset(b.dataset.preset));
    else if (b.dataset.step)
      run(() => stepGroup(b.dataset.step, Number(b.dataset.delta)));
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
  $("systemsList").addEventListener("change", (e) => {
    if (e.target.dataset.toggle)
      run(() => toggleGroup(e.target.dataset.toggle, e.target.checked));
  });
  $("frontViewBtn").onclick = () =>
    frame(undefined, new THREE.Vector3(0, 0, 1));
  $("backViewBtn").onclick = () =>
    frame(undefined, new THREE.Vector3(0, 0, -1));
  $("sideViewBtn").onclick = () => frame(undefined, new THREE.Vector3(1, 0, 0));
  $("topViewBtn").onclick = () =>
    frame(undefined, new THREE.Vector3(0, 1, 0.001).normalize());
  $("resetBtn").onclick = () => frame();
  $("panAtlas").onclick = () => {
    moveMode = !moveMode;
    const c = state.viewer.controls;
    c.mouseButtons.LEFT = moveMode ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    c.touches.ONE = moveMode ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    $("panAtlas").setAttribute("aria-pressed", String(moveMode));
    $("panAtlas").textContent = moveMode ? "Move mode" : "Rotate mode";
  };
  $("zoomInAtlas").onclick = () => zoom(0.8);
  $("zoomOutAtlas").onclick = () => zoom(1.25);
  $("undoAtlas").onclick = undo;
  $("restoreAtlas").onclick = restoreScene;
  $("returnContext").onclick = returnContext;
  $("footerFocusBtn").onclick = () => {
    const meta=metadata(state.selectedPart?.id);if(!meta)return;
    frame(new THREE.Box3(new THREE.Vector3(...meta.box.slice(0,3)),new THREE.Vector3(...meta.box.slice(3))));
  };
  let fadedOthers=true;
  $("footerFadeOthersBtn").onclick = () => {
    if(!state.selectedPart)return;
    fadedOthers=!fadedOthers;
    if(fadedOthers)ghostAllExcept(state.selectedPart.id);else clearGhost();
    $("footerFadeOthersBtn").setAttribute('aria-pressed',String(fadedOthers));
  };
  subscribe('selectedPart',part=>{fadedOthers=!!part;$("footerFadeOthersBtn").setAttribute('aria-pressed',String(!!part));});
  $("footerIsolateBtn").onclick = isolateSelected;
  $("footerHideBtn").onclick = hideSelected;
  $("footerTransparentBtn").onclick = fadeSelected;
  $("footerShowAllBtn").onclick = restoreScene;
  $("shareAtlas").onclick = async () => {
    try {
      await navigator.clipboard.writeText(hostedShareUrl(shareView()));
      announce("View link copied");
    } catch {
      const input = $("shareUrl");
      input.hidden = false;
      input.value = hostedShareUrl(shareView());
      input.focus();
      input.select();
      announce("Copy the selected view link");
    }
  };
  $("emptyRestore").onclick = restoreScene;
  initPanels();
  initSearch();
  subscribe("atlasChanged", update);
  subscribe("atlasLoading", announce);
  update();
  // Native click selection remains available for the complete scene graph.
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
