import {beginPhase,reportPerf} from '../utils/perf.js';
export class BackgroundGeometryQueue {
  constructor({schedule,now=()=>performance.now(),onBatch=()=>{}}) {Object.assign(this,{schedule,now,onBatch});this.tasks=[];this.pending=new Map();this.active=false;this.scheduled=false;}
  add(geometry) {
    if(geometry.boundsTree||this.pending.has(geometry))return;
    const task={geometry,cancelled:false};
    task.cancel=()=>{task.cancelled=true;this.pending.delete(geometry);};
    geometry.addEventListener('dispose',task.cancel);this.pending.set(geometry,task);this.tasks.push(task);this.kick();
  }
  enable(){this.active=true;this.kick();}
  kick(){
    if(!this.active||this.scheduled||!this.tasks.length)return;
    this.scheduled=true;this.schedule(deadline=>{
      this.scheduled=false;const started=this.now();let count=0;
      while(this.tasks.length&&(count===0||(this.now()-started<6&&(!deadline?.timeRemaining||deadline.timeRemaining()>1)))){
        const task=this.tasks.shift(),{geometry}=task;geometry.removeEventListener('dispose',task.cancel);this.pending.delete(geometry);
        if(task.cancelled||geometry.boundsTree)continue;
        const done=beginPhase('BVH background');
        try{geometry.computeBoundsTree();}catch(error){console.warn('Anatomy BVH enhancement unavailable:',error.message);}finally{done();}
        count++;
      }
      this.onBatch(count);this.kick();
    });
  }
}
const schedule=callback=>typeof globalThis.requestIdleCallback==='function'?globalThis.requestIdleCallback(callback,{timeout:1000}):setTimeout(()=>callback(),16);
let invalidate=()=>{};
const queue=new BackgroundGeometryQueue({schedule,onBatch:()=>{invalidate();if(queue.pending.size===0)reportPerf('BVH complete');}});
export const queueBoundsTree=geometry=>queue.add(geometry);
export function enableBackgroundGeometry(render){invalidate=render;queue.enable();}
