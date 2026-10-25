// DEVELOPMENT SCHEMATIC, NOT FOR MEDICAL TEACHING.
// Original, deliberately simple geometry used only to exercise the Layer Explorer / Exploded View engine.
// It is not anatomically verified. The server refuses to publish any lesson that uses these keys.
const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${400 - Number(x)} ${y}`);
const TORSO = 'M130 36 Q200 18 270 36 L326 112 Q344 250 308 384 L92 384 Q56 250 74 112 Z';
const PEC_MAJOR = 'M196 108 Q150 96 108 150 Q112 206 166 214 Q194 190 196 108 Z';
const PEC_MINOR = 'M168 136 L132 188 L176 196 Z';
const LUNG = 'M190 92 Q132 92 112 168 Q104 250 138 300 Q176 316 192 270 Z';
const PLEURA = 'M192 82 Q122 82 100 168 Q92 262 134 312 Q184 332 198 272 Z';
const HEART = 'M198 190 Q172 166 150 192 Q140 226 198 292 Q252 230 244 196 Q222 168 198 190 Z';

const SHAPES = {
  'dev-thorax:skin': () => <><path d={TORSO} fill="#e9bd9f" stroke="#b4805f" strokeWidth="3" /><ellipse cx="200" cy="30" rx="40" ry="14" fill="#e9bd9f" stroke="#b4805f" strokeWidth="3" /></>,
  'dev-thorax:fascia': () => <><path d={TORSO} fill="#f4dcc6" stroke="#c9a48a" strokeWidth="2" strokeDasharray="6 5" transform="translate(200 210) scale(.94) translate(-200 -210)" />
    {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${96 + i * 42} 60 L${70 + i * 42} 370`} stroke="#d8b79c" strokeWidth="1.5" fill="none" opacity=".7" />)}</>,
  'dev-thorax:pectoralis-major': () => <><path d={PEC_MAJOR} fill="#c4574f" stroke="#7d2c2a" strokeWidth="3" /><path d={mirror(PEC_MAJOR)} fill="#c4574f" stroke="#7d2c2a" strokeWidth="3" /></>,
  'dev-thorax:pectoralis-minor': () => <><path d={PEC_MINOR} fill="#a8403f" stroke="#6b2423" strokeWidth="3" /><path d={mirror(PEC_MINOR)} fill="#a8403f" stroke="#6b2423" strokeWidth="3" /></>,
  'dev-thorax:ribs': () => <><rect x="190" y="86" width="20" height="170" rx="6" fill="#efe3b8" stroke="#a89867" strokeWidth="3" />
    {[0, 1, 2, 3, 4, 5].map((i) => { const y = 100 + i * 28; return <g key={i} fill="none" stroke="#d9c98d" strokeWidth="9" strokeLinecap="round"><path d={`M190 ${y} Q120 ${y - 10 + i * 2} 100 ${y + 44}`} /><path d={`M210 ${y} Q280 ${y - 10 + i * 2} 300 ${y + 44}`} /></g>; })}</>,
  'dev-thorax:pleura': () => <><path d={PLEURA} fill="#8cc3e6" fillOpacity=".4" stroke="#3f86b8" strokeWidth="4" /><path d={mirror(PLEURA)} fill="#8cc3e6" fillOpacity=".4" stroke="#3f86b8" strokeWidth="4" /></>,
  'dev-thorax:lungs': () => <><path d={LUNG} fill="#eba3a3" stroke="#b15f5f" strokeWidth="3" /><path d={mirror(LUNG)} fill="#eba3a3" stroke="#b15f5f" strokeWidth="3" /></>,
  'dev-thorax:heart': () => <path d={HEART} fill="#b53a4c" stroke="#6e1e2b" strokeWidth="3" />,
};

export const SCHEMATIC_KEYS = Object.keys(SHAPES);
export function Schematic({ id }) { const Shape = SHAPES[id]; return Shape ? <Shape /> : null; }
