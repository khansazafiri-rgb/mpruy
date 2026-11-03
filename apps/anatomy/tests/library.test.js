import {it,expect,vi} from 'vitest';
import {executeLibrarySelection} from '../src/library/selection.js';
import {LIBRARY_COMMAND,LIBRARY_RESULT,acceptsLibraryCommand,acceptsLibraryEvent} from '../src/library/protocol.js';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../public/data/atlas-catalog.json',import.meta.url)));
it('reuses the exact reviewed catalog for 3D deep links, contextual selection without automatic isolation',async()=>{
 const api={catalog:()=>catalog,reveal:vi.fn(),isolate:vi.fn(),viewGroup:vi.fn(),chooseRegion:vi.fn(),restoreScene:vi.fn(),prepareStudy:vi.fn()};
 expect(await executeLibrarySelection({structureId:'Ulna.r',mode:'explore'},api)).toBe('Ulna.r');expect(api.reveal).toHaveBeenCalledWith('Ulna.r');expect(api.isolate).not.toHaveBeenCalled();expect(api.viewGroup).not.toHaveBeenCalled();
});
it('find mode prepares only participant scope without target highlight, isolation or reveal',async()=>{
 const api={catalog:()=>catalog,reveal:vi.fn(),isolate:vi.fn(),viewGroup:vi.fn(),chooseRegion:vi.fn(),restoreScene:vi.fn(),prepareStudy:vi.fn()};
 await executeLibrarySelection({structureId:'Humerus.r',mode:'find',region:'whole',system:''},api);expect(api.prepareStudy).toHaveBeenCalledWith({region:'whole',system:''});expect(api.viewGroup).not.toHaveBeenCalled();expect(api.chooseRegion).not.toHaveBeenCalled();expect(api.reveal).not.toHaveBeenCalled();expect(api.isolate).not.toHaveBeenCalled();
});
it('rejects unavailable targets before changing the scene',async()=>{
 const api={catalog:()=>catalog,reveal:vi.fn(),isolate:vi.fn()};await expect(executeLibrarySelection({structureId:'unknown',mode:'explore'},api)).rejects.toThrow('not available');await expect(executeLibrarySelection({structureId:'constructor',mode:'explore'},api)).rejects.toThrow('not available');expect(api.reveal).not.toHaveBeenCalled();
});
it('find scope is identical for different targets and never inferred from their bounds',async()=>{
 const api={catalog:()=>({test:{group:'arterial',regions:['thorax'],box:[0,.9,0,1,1.6,1]}}),viewGroup:vi.fn(),chooseRegion:vi.fn(),restoreScene:vi.fn(),prepareStudy:vi.fn()};
 await executeLibrarySelection({structureId:'test',mode:'find',region:'abdomen',system:'cardiovascular'},api);expect(api.prepareStudy).toHaveBeenCalledWith({region:'abdomen',system:'cardiovascular'});expect(api.chooseRegion).not.toHaveBeenCalled();
});
it('library protocol rejects forged frames, stale responses and versions',()=>{
 const parent={},self={},origin='https://medcoel.example',requestId='test-request-123',data={type:LIBRARY_COMMAND,version:1,requestId,structureId:'Ulna.r',mode:'identify'},event={source:parent,origin,data};
 expect(acceptsLibraryCommand(event,origin,parent,self)).toBe(true);expect(acceptsLibraryCommand({...event,source:{}},origin,parent,self)).toBe(false);expect(acceptsLibraryCommand({...event,origin:'https://foreign.example'},origin,parent,self)).toBe(false);expect(acceptsLibraryCommand({...event,data:{...data,version:2}},origin,parent,self)).toBe(false);
 const response={source:parent,origin,data:{type:LIBRARY_RESULT,version:1,requestId,ok:false,message:'Unknown mesh'}};expect(acceptsLibraryEvent(response,origin,parent,requestId)).toBe(true);expect(acceptsLibraryEvent(response,origin,parent,'old')).toBe(false);
});
it('the existing dataset has one selectable catalog entry per mesh and exported aliases reuse the atlas',()=>{
 const systems=JSON.parse(readFileSync(new URL('../public/data/systems.json',import.meta.url))),reference=JSON.parse(readFileSync(new URL('../public/data/library-reference.json',import.meta.url)));
 const ids=Object.values(systems).flat();expect(new Set(ids).size).toBe(2827);expect(ids.every(id=>catalog[id])).toBe(true);expect(reference.synonyms.id.ulna).toContain('tulang hasta');expect(reference.regions).toHaveLength(8);
});
it('identify restores hidden state before revealing the new target; explore preserves existing atlas visibility',async()=>{
 const api={catalog:()=>catalog,reveal:vi.fn(),restoreScene:vi.fn()};
 await executeLibrarySelection({structureId:'Ulna.r',mode:'identify'},api);expect(api.restoreScene).toHaveBeenCalledOnce();expect(api.reveal).toHaveBeenCalledWith('Ulna.r');
 api.restoreScene.mockClear();await executeLibrarySelection({structureId:'Ulna.r',mode:'explore'},api);expect(api.restoreScene).not.toHaveBeenCalled();
});

it('system and region quizzes restore context and highlight the structure without automatic isolation',async()=>{
 for(const mode of ['system','region']){const api={catalog:()=>catalog,reveal:vi.fn(),restoreScene:vi.fn(),prepareStudy:vi.fn(),isolate:vi.fn()};await executeLibrarySelection({structureId:'Ulna.r',mode},api);expect(api.restoreScene).toHaveBeenCalledOnce();expect(api.reveal).toHaveBeenCalledWith('Ulna.r');expect(api.prepareStudy).not.toHaveBeenCalled();expect(api.isolate).not.toHaveBeenCalled();}
});
