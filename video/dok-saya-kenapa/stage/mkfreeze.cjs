const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1080,height:1920}})).newPage();
  p.on('pageerror',e=>console.log('pageerror',e.message));
  await p.goto('http://127.0.0.1:8126/index.html?clean=1&nocam=1'); await p.waitForFunction(()=>window.__ready,null,{timeout:30000});
  await p.evaluate(async()=>{await window.renderFrame(25.38)});
  await p.screenshot({path:'stage/freeze.jpg',type:'jpeg',quality:92});
  await b.close();
})();
