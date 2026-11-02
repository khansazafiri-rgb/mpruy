import {surfaceTopology} from './surfaceBrush.js';
import {reconstructLocal} from './surfaceAnchor.js';
class Heap {
 data=[];
 push(item){const a=this.data;a.push(item);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p][0]<=item[0])break;a[i]=a[p];i=p;}a[i]=item;}
 pop(){const a=this.data,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;if(a[c][0]>=last[0])break;a[i]=a[c];i=c;}a[i]=last;}return first;}
}
// Shortest edge path stays on the triangle mesh; never a chord through the bone.
export function surfacePath(mesh,anchors,identity) {
 if(anchors.length<2)return anchors.map(a=>reconstructLocal(mesh,a,identity));
 const {vertices,faces,graph}=surfaceTopology(mesh),points=[];
 for(let segment=1;segment<anchors.length;segment++) {
  const from=anchors[segment-1],to=anchors[segment],a=reconstructLocal(mesh,from,identity),b=reconstructLocal(mesh,to,identity);
  if(from.faceIndex===to.faceIndex){points.push(a,b);continue;}
  const dist=new Float64Array(vertices.length).fill(Infinity),prev=new Int32Array(vertices.length).fill(-1),heap=new Heap(),ends=new Set(faces[to.faceIndex]);
  for(const id of faces[from.faceIndex]){dist[id]=a.distanceTo(vertices[id]);heap.push([dist[id],id]);}
  let best=Infinity,end=-1;
  while(heap.data.length) {
   const [cost,id]=heap.pop();if(cost!==dist[id])continue;if(cost>best)break;
   if(ends.has(id)){const total=cost+vertices[id].distanceTo(b);if(total<best){best=total;end=id;}}
   for(const [n,length] of graph[id])if(cost+length<dist[n]){dist[n]=cost+length;prev[n]=id;heap.push([dist[n],n]);}
  }
  if(end<0)throw Error('Anchors are on disconnected surfaces; add anchors on one connected patch');
  const chain=[];for(let id=end;id!==-1;id=prev[id])chain.push(vertices[id].clone());
  points.push(a,...chain.reverse(),b);
 }
 return points;
}
