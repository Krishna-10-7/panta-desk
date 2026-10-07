import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { createDeskServer, staticPath } from '../server.mjs';
import { API_BASE, createPantaClient as makePantaClient, getConfig, parseRoute } from '../lib/panta.mjs';
import { createUpstreamBudget } from '../lib/read-controls.mjs';

// Each fixture scenario owns a budget; one scenario's 429 must not cool down another.
const createPantaClient = (options) => makePantaClient({ budget:createUpstreamBudget(), ...options });

const MARKET = '11111111111111111111111111111111';
const SANDBOX_MARKET = 'TestMarket1111111111111111111111111111111';
const route = (path, query = '', mode = 'configured') => parseRoute(path, new URLSearchParams(query), mode);
const stamp = () => new Date('2026-10-07T07:00:00.000Z');
const jsonResponse = (value, init) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' }, ...init });

test('missing key defaults to clearly marked local demo; explicit false requires a key', () => {
  assert.equal(getConfig({}).mode, 'demo');
  assert.equal(getConfig({ PANTA_DEMO: 'false' }).mode, 'needs-key');
  assert.equal(getConfig({ PANTA_API_KEY: 'pk_test_hidden' }).mode, 'sandbox');
  assert.equal(getConfig({ PANTA_API_KEY: 'pk_live_hidden' }).mode, 'configured');
  const settings = getConfig({ PANTA_API_KEY: 'pk_live_hidden', PANTA_DEMO: 'true' });
  assert.equal(settings.mode, 'demo');
  assert.equal(JSON.stringify(settings).includes('pk_live_hidden'), false);
});

test('routes allow only catalog GET shapes with validated phases, limits and parameters', () => {
  assert.equal(route('/api/markets', 'status=secondary&limit=50').query.status, 'secondary');
  assert.equal(route(`/api/markets/${MARKET}/trades`, 'limit=200').query.limit, '200');
  const opaqueCursor = 'eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTAzVDIyOjI4OjAxLjM3MzAwMCswMDowMCIsImlkIjoiMnZ5ZEdoMUVQQ0NiekJuY0FaRmNBYmlpV1o5QTZ1dXh0M0F5OUxmM3FkWlUifQ';
  assert.equal(route('/api/markets', new URLSearchParams({ cursor: opaqueCursor }).toString()).query.cursor, opaqueCursor);
  for (const query of ['status=open', 'limit=51', 'limit=0', 'limit=1.5', 'limit=1&limit=2', 'apiKey=hidden', 'cursor=https://evil.example', 'category=../../account']) {
    assert.throws(() => route('/api/markets', query));
  }
  for (const path of ['/api/auth/register', '/api/markets/create', '/api/positions', '/api/markets/../../account', '/api/markets/%2e%2e', '/api/markets/' + MARKET + '/claim']) {
    assert.throws(() => route(path));
  }
  assert.throws(() => route('/api/markets/sample-report', '', 'configured'));
  assert.equal(route('/api/markets/sample-report', '', 'demo').id, 'sample-report');
});

test('demo fixtures have explicit provenance, absent on-chain signatures and documented null list prices', async () => {
  const client = createPantaClient({ mode: 'demo', now: stamp, fetchImpl: () => { throw new Error('Demo must not fetch.'); } });
  const response = await client.read(route('/api/markets', 'limit=2', 'demo'));
  assert.equal(response.meta.mode, 'demo');
  assert.equal(response.meta.source, 'Sample data');
  assert.equal(response.meta.retrievedAt, stamp().toISOString());
  assert.equal(response.data.items.length, 2);
  assert.equal(response.data.nextCursor, 'sample-upgrade');
  assert.ok(response.data.items.every((market) => market.yesPrice === null && market.noPrice === null));
  const lastPage = await client.read(route('/api/markets', 'limit=50&cursor=sample-upgrade', 'demo'));
  assert.equal(lastPage.data.items[0].marketId, 'sample-survey');
  const detail = await client.read(route('/api/markets/sample-upgrade', '', 'demo'));
  assert.equal(detail.data.yesPrice, null);
  assert.equal(detail.data.resolutionTime, null);
  const trades = await client.read(route('/api/markets/sample-report/trades', '', 'demo'));
  assert.ok(trades.data.items.length > 0);
  assert.ok(trades.data.items.every((t) => t.signature === null && t.wallet === null));
});

test('authenticated reads target only the fixed Panta host and do not expose the key', async () => {
  const key = 'pk_live_this-is-a-test-secret';
  let request;
  const client = createPantaClient({ apiKey: key, mode: 'configured', now: stamp, fetchImpl: async (url, options) => {
    request = { url, options };
    return jsonResponse({ items: [{ marketId: MARKET, title: 'Catalog record', yesPrice: null }], nextCursor: null });
  } });
  const response = await client.read(route('/api/markets', 'category=crypto&status=primary&limit=20'));
  assert.equal(request.url.origin, new URL(API_BASE).origin);
  assert.equal(request.url.pathname, '/api/v1/markets/');
  assert.equal(request.options.method, 'GET');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.headers['X-Api-Key'], key);
  assert.equal(request.url.searchParams.get('status'), 'primary');
  assert.equal(String(request.url).includes(key), false);
  assert.equal(JSON.stringify(response).includes(key), false);
  assert.equal(response.meta.mode, 'live');
  assert.equal(response.data.items[0].yesPrice, null);
});

test('actual sandbox-shaped data preserves its disclaimer, ISO dates and populated list prices', async () => {
  const disclaimer = 'Test mode: this response uses sandbox fixtures and does not access Solana mainnet.';
  const data = { items: [{ marketId: SANDBOX_MARKET, title: 'Sandbox test market', endTime: '2026-12-31T23:59:59Z', yesPrice: '0.50', noPrice: '0.50' }], nextCursor: null, disclaimer };
  const client = createPantaClient({ apiKey: 'pk_test_hidden', mode: 'sandbox', now: stamp, fetchImpl: async () => jsonResponse(data) });
  const response = await client.read(route('/api/markets', '', 'sandbox'));
  assert.equal(response.meta.mode, 'sandbox');
  assert.equal(response.meta.source, 'Panta sandbox');
  assert.equal(response.meta.disclaimer, disclaimer);
  assert.equal(response.data.disclaimer, disclaimer);
  assert.equal(response.data.items[0].endTime, '2026-12-31T23:59:59Z');
  assert.equal(response.data.items[0].yesPrice, '0.50');
  const opaqueKeyClient = createPantaClient({ apiKey: 'opaque-key', mode: 'configured', fetchImpl: async () => jsonResponse(data) });
  assert.equal((await opaqueKeyClient.read(route('/api/markets'))).meta.mode, 'sandbox');
  const freshClient = createPantaClient({ apiKey: 'pk_live_other-key', mode: 'configured', fetchImpl: async () => jsonResponse({ categories: ['crypto'] }) });
  assert.equal((await freshClient.read(route('/api/categories'))).meta.mode, 'live');
});

test('upstream auth errors and accidental secret echoes are sanitized', async () => {
  const key = 'pk_live_sensitive-secret';
  const client = createPantaClient({ apiKey: key, mode: 'configured', fetchImpl: async () => jsonResponse({ message: key, stack: 'private server details' }, { status: 401 }) });
  await assert.rejects(client.read(route('/api/categories')), (error) => error.code === 'PANTA_AUTH_ERROR' && !error.message.includes(key) && !error.message.includes('private'));
  const echo = createPantaClient({ apiKey: key, mode: 'configured', fetchImpl: async () => jsonResponse({ categories: ['crypto'], internal: key }) });
  await assert.rejects(echo.read(route('/api/categories')), (error) => error.code === 'PANTA_BAD_RESPONSE' && !error.message.includes(key));
});

test('malformed consumed market and trade fields fail safely before reaching the dashboard', async () => {
  const key = 'pk_live_validation-secret';
  const read = (path, body) => createPantaClient({ apiKey: key, mode: 'configured', fetchImpl: async () => jsonResponse(body) }).read(route(path));
  const market = { marketId: MARKET, title: '', description: null, resolutionRule: null, sources: [], endTime: 1791230400, resolutionTime: '2026-10-05T20:00:00Z', yesPrice: null, noPrice: '0.5' };
  const accepted = await read(`/api/markets/${MARKET}`, market);
  assert.deepEqual(accepted.data, market); // Missing fields and empty-title fallback remain supported.
  for (const patch of [
    { description: { private: key } }, { resolutionRule: [] }, { sources: ['https://example.org', {}] },
    { category: {} }, { phase: true }, { priceSource: [] }, { title: null }, { marketId: '' },
    { endTime: {} }, { resolutionTime: true }, { startTime: 8.64e12 + 1 }, { endTime: -1 }, { endTime: '-1' },
    { resolutionTime: 'not a date' }, { yesPrice: {} },
  ]) {
    const malformed = { ...market, ...patch };
    for (const [path, body] of [[`/api/markets/${MARKET}`, malformed], ['/api/markets', { items: [malformed], nextCursor: null }]]) {
      await assert.rejects(read(path, body), (error) => error.status === 502 && error.code === 'PANTA_BAD_RESPONSE' && !error.message.includes(key));
    }
  }
  for (const item of [null, [], 'trade', { blockTime: {} }, { timestamp: true }, { timestamp: 8.64e12 + 1 }, { signature: {} }]) {
    await assert.rejects(read(`/api/markets/${MARKET}/trades`, { marketId: MARKET, items: [item] }), (error) => error.code === 'PANTA_BAD_RESPONSE');
  }
  const trades = [{ blockTime: 1791225342, signature: null }, { timestamp: '2026-10-05T20:00:00Z', signature: 'unverified' }, { blockTime: null, timestamp: null }];
  assert.deepEqual((await read(`/api/markets/${MARKET}/trades`, { marketId: MARKET, items: trades })).data.items, trades);
});

test('rate limits preserve only bounded retry timing and timeout remains bounded', async () => {
  const limited = createPantaClient({ apiKey: 'pk_live_rate', mode: 'configured', fetchImpl: async () => jsonResponse({ private: 'not forwarded' }, { status: 429, headers: { 'Retry-After': '90' } }) });
  await assert.rejects(limited.read(route('/api/categories')), (error) => error.status === 429 && error.retryAfter === 90);
  const stalled = createPantaClient({ apiKey: 'pk_live_timeout', mode: 'configured', timeoutMs: 15, fetchImpl: () => new Promise(() => {}) });
  await assert.rejects(stalled.read(route('/api/categories')), (error) => error.status === 504 && error.code === 'PANTA_TIMEOUT');
  const missing = createPantaClient({ mode: 'needs-key' });
  await assert.rejects(missing.read(route('/api/categories')), (error) => error.code === 'CONFIG_REQUIRED');
});

test('static resolution prevents hidden files, encoded traversal and Windows path escapes', () => {
  const root = resolve('public');
  assert.equal(staticPath('/', root), resolve(root, 'index.html'));
  assert.equal(staticPath('/app.js', root), resolve(root, 'app.js'));
  for (const path of ['/.env', '/..%2f.env', '/%2e%2e%2fsecret', '/%5c..%5c.env', '/C:%5cWindows', '/.git/config', '/%00test', '/%ff']) assert.equal(staticPath(path, root), null);
});

test('HTTP surface is read-only, validates requests and never exposes configured credentials', async (t) => {
  const config = getConfig({ PANTA_API_KEY: 'pk_test_do-not-expose' });
  let upstreamCalls = 0;
  const client = createPantaClient({ apiKey: 'pk_test_do-not-expose', mode: config.mode, fetchImpl: async () => {
    upstreamCalls += 1;
    return jsonResponse({ categories: ['crypto'] });
  } });
  const server = createDeskServer({ config, client });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolveClose) => server.close(resolveClose)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const settings = await (await fetch(base + '/api/config')).text();
  assert.equal(settings.includes('pk_test_do-not-expose'), false);
  assert.equal(JSON.parse(settings).mode, 'sandbox');
  const write = await fetch(base + '/api/categories', { method: 'POST', body: 'private' });
  assert.equal(write.status, 405);
  assert.equal((await fetch(base + '/api/markets?key=secret')).status, 400);
  assert.equal((await fetch(base + '/api/markets/%2e%2e')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e%2f.env')).status, 404);
  assert.equal((await fetch(base + '/api/claim')).status, 404);
  assert.equal(upstreamCalls, 0);
  const data = await (await fetch(base + '/api/categories')).json();
  assert.equal(data.meta.mode, 'sandbox');
  assert.equal(upstreamCalls, 1);
});
