// Read-only HTTP verification; accepts localhost staging or the approved public site.
const base=(process.env.ANATOMY_SMOKE_BASE||'http://127.0.0.1:4198').replace(/\/$/,'');
for(const file of ['', 'data/systems.json','data/atlas-catalog.json','draco/draco_decoder.wasm','models/skeletal.glb','__missing__.glb']){
 const response=await fetch(base+'/anatomy/viewer/'+file,{signal:AbortSignal.timeout(20000)}),expected=file==='__missing__.glb'?404:200;
 console.log(response.status+' '+file+' '+(response.headers.get('content-type')||''));
 if(response.status!==expected)throw Error('Unexpected HTTP status: '+file);
 if(file.endsWith('.wasm')&&!response.headers.get('content-type')?.includes('application/wasm'))throw Error('Wrong WASM MIME');
 if(file==='models/skeletal.glb'&&!response.headers.get('content-type')?.includes('model/gltf-binary'))throw Error('Wrong GLB MIME');
 await response.body?.cancel();
}
