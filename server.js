const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 7003;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function proxy(req, res) {
  // Strip /api prefix before forwarding to backend
  const targetPath = req.url.replace(/^\/api/, '') || '/';
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: targetPath,
    method: req.method,
    headers: {},
  };

  // Copy headers, fix host
  for (const key of Object.keys(req.headers)) {
    if (key === 'host') continue;
    if (key === 'content-length' && !req.headers['content-length']) continue;
    options.headers[key] = req.headers[key];
  }
  options.headers['host'] = BACKEND_HOST + ':' + BACKEND_PORT;

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Backend unavailable on port ' + BACKEND_PORT);
  });
  req.pipe(proxyReq);
}

http.createServer((req, res) => {
  // Proxy all /api/* requests to backend (strip /api prefix)
  if (req.url.startsWith('/api/')) {
    return proxy(req, res);
  }

  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') {
    urlPath = '/index.html';
  }

  let filePath = path.join(ROOT, urlPath);

  try {
    if (fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) {}

  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: return index.html for any unknown route
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(path.join(ROOT, 'index.html')).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('Frontend: http://localhost:' + PORT);
  console.log('API proxy: /api/* -> localhost:' + BACKEND_PORT);
});
