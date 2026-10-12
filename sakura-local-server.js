/* SakuraOS local server: serves this folder over http://localhost so YouTube
   playback works. (Browsers send no referrer for pages opened as file:// and
   YouTube blocks those players with error 153.)
   Double-click "Open SakuraOS.bat" rather than running this directly. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = __dirname;
const DEFAULT_FILE = 'SakuraOS v1.3.html';
const PORTS = [8123, 8124, 8125, 8126];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

/* Kuroshi (the browser embedded in the site) asks the page's own origin for
   search suggestions; reuse the feed logic from its copied server.mjs when
   that file exists. Loaded asynchronously: until it resolves, /api/suggest
   answers 404 and Kuroshi falls back to its browser-side feeds. */
let kuroshiSuggest = null;
import(require('url').pathToFileURL(require('path').join(ROOT, 'server.mjs')).href)
  .then((m) => { kuroshiSuggest = m.suggest; })
  .catch(() => { kuroshiSuggest = false; });

const server = http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]); } catch (e) { rel = '/'; }
  if (rel.indexOf('/api/suggest') === 0) {
    const sendJson = (code, body) => {
      res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600'
      });
      res.end(JSON.stringify(body));
    };
    let engine = 'duckduckgo';
    let q = '';
    try {
      const u = new URL(req.url, 'http://localhost');
      engine = u.searchParams.get('engine') || 'duckduckgo';
      q = (u.searchParams.get('q') || '').slice(0, 80);
    } catch (e) { /* unparsable query: answer [] below */ }
    if (!q) return sendJson(200, []);
    if (kuroshiSuggest === false) return sendJson(404, []); // copy missing: client falls back to browser feeds
    if (!kuroshiSuggest) return sendJson(503, []); // still loading: keep the client's proxy mode for a retry
    kuroshiSuggest(engine, q).then((items) => sendJson(200, items)).catch(() => sendJson(200, []));
    return;
  }
  if (rel === '/' || rel === '') rel = '/' + DEFAULT_FILE;
  const file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(file).pipe(res);
  });
});

function listen(i) {
  if (i >= PORTS.length) {
    console.error('No free port found (tried ' + PORTS.join(', ') + ').');
    process.exit(1);
  }
  const port = PORTS[i];
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && i + 1 < PORTS.length) {
      console.log('Port ' + port + ' is busy, trying ' + PORTS[i + 1] + ' ...');
      listen(i + 1);
    } else {
      console.error('Server error: ' + e.message);
      process.exit(1);
    }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = 'http://localhost:' + port + '/';
    console.log('');
    console.log('  SakuraOS is running at ' + url);
    console.log('');
    console.log('  Keep this window open while you use the site.');
    console.log('  Close it (or press Ctrl+C) to stop the server.');
    console.log('');
    if (process.argv.indexOf('--no-open') === -1) {
      exec('start "" "' + url + '"');
    }
  });
}

listen(0);
