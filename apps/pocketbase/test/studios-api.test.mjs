// Real HTTP Studio API checks against disposable localhost PocketBase only.
import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.PB_URL || 'http://127.0.0.1:8092';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw Error('Studio API tests must target localhost');
const req = async (method, path, token, body) => {
  const r = await fetch(base + path, {method,headers:{...(token?{Authorization:token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const text = await r.text();
  let data;try{data=JSON.parse(text);}catch{data=text;}
  return {status:r.status,data,headers:r.headers};
};
const auth = async (path,body) => {
  const r=await req('POST',path,null,body);
  assert.equal(r.status,200,JSON.stringify(r.data).slice(0,300));
  return r.data.token;
};
test('Studio API rejects unauthenticated, superuser and forged authorization', async()=>{
  const id='/api/medcoel/studios';
  assert.equal((await req('GET',id)).status,401);
  assert.equal((await req('GET',id+'/brain-mri/launch')).status,401);
  assert.equal((await req('GET',id,'not-a-valid-token')).status,401);
  const token=await auth('/api/collections/_superusers/auth-with-password',{identity:process.env.PB_SU_EMAIL||'study@medcoel.test',password:process.env.PB_SU_PASSWORD||'study-test-password-123'});
  assert.equal((await req('GET',id,token)).status,401);
});
test('Studio list and launch API remain closed for a real student/admin', async()=>{
  const su=await auth('/api/collections/_superusers/auth-with-password',{identity:process.env.PB_SU_EMAIL||'study@medcoel.test',password:process.env.PB_SU_PASSWORD||'study-test-password-123'});
  const suffix=Date.now().toString(36),password='studio-test-password-123';
  const make=async(role)=>{
    const loginId='st'+role+suffix;
    const created=await req('POST','/api/collections/users/records',su,{loginId,name:'Studio '+role,email:loginId+'@example.test',password,passwordConfirm:password,role,verified:true});
    assert.equal(created.status,200,JSON.stringify(created.data).slice(0,250));
    return {id:created.data.id,token:await auth('/api/collections/users/auth-with-password',{identity:loginId,password})};
  };
  const student=await make('user'),admin=await make('admin');
  for(const [who,expected] of [[student,24],[admin,25]]){
    const l=await req('GET','/api/medcoel/studios',who.token);
    assert.equal(l.status,200,JSON.stringify(l.data).slice(0,250));
    assert.equal(l.headers.get('cache-control'),'private, no-store');
    assert.equal(l.data.items.length,expected);
    assert.ok(l.data.items.every(x=>x.availability.canLaunch===false));
    assert.equal((await req('GET','/api/medcoel/studios/brain-mri/launch',who.token)).status,409);
    assert.equal((await req('GET','/api/medcoel/studios/brain-mri/launch?force=1',who.token)).status,400);
    assert.equal((await req('GET','/api/medcoel/studios/brain-mri/launch?mode=guided',who.token)).status,409);
    assert.equal((await req('GET','/api/medcoel/studios/unknown-studio/launch',who.token)).status,404);
  }
  assert.equal((await req('GET','/api/medcoel/studios/foundation-fixture/launch',student.token)).status,404);
  const disable=await req('PATCH','/api/collections/users/records/'+student.id,su,{disabled:true});
  assert.equal(disable.status,200);
  assert.equal((await req('GET','/api/medcoel/studios',student.token)).status,403);
});
