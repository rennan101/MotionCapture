const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const ROOT = process.env.ROOT || path.join(__dirname, '..', 'apps', 'web', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let f = decodeURIComponent(url.pathname);
  if (f === '/') f = '/index.html';
  if (f.startsWith('/assets/')) f = f.slice(1);
  const fp = path.resolve(ROOT, f);
  if (!fp.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  fs.stat(fp, (e, st) => {
    if (e) {
      res.writeHead(404);
      res.end('not found: ' + f);
      return;
    }
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    fs.createReadStream(fp).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Motion Forge static server listening on http://127.0.0.1:' + PORT);
  console.log('Serving from', ROOT);
});
