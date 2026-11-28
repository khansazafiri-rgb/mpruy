// Defense in depth for loopback review. No CORS exemptions.
export function privateRequestAllowed(req,port){
 const origin='http://127.0.0.1:'+port;
 return req.headers.host==='127.0.0.1:'+port&&['GET','HEAD'].includes(req.method)&&
  (req.headers.origin===undefined||req.headers.origin===origin)&&
  !['cross-site','same-site'].includes(req.headers['sec-fetch-site']);
}
