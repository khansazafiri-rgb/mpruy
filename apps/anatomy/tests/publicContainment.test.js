import {it,expect} from 'vitest';
import {GROUPS,initialSettings} from '../src/atlas/catalog.js';
import {isPublicContainment,isPublicWithheldSource,recoverPublicGroups,PUBLIC_WITHHELD_SOURCES} from '../src/atlas/publicContainment.js';

const production={hostname:'medcoel.com'};
const development={hostname:'localhost'};
it('limits only actual medcoel.com public host, never weakens independent licensing quarantine',()=>{
 expect(isPublicContainment(production)).toBe(true);
 expect(isPublicContainment({hostname:'www.medcoel.com'})).toBe(true);
 expect(isPublicContainment(development)).toBe(false);
 expect(isPublicContainment({hostname:'medcoel.com.evil.org'})).toBe(false);
 expect([...PUBLIC_WITHHELD_SOURCES].sort()).toEqual(['skeletal','visceral']);
 expect(isPublicWithheldSource('skeletal',production)).toBe(true);
 expect(isPublicWithheldSource('visceral',production)).toBe(true);
 expect(isPublicWithheldSource('muscular',production)).toBe(false);
});
it('production startup removes two quarantined sources while retaining available muscular geometry',()=>{
 const restored=recoverPublicGroups(initialSettings().groups,GROUPS,production);
 expect(restored.skeletal.enabled).toBe(false);
 expect(restored.muscular.enabled).toBe(true);
 expect(GROUPS.filter(g=>restored[g.id].enabled).map(g=>g.source)).toEqual(['muscular']);
});
it('old bookmarks and presets cannot reenable blocked sources; not an alternative muscle-as-bone label',()=>{
 const previous=initialSettings().groups;
 for(const g of GROUPS)previous[g.id]={enabled:true,removed:0};
 const restored=recoverPublicGroups(previous,GROUPS,production);
 expect(GROUPS.filter(g=>PUBLIC_WITHHELD_SOURCES.includes(g.source)).every(g=>restored[g.id].enabled===false)).toBe(true);
 expect(restored.muscular.enabled).toBe(true);
 expect(previous.skeletal.enabled).toBe(true); // no mutation of caller data
});
it('development, tests and private reviewers preserve normal clinical UI baseline',()=>{
 const original=initialSettings().groups;
 expect(recoverPublicGroups(original,GROUPS,development)).toBe(original);
 expect(original.skeletal.enabled).toBe(true);
});
