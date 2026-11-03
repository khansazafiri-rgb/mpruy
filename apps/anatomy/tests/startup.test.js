import {it,expect} from 'vitest';import * as THREE from 'three';import {computeBoundsTree} from 'three-mesh-bvh';import {BackgroundGeometryQueue} from '../src/viewer/backgroundGeometry.js';import {geometryIdentity} from '../src/annotations/surfaceAnchor.js';
it('BVH work waits until first usable frame and runs in bounded batches with disposal cancellation',()=>{
 const callbacks=[],built=[],queue=new BackgroundGeometryQueue({schedule:cb=>callbacks.push(cb),now:(()=>{let time=0;return()=>time+=4;})()});
 const first=new THREE.BoxGeometry(),second=new THREE.BoxGeometry();first.computeBoundsTree=()=>built.push('first');second.computeBoundsTree=()=>built.push('second');queue.add(first);queue.add(first);queue.add(second);expect(callbacks).toHaveLength(0);queue.enable();expect(callbacks).toHaveLength(1);callbacks.shift()({timeRemaining:()=>0});expect(built).toEqual(['first']);second.dispose();callbacks.shift()({timeRemaining:()=>100});expect(built).toEqual(['first']);
});
it('deferred BVH retains the exact legacy index ordering / annotation geometry identity',async()=>{
 const eager=new THREE.SphereGeometry(1,12,12),deferred=eager.clone(),callbacks=[];computeBoundsTree.call(eager);deferred.computeBoundsTree=function(){return computeBoundsTree.call(this);};
 const queue=new BackgroundGeometryQueue({schedule:cb=>callbacks.push(cb)});queue.add(deferred);queue.enable();while(callbacks.length)callbacks.shift()({timeRemaining:()=>100});
 expect([...deferred.index.array]).toEqual([...eager.index.array]);const a=await geometryIdentity(new THREE.Mesh(eager),'fixture',0),b=await geometryIdentity(new THREE.Mesh(deferred),'fixture',0);expect(a.geometryHash).toBe(b.geometryHash);
});
it('metadata fetches fail clearly for a missing mount, HTML fallback, and a network stall',async()=>{
 const {fetchJson}=await import('../src/utils/fetchJson.js');
 await expect(fetchJson('data/systems.json',{fetcher:async()=>new Response('',{status:404})})).rejects.toThrow('HTTP 404');
 await expect(fetchJson('data/systems.json',{fetcher:async()=>new Response('<html/>',{headers:{'content-type':'text/html'}})})).rejects.toThrow('HTML');
 await expect(fetchJson('data/systems.json',{timeoutMs:5,fetcher:async(_,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))})).rejects.toThrow('aborted');
});
