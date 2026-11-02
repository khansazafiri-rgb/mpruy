import {validateDocument, PILOT, PART_ID, REPRESENTATIONS} from './annotationSchema.mjs';
export const PREFIX='medcoel:anatomy-annotator-';
export const TOOLS=['navigate','point','paint','erase','line'];
export function acceptsAnnotatorCommand(event,origin,parentWindow,selfWindow) {
 if(!parentWindow || parentWindow===selfWindow || event.origin!==origin || event.source!==parentWindow) return false;
 const d=event.data;
 if(!d || d.version!==1 || typeof d.session!=='string' || !/^[\w-]{8,100}$/.test(d.session)) return false;
 try {
  switch(d.type) {
   case PREFIX+'enter': validateDocument(d.document);return true;
   case PREFIX+'select-part': return d.partId===PART_ID;
   case PREFIX+'select-landmark': return PILOT.some(([id])=>id===d.landmarkId) && (!d.representation||REPRESENTATIONS.includes(d.representation));
   case PREFIX+'set-tool': return TOOLS.includes(d.tool)&&Number.isFinite(d.brushMm)&&d.brushMm>=1&&d.brushMm<=30;
   case PREFIX+'preview': validateDocument(d.document);return typeof d.student==='boolean';
   case PREFIX+'clear': return ['landmark','undo'].includes(d.action);
   default: return false;
  }
 } catch { return false; }
}
export function acceptsAnnotationEvent(event,origin,viewerWindow,session) {
 if(!viewerWindow || event.origin!==origin || event.source!==viewerWindow) return false;
 const d=event.data;
 if(d?.version!==1 || d.session!==session) return false;
 try {
  if(d.type==='medcoel:anatomy-annotation-change') {validateDocument(d.document);return true;}
  if(d.type==='medcoel:anatomy-annotation-hit') return PILOT.some(([id])=>id===d.landmarkId) && Number.isInteger(d.faceIndex) && d.faceIndex>=0;
  if(d.type==='medcoel:anatomy-annotation-error') return typeof d.message==='string' && d.message.length<=500;
 } catch { return false; }
 return false;
}
