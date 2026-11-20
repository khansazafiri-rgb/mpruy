import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.UnauthorizedError ??= class UnauthorizedError extends Error {};
globalThis.ForbiddenError ??= class ForbiddenError extends Error {};
const server = require('../pb_hooks/lib/studios.js');
const fakeUser = (role = 'user', campus = '') => ({
  collection: () => ({ name: 'users' }),
  getBool: () => false,
  getString: name => ({role,campus,deletedAt:''})[name] || ''
});
const event = (role = 'user', q = {}, campus = '') => {
  const h = {};
  const e = {
    auth: fakeUser(role,campus),
    response: {header: () => ({set: (k,v) => {h[k] = v;}})},
    request: {url: {query: () => ({toString:()=>JSON.stringify(q)})}},
    requestInfo: () => ({query: q}),
    json: (status, data) => ({status,data,headers:h})
  };
  return e;
};
test('user list is authenticated, no-store and 24 non-launchable entries', () => {
  const result = server.list(event());
  assert.equal(result.status, 200);
  assert.equal(result.headers['Cache-Control'],'private, no-store');
  assert.equal(result.headers['Vary'],'Authorization');
  assert.equal(result.data.items.length,24);
  assert.ok(result.data.items.every(i=>!i.availability.canLaunch));
});
test('admin list includes fixture but no launch rights', () => {
  const result = server.list(event('admin'));
  assert.equal(result.data.items.length,25);
  assert.equal(result.data.items.find(i=>i.id==='foundation-fixture').availability.state,'building');
});
test('API rejects queries attempting to change authorization or release status', () => {
  assert.equal(server.list(event('user',{admin:'1'})).status,400);
  assert.equal(server.launch(event('user',{force:'1'}),'brain-mri').status,400);
  assert.equal(server.launch(event('user',{mode:['explore','guided']}),'brain-mri').status,400);
});
test('launch is always denied for unreleased clinical studio',()=>{
  assert.equal(server.launch(event(),'brain-mri').status,409);
  assert.equal(server.launch(event('admin'),'brain-mri').status,409);
});
test('hidden fixture is indistinguishable from unknown studio',()=>{
  const e=event();
  assert.deepEqual(server.launch(e,'foundation-fixture').status,server.launch(e,'does-not-exist').status);
});
test('agent/superuser is not treated as studio user',()=>{
  assert.throws(()=>server.list(event('agent')),ForbiddenError);
  const su=event();su.auth={collection:()=>({name:'_superusers'}),getBool:()=>false,getString:()=>''};
  assert.throws(()=>server.list(su),UnauthorizedError);
});
test('deleted/disabled accounts are rejected at current-request auth check',()=>{
  const disabled=event();disabled.auth.getBool=(key)=>key==='disabled';
  assert.throws(()=>server.list(disabled),ForbiddenError);
});
