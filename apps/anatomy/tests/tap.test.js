import {it,expect} from 'vitest';
import {isSelectionTap} from '../src/viewer/tap.js';
it('single finger selects through a short stationary tap without hover or long press',()=>{
 expect(isSelectionTap({x:10,y:20,time:100},{x:12,y:22,time:230})).toBe(true);
});
it('rotate/pan drag, pinch, canceled touch and long press cannot select or answer',()=>{
 const start={x:10,y:20,time:100};
 expect(isSelectionTap(start,{x:40,y:20,time:220})).toBe(false);
 expect(isSelectionTap(start,{x:10,y:20,time:220},2)).toBe(false);
 expect(isSelectionTap(null,{x:10,y:20,time:220})).toBe(false);
 expect(isSelectionTap(start,{x:10,y:20,time:500})).toBe(false);
});
