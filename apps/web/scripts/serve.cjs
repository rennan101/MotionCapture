#!/usr/bin/env node
/**
 * Simple static file server for the Motion Forge vanilla web app.
 * Serves from dist/ on port 5173, with live reload via polling.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DIST = path.resolve(process.cwd(), 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.fbx': 'application/octet-stream',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0].replace(/\/+/g, '/');
  
  if (url === '/' || url === '/index.html') {
    const filePath = path.join(DIST, 'index.html');
    serveFile(res, filePath, 'text/html; charset=utf-8');
    return;
  }

  const filePath = path.join(DIST, url);
  const ext = path.extname(filePath);
  
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    serveFile(res, filePath, MIME[ext] || 'application/octet-stream');
  });
});

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

server.listen(PORT, () => {
  console.log(`Motion Forge web dev server: http://localhost:${PORT}`);
  console.log(`Serving from: ${DIST}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});
