// Technical fixture proving independent loading and host handshake.
// Never contains clinical assets, answers, patient data, or PocketBase tokens.
const root = document.getElementById('root');
const status = document.getElementById('status');
const echo = document.getElementById('echo');
let port = null, active = false;
const origin = window.location.origin;
// Build-time identity: the same neutral fixture bytes can be built as the internal fixture or a test-only studio.
const STUDIO_ID = import.meta.env.VITE_STUDIO_ID || 'foundation-fixture';
function post(type,payload) {
  if (!port || !active) return;
  port.postMessage({v:1,type,at:Date.now(),payload});
}
function onLaunch(event) {
  if (event.origin !== origin || event.source !== window.parent ||
      event.data?.type !== 'host.launch' || event.data?.v !== 1 ||
      !event.ports?.length || port) return;
  const launch = event.data.launch;
  if (launch?.studioId !== STUDIO_ID || launch?.releaseId !== 'fixture-release') return;
  port = event.ports[0]; active = true;
  echo.disabled = false; status.textContent = 'Fixture siap (engineering-only).';
  port.onmessage = e => {
    if (e.data?.v !== 1 || e.data?.type !== 'host.command') return;
    if (e.data.payload?.name !== 'fixture-echo') { post('studio.error',{code:'unsupported'}); return; }
    post('studio.action',{kind:'fixture-echo',value:'ok'});
  };
  post('studio.ready',{releaseId:'fixture-release',capabilities:['fixture-echo']});
}
window.addEventListener('message',onLaunch);
echo.addEventListener('click',()=>post('studio.action',{kind:'fixture-echo',value:'user-click'}));
window.addEventListener('pagehide',()=>{ active=false;port?.close();port=null; });
if (window.parent !== window) window.parent.postMessage({v:1,type:'studio.hello'},origin);
else status.textContent = 'Standalone technical fixture. No launch authorization.';
root.dataset.studio = STUDIO_ID;
