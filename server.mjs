import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPantaClient, DeskError, getConfig, parseRoute } from './lib/panta.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

function within(root, candidate) {
  const suffix = relative(root, candidate);
  return suffix !== '..' && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix);
}
export function staticPath(pathname, publicDir = PUBLIC) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (!decoded.startsWith('/') || decoded.includes('\\') || decoded.includes('\0') || decoded.includes(':')) return null;
  const parts = decoded.split('/').filter(Boolean);
  if (parts.some((part) => part.startsWith('.'))) return null;
  const candidate = resolve(publicDir, ...(parts.length ? parts : ['index.html']));
  return within(resolve(publicDir), candidate) ? candidate : null;
}
function json(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(data));
}

export function createDeskServer({ config = getConfig(), client, publicDir = PUBLIC } = {}) {
  const panta = client ?? createPantaClient({ apiKey: process.env.PANTA_API_KEY?.trim(), mode: config.mode });
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'This desk provides read-only GET endpoints.' } }, { Allow: 'GET, HEAD' });
      }
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/api/config') {
        if (req.method !== 'GET') return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for API requests.' } }, { Allow: 'GET' });
        if (url.search) throw new DeskError(400, 'INVALID_QUERY', 'This endpoint does not accept query parameters.');
        return json(res, 200, config);
      }
      if (url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET') return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for API requests.' } }, { Allow: 'GET' });
        const route = parseRoute(url.pathname, url.searchParams, config.mode);
        return json(res, 200, await panta.read(route));
      }
      const candidate = staticPath(url.pathname, publicDir);
      if (!candidate) throw new DeskError(404, 'NOT_FOUND', 'File not found.');
      let actual, actualRoot;
      try { [actual, actualRoot] = await Promise.all([realpath(candidate), realpath(publicDir)]); }
      catch { throw new DeskError(404, 'NOT_FOUND', 'File not found.'); }
      if (!within(actualRoot, actual)) throw new DeskError(404, 'NOT_FOUND', 'File not found.');
      const info = await stat(actual);
      if (!info.isFile()) throw new DeskError(404, 'NOT_FOUND', 'File not found.');
      res.writeHead(200, { 'Content-Type': MIME[extname(actual).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': info.size });
      res.end(req.method === 'HEAD' ? undefined : await readFile(actual));
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      const safe = error instanceof DeskError ? error : new DeskError(500, 'INTERNAL_ERROR', 'The desk could not complete this request.');
      const body = { error: { code: safe.code, message: safe.message } };
      if (safe.retryAfter !== undefined) body.error.retryAfter = safe.retryAfter;
      json(res, safe.status, body, safe.retryAfter === undefined ? {} : { 'Retry-After': String(safe.retryAfter) });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = getConfig();
  const port = process.env.PORT ? Number(process.env.PORT) : 4173;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  const server = createDeskServer({ config });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Panta research desk: http://127.0.0.1:${port} (${config.mode}; read-only)`);
  });
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use.` : 'The local server could not start.');
    process.exitCode = 1;
  });
}
