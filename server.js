const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '7003', 10);
const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50MB max request body

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.pdf':  'application/pdf',
  '.map':  'application/json',
};

// [P3修复] 统一 CORS 头：允许任意来源（内部局域网工具），避免浏览器跨域报 "Failed to fetch"
function corsHeaders(req) {
  const origin = req.headers.origin || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Origin,Accept,X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };
}

// [P0修复] 代理所有后端API路径
const API_PATHS = ['/api/', '/achievement/', '/voteRound/', '/voteResult/'];

function isApiPath(url) {
  return API_PATHS.some(p => url.startsWith(p));
}

function proxy(req, res) {
  // /api/files/ 不剥离前缀（后端 WebConfig 映射为 /api/files/**）
  // 其余 /api/ 路径剥离前缀后转发
  const targetPath = req.url.startsWith('/api/files/')
    ? req.url
    : req.url.startsWith('/api/')
      ? req.url.replace(/^\/api/, '') || '/'
      : req.url;

  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: targetPath,
    method: req.method,
    headers: {},
  };

  // Copy headers, strip browser CORS headers to avoid cross-origin rejection
  for (const key of Object.keys(req.headers)) {
    if (key === 'host' || key === 'origin' || key === 'referer') continue;
    if (key === 'content-length' && !req.headers['content-length']) continue;
    options.headers[key] = req.headers[key];
  }
  options.headers['host'] = BACKEND_HOST + ':' + BACKEND_PORT;

  const proxyReq = http.request(options, (proxyRes) => {
    // 把 CORS 头合并进代理响应，确保浏览器（含跨域/平板）能正常接收
    const outHeaders = Object.assign({}, proxyRes.headers, corsHeaders(req));
    res.writeHead(proxyRes.statusCode, outHeaders);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Backend unavailable on port ' + BACKEND_PORT);
  });
  req.pipe(proxyReq);
}

http.createServer((req, res) => {
  // [P3修复] 跨域预检：浏览器对带自定义头/JSON 的跨域请求会先发 OPTIONS
  // 在代理层直接返回 204 + 允许头，避免预检失败导致 "Failed to fetch"
  if (req.method === 'OPTIONS' && isApiPath(req.url)) {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }

  // [P0修复] 代理所有后端API路径（/api/*, /achievement/*, /voteRound/*, /voteResult/*）
  if (isApiPath(req.url)) {
    // [P2修复] 限制请求体大小，防止大文件上传撑爆内存
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (contentLength > MAX_BODY_SIZE) {
      res.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Request body too large, max ' + (MAX_BODY_SIZE / 1024 / 1024) + 'MB');
      return;
    }
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

  // 禁止 JS 文件缓存，保证热更新生效
  if (ext === '.js') {
    res.writeHead(200, Object.assign({
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }, corsHeaders(req)));
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: return index.html for any unknown route
      res.writeHead(200, Object.assign({
        'Content-Type': 'text/html; charset=utf-8'
      }, corsHeaders(req)));
      fs.createReadStream(path.join(ROOT, 'index.html')).pipe(res);
      return;
    }
    res.writeHead(200, Object.assign({
      'Content-Type': MIME[ext] || 'application/octet-stream'
    }, corsHeaders(req)));
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('Frontend: http://localhost:' + PORT);
  console.log('API proxy: /achievement/*, /voteRound/*, /voteResult/*, /api/* -> ' + BACKEND_HOST + ':' + BACKEND_PORT);
});
