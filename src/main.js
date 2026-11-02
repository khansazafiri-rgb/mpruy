import {reportAtlasStatus} from './integration/host.js';
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./styles/medcoel-tokens.css";
import "./styles/atlas-v3.css";
import { createScene } from "./viewer/createScene.js";
import { initSelection } from "./viewer/selection.js";
import {
  setViewer,
  setPartsData,
  setSystemsData,
  setTranslations,
} from "./state/store.js";
import {
  loadSystemsData,
  loadLexicon,
  loadDefinitions,
  buildPartsData,
} from "./data/anatomy.js";
import { translationsIt, translationsEn } from "./data/translations.js";
import { asset } from "./utils/paths.js";
import { initAtlas, settings } from "./atlas/engine.js";
import { initUI } from "./atlas/ui.js";
async function start() {
  const overlay = document.getElementById("loadingOverlay");
  try {
    const viewer = createScene();
    if (window.parent !== window && new URLSearchParams(location.search).get('annotator') === '1') document.body.classList.add('anatomy-annotator-active');
    setViewer(viewer);
    viewer.startRenderLoop();
    setTranslations({ it: translationsIt, en: translationsEn });
    const [systems, lexicon, response] = await Promise.all([
      loadSystemsData(),
      loadLexicon(),
      fetch(asset("data/atlas-catalog.json")),
    ]);
    if (!response.ok)
      throw new Error("Anatomy catalogue could not load. Refresh to retry.");
    const catalog = await response.json();
    const parts = buildPartsData(systems, lexicon);
    for (const [id, meta] of Object.entries(catalog))
      if (parts[id])
        Object.assign(parts[id], {
          studyGroup: meta.group,
          studyRegions: meta.regions,
        });
    setSystemsData(systems);
    setPartsData(parts);
    loadDefinitions();
    // First view shows superficial muscles and bones, as atlases usually open; + brings the fascia back.
    // A saved or shared view (hash or local session) still wins inside initAtlas.
    settings.groups.muscular.removed = 1;
    await initAtlas(catalog);
    await initUI();
    initSelection(viewer);
    const {installLibraryBridge} = await import('./library/bridge.js');
    installLibraryBridge(viewer);
    overlay.classList.add("hidden");
    if (window.parent !== window && new URLSearchParams(location.search).get('annotator') === '1') {
      const {installAnnotator} = await import('./annotations/annotator.js');
      installAnnotator(viewer);
    }
    reportAtlasStatus("ready");
    document.addEventListener("visibilitychange", () =>
      document.hidden ? viewer.stopRenderLoop() : viewer.startRenderLoop(),
    );
  } catch (error) {
    console.error(error);
    reportAtlasStatus("error");
    overlay.querySelector(".loading-text").textContent = error.message;
    overlay.querySelector(".loading-spinner").hidden = true;
    const retry = document.createElement("button");
    retry.className = "action-btn";
    retry.textContent = "Muat ulang atlas";
    retry.onclick = () => location.reload();
    overlay.appendChild(retry);
  }
}
start();
