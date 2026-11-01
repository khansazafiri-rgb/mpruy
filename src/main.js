import {reportAtlasStatus} from './integration/host.js';
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./styles/main.css";
import "./styles/atlas.css";
import "./styles/medcoel-tokens.css";
import "./styles/medcoel-shell.css";
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
import { initAtlas } from "./atlas/engine.js";
import { initUI } from "./atlas/ui.js";
async function start() {
  const overlay = document.getElementById("loadingOverlay");
  try {
    const viewer = createScene();
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
    await initAtlas(catalog);
    await initUI();
    initSelection(viewer);
    overlay.classList.add("hidden");
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
    retry.textContent = "Reload anatomy";
    retry.onclick = () => location.reload();
    overlay.appendChild(retry);
  }
}
start();
