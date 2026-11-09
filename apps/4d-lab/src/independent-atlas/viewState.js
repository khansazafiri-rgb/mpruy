// Original, renderer-agnostic interaction state for the local Atlas pilot.
// Keys include the system so coincident names in different model groups never collide.
export const structureKey = (system, name) => `${system}::${name}`;

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
    case 'system': {
      if (!action.system || !action.valid) return state;
      next.enabled = action.enabled
        ? [...new Set([...next.enabled, action.system])]
        : next.enabled.filter(s => s !== action.system);
      if (next.selected?.startsWith(action.system + '::') && !action.enabled) next.selected = null;
      break;
    }
    case 'select': next.selected = key || null; break;
    case 'hide':
      if (!key) return state;
      next.hidden = [...new Set([...next.hidden, key])];
      if (next.selected === key) next.selected = null;
      if (next.isolated === key) next.isolated = null;
      break;
    case 'isolate': if (!key) return state; next.isolated = key; next.hidden = next.hidden.filter(k => k !== key); break;
    case 'fade': next.faded = next.faded === key ? null : key; break;
    case 'region': next.region = action.region || 'whole'; break;
    case 'opacity': next.opacity = Math.max(0.15, Math.min(1, Number(action.value) || 1)); break;
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
