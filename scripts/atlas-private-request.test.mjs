import test from 'node:test';import assert from 'node:assert/strict';
import {privateRequestAllowed} from './atlas-private-request.mjs';
test('private review accepts local CLI and same-origin GET/HEAD only',()=>{
 const req={method:'GET',headers:{host:'127.0.0.1:4198'}};
 assert(privateRequestAllowed(req,4198));
 assert(privateRequestAllowed({...req,method:'HEAD',headers:{...req.headers,origin:'http://127.0.0.1:4198','sec-fetch-site':'same-origin'}},4198));
 for(const method of ['POST','OPTIONS','PUT','DELETE'])assert(!privateRequestAllowed({...req,method},4198));
 for(const host of ['evil.example:4198','localhost:4198','127.0.0.1:4199'])assert(!privateRequestAllowed({...req,headers:{host}},4198));
 for(const origin of ['null','https://evil.example','http://127.0.0.1:4199'])assert(!privateRequestAllowed({...req,headers:{...req.headers,origin}},4198));
 for(const site of ['cross-site','same-site'])assert(!privateRequestAllowed({...req,headers:{...req.headers,'sec-fetch-site':site}},4198));
});
