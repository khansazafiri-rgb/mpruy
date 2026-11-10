// BodyParts3D OBJ coordinates are millimetres: +X patient left, -Y anterior,
// +Z superior. Three.js display coordinates are metres: +X patient left,
// +Y superior, +Z anterior. One shared parent transforms every source mesh.
export const SOURCE_TO_WORLD={scale:0.001,rotationX:-Math.PI/2};

export function nativeToWorld([x,y,z]){
  if(![x,y,z].every(Number.isFinite))throw new Error('Nonfinite source coordinate');
  return [x*0.001,z*0.001,-y*0.001];
}

export function worldToNative([x,y,z]){
  if(![x,y,z].every(Number.isFinite))throw new Error('Nonfinite display coordinate');
  return [x*1000,-z*1000,y*1000];
}
