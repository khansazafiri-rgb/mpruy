// Standalone static server for the reviewed production build. No npm packages.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("./dist/", import.meta.url));
const port = Number(process.env.PORT || 4174),
  host = process.env.HOST || "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
};
const server = createServer(async (req, res) => {
  try {
    let requested = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if(requested==='/' || requested==='/anatomy/') {res.writeHead(302,{Location:'/anatomy'});res.end();return;}
    if(requested==='/anatomy'){
      const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Human Anatomy | MEDCOEL Preview</title></head><body style="margin:0"><iframe title="Human Anatomy" src="/anatomy/viewer/" allow="clipboard-write" style="width:100%;height:100dvh;border:0;display:block"></iframe></body></html>';
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(html);return;
    }
    if(!requested.startsWith('/anatomy/viewer/')){res.writeHead(404);res.end('Preview only. Return to /anatomy');return;}
    requested=requested.slice('/anatomy/viewer'.length);
    const file = path.resolve(
      root,
      "." + (requested === "/" ? "/index.html" : requested),
    );
    if (!file.startsWith(root) || !["GET", "HEAD"].includes(req.method)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const entry = await stat(file);
    if (!entry.isFile()) throw Error("not a file");
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "text/plain; charset=utf-8",
      "Content-Length": entry.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});
server.on("error", (err) => {
  console.error(`Unable to start atlas: ${err.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () =>
  console.log(`MEDCOEL Anatomy: http://${host}:${port}/`),
);
