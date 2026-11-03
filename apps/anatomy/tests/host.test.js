import {it,expect,vi} from 'vitest';
import {hostedShareUrl,reportAtlasStatus} from '../src/integration/host.js';
it('embedded sharing stays on the main anatomy route without account data',()=>{
 const postMessage=vi.fn();const parent={postMessage};
 vi.stubGlobal('window',{parent,location:{origin:'https://medcoel.example'}});
 expect(hostedShareUrl('https://medcoel.example/anatomy/viewer/#atlas=state')).toBe('https://medcoel.example/anatomy#atlas=state');
 reportAtlasStatus('ready');expect(postMessage).toHaveBeenCalledWith({type:'medcoel:anatomy-ready',version:1},'https://medcoel.example');vi.unstubAllGlobals();
});
it('reports an embedded initialization error to the same origin',()=>{
 const postMessage=vi.fn();
 vi.stubGlobal('window',{parent:{postMessage},location:{origin:'https://medcoel.example'}});
 try {
  reportAtlasStatus('error');
  expect(postMessage).toHaveBeenCalledWith({type:'medcoel:anatomy-error',version:1},'https://medcoel.example');
 } finally { vi.unstubAllGlobals(); }
});
it('keeps standalone share links and sends no host events outside a frame',()=>{
 const standalone={location:{origin:'https://medcoel.example'}};
 standalone.parent=standalone;
 vi.stubGlobal('window',standalone);
 try {
  expect(hostedShareUrl('https://medcoel.example/anatomy/viewer/#atlas=state')).toBe('https://medcoel.example/anatomy/viewer/#atlas=state');
  expect(()=>reportAtlasStatus('ready')).not.toThrow();
  expect(()=>reportAtlasStatus('error')).not.toThrow();
 } finally { vi.unstubAllGlobals(); }
});
it('reports usable interaction independently of background readiness with bounded lifecycle fields',()=>{
 const postMessage=vi.fn();vi.stubGlobal('window',{parent:{postMessage},location:{origin:'https://medcoel.example'}});
 try{reportAtlasStatus('loading',{phase:'model',progress:33,message:'Skeleton'});reportAtlasStatus('interactive');expect(postMessage.mock.calls.map(call=>call[0].type)).toEqual(['medcoel:anatomy-loading','medcoel:anatomy-interactive']);expect(postMessage.mock.calls[0][0].progress).toBe(33);}finally{vi.unstubAllGlobals();}
});
