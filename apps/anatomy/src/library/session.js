// Only the explicit answer action crosses the host boundary. Visibility and
// selection remain local viewer operations, including on touch devices.
export function createStudySession(api) {
 let active=null,selected=null;
 const hidden=new Map();
 return {
  begin(command){active=command;selected=null;hidden.clear();},
  select(part){selected=part;},
  answer(){if(active?.mode!=='find'||!selected||!api.visible(selected.id))return false;api.send({type:'medcoel:anatomy-library-pick',requestId:active.requestId,structureId:selected.id,intent:'answer'});return true;},
  hide(){if(active?.mode!=='find'||!selected)return;const part=selected;api.hide();hidden.set(part.id,part.displayName);selected=null;},
  unhide(id){if(!hidden.has(id))return;api.show(id);hidden.delete(id);api.render();},
  reset(){api.restore();selected=null;hidden.clear();api.render();},
  focus(){if(selected)api.focus(selected.id);},
  hidden(){return [...hidden].filter(([id])=>!api.visible(id));},
  selected(){return selected;}
 };
}
