// OrbitControls owns drags and multi-finger gestures; only a stationary, short
// single-finger gesture may select. No hover or long-press is required.
export function isSelectionTap(start,end,count=1){
 return !!start&&count===1&&Math.hypot(end.x-start.x,end.y-start.y)<=10&&end.time-start.time>=0&&end.time-start.time<=300;
}
