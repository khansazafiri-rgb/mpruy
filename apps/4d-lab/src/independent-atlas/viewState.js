// Original, renderer-agnostic interaction state for the local Atlas pilot.
// Keys include the system so coincident names in different model groups never collide.
export const structureKey = (system, name) => `${system}::${name}`;
export const REGIONS = Object.freeze(['whole', 'headNeck', 'thorax', 'abdomen', 'pelvis', 'upperLimb', 'lowerLimb', 'back']);

export function createViewState() {
  return {
    enabled: ['skeletal'], selected: null, isolated: null, hidden: [],
    faded: null, region: 'whole', opacity: 1, history: [],
  };
}

function snapshot(state) {
  const { history, ...rest } = state;
  return structuredClone(rest);
}

export function updateView(state, action) {
  if (action.type === 'undo') {
    if (!state.history.length) return state;
    const history = state.history.slice(0, -1);
    return { ...state.history.at(-1), history };
  }
  if (action.type === 'restore') {
    const next = createViewState();
    return { ...next, enabled: [...state.enabled], history: [...state.history, snapshot(state)].slice(-30) };
  }
  const next = snapshot(state);
  const key = action.key;
  switch (action.type) {
    case 'system':
    case 'onlySystem': {
      if (!action.system || !action.valid) return state;
      next.enabled = action.type === 'onlySystem' ? [action.system] : action.enabled
        ? [...new Set([...next.enabled, action.system])]
        : next.enabled.filter(s => s !== action.system);
      // Isolating or fading an unloaded system would make every remaining
      // structure invisible. Clear only context tied to disabled systems.
      const stillEnabled = value => !value || next.enabled.some(s => value.startsWith(s + '::'));
      if (!stillEnabled(next.selected)) next.selected = null;
      if (!stillEnabled(next.isolated)) next.isolated = null;
      if (!stillEnabled(next.faded)) next.faded = null;
      break;
    }
    case 'select': next.selected = key || null; break;
    case 'reveal':
      if (!key) return state;
      // Search/picking must work after Hide/Isolate, not select an invisible mesh.
      next.hidden = next.hidden.filter(k => k !== key);
      if (next.isolated !== key) next.isolated = null;
      if (next.faded !== key) next.faded = null;
      next.selected = key;
      break;
    case 'hide':
      if (!key) return state;
      next.hidden = [...new Set([...next.hidden, key])];
      if (next.selected === key) next.selected = null;
      if (next.isolated === key) next.isolated = null;
      break;
    case 'isolate': if (!key) return state; next.isolated = key; next.hidden = next.hidden.filter(k => k !== key); break;
    case 'fade': next.faded = next.faded === key ? null : key; break;
    case 'region': next.region = action.region || 'whole'; break;
    case 'opacity': next.opacity = Math.max(0.15, Math.min(1, Number.isFinite(Number(action.value)) ? Number(action.value) : 1)); break;
    case 'clearSelection': next.selected = null; next.isolated = null; next.faded = null; break;
    default: return state;
  }
  if (JSON.stringify(snapshot(state)) === JSON.stringify(next)) return state;
  return { ...next, history: [...state.history, snapshot(state)].slice(-30) };
}

export function visibleStructure(state, system, name, regions = []) {
  const key = structureKey(system, name);
  return state.enabled.includes(system) && !state.hidden.includes(key) &&
    (!state.isolated || state.isolated === key) &&
    (state.region === 'whole' || regions.includes(state.region) || state.isolated === key);
}

// The URL is user-controlled. Restore only known catalog keys and bounded finite camera values.
export function readSharedView(raw, validSystems, validKeys) {
  if (!raw || raw.length > 8000) return null;
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.enabled) || data.enabled.length > 6 ||
      !Array.isArray(data.hidden) || data.hidden.length > 80) return null;
    const systems = [...new Set(data.enabled.filter(s => validSystems.includes(s)))];
    const enabled = systems.length ? systems : ['skeletal'];
    const key = value => typeof value === 'string' && validKeys.has(value) && enabled.some(s => value.startsWith(s + '::')) ? value : null;
    const hidden = [...new Set(data.hidden.map(key).filter(Boolean))];
    const state = { ...createViewState(), enabled, hidden,
      selected: key(data.selected), isolated: key(data.isolated), faded: key(data.faded),
      region: REGIONS.includes(data.region) ? data.region : 'whole',
      opacity: Number.isFinite(data.opacity) ? Math.max(0.15, Math.min(1, data.opacity)) : 1,
    };
    if (state.isolated) state.hidden = state.hidden.filter(k => k !== state.isolated);
    if (state.selected && state.hidden.includes(state.selected)) state.selected = null;
    const camera = Array.isArray(data.camera) && data.camera.length === 6 &&
      data.camera.every(n => Number.isFinite(n) && Math.abs(n) <= 100) &&
      Math.hypot(data.camera[0] - data.camera[3], data.camera[1] - data.camera[4], data.camera[2] - data.camera[5]) > 0.02
      ? data.camera : null;
    return { state, camera };
  } catch { return null; }
}

export function sharedViewPayload(state, camera) {
  const { history, ...snapshot } = state;
  return JSON.stringify({ version: 1, ...snapshot, camera });
}
