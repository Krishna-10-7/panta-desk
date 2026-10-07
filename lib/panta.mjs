import { sampleAsOf, sampleCategories, sampleMarkets, sampleTrades } from '../fixtures/markets.mjs';

export const API_BASE = 'https://live-api.panta.market/api/v1/';
export const PHASES = new Set(['primary', 'secondary', 'resolved', 'cancelled']);
const BASE58_ID = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SAMPLE_ID = /^sample-[a-z0-9-]{1,64}$/;
const CATEGORY = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MAX_RESPONSE_BYTES = 1024 * 1024;

export class DeskError extends Error {
  constructor(status, code, message, retryAfter) {
    super(message);
    this.status = status;
    this.code = code;
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
  }
}
const badQuery = () => new DeskError(400, 'INVALID_QUERY', 'Use a supported category, phase, cursor and page size.');
export function getConfig(env = process.env) {
  const hasApiKey = Boolean(env.PANTA_API_KEY?.trim());
  const flag = env.PANTA_DEMO?.trim().toLowerCase();
  const demoExplicit = flag === 'true';
  const mode = demoExplicit ? 'demo' : hasApiKey ? env.PANTA_API_KEY.trim().startsWith('pk_test_') ? 'sandbox' : 'configured' : flag === 'false' ? 'needs-key' : 'demo';
  return Object.freeze({ mode, hasApiKey, demoExplicit, needsApiKey: !hasApiKey, provider: 'Panta API', readOnly: true });
}

export function parseRoute(pathname, searchParams, mode) {
  const segments = pathname.split('/');
  let route;
  if (pathname === '/api/categories') route = { kind: 'categories' };
  else if (pathname === '/api/markets') route = { kind: 'markets' };
  else if (segments.length === 4 && segments[1] === 'api' && segments[2] === 'markets') route = { kind: 'market', id: segments[3] };
  else if (segments.length === 5 && segments[1] === 'api' && segments[2] === 'markets' && segments[4] === 'trades') route = { kind: 'trades', id: segments[3] };
  else throw new DeskError(404, 'NOT_FOUND', 'This read endpoint does not exist.');
  if (route.id && !(mode === 'demo' ? SAMPLE_ID.test(route.id) : BASE58_ID.test(route.id))) {
    throw new DeskError(400, 'INVALID_MARKET_ID', 'Choose a valid market from the catalog.');
  }
  const permitted = route.kind === 'markets' ? new Set(['category', 'status', 'cursor', 'limit']) : route.kind === 'trades' ? new Set(['limit']) : new Set();
  for (const name of searchParams.keys()) {
    if (!permitted.has(name) || searchParams.getAll(name).length !== 1) throw badQuery();
  }
  const query = {};
  for (const [name, value] of searchParams) {
    if (value === '' && name !== 'limit') continue;
    if (name === 'category' && !CATEGORY.test(value)) throw badQuery();
    if (name === 'status' && !PHASES.has(value)) throw badQuery();
    // The live provider uses a base64url cursor, longer than a market address.
    // It stays in URLSearchParams; it never becomes a path or a hostname.
    if (name === 'cursor' && (!/^[A-Za-z0-9_+\-/=.]{1,2048}$/.test(value))) throw badQuery();
    if (name === 'limit') {
      const cap = route.kind === 'trades' ? 200 : 50;
      if (!/^\d{1,3}$/.test(value) || Number(value) < 1 || Number(value) > cap) throw badQuery();
    }
    query[name] = value;
  }
  if (route.kind === 'markets' && !query.limit) query.limit = '20';
  if (route.kind === 'trades' && !query.limit) query.limit = '50';
  return { ...route, query };
}

function upstreamUrl(route) {
  // No caller-provided host, protocol, headers, methods or arbitrary paths.
  let path;
  if (route.kind === 'categories') path = 'categories/';
  else if (route.kind === 'markets') path = 'markets/';
  else if (route.kind === 'market' && BASE58_ID.test(route.id)) path = `markets/${route.id}/`;
  else if (route.kind === 'trades' && BASE58_ID.test(route.id)) path = `markets/${route.id}/trades/`;
  else throw new DeskError(400, 'INVALID_ROUTE', 'This read endpoint is not supported.');
  const url = new URL(path, API_BASE);
  for (const [name, value] of Object.entries(route.query ?? {})) url.searchParams.set(name, value);
  return url;
}

function demoData(route) {
  if (route.kind === 'categories') return { categories: [...sampleCategories] };
  if (route.kind === 'markets') {
    let rows = sampleMarkets.filter((m) => (!route.query.category || m.category === route.query.category) && (!route.query.status || m.phase === route.query.status));
    if (route.query.cursor) {
      const position = rows.findIndex((m) => m.marketId === route.query.cursor);
      if (position < 0) throw badQuery();
      rows = rows.slice(position + 1);
    }
    const limit = Number(route.query.limit);
    const items = rows.slice(0, limit).map((m) => ({ ...m, yesPrice: null, noPrice: null, primaryYesPrice: null, primaryNoPrice: null, secondaryYesPrice: null, secondaryNoPrice: null }));
    return { items, nextCursor: rows.length > limit ? items.at(-1).marketId : null };
  }
  const market = sampleMarkets.find((m) => m.marketId === route.id);
  if (!market) throw new DeskError(404, 'MARKET_NOT_FOUND', 'This market is not in the sample catalog.');
  if (route.kind === 'market') return structuredClone(market);
  return { marketId: route.id, items: structuredClone(sampleTrades[route.id] ?? []).slice(0, Number(route.query.limit)) };
}

async function readJson(response) {
  const announced = Number(response.headers.get('content-length'));
  if (announced > MAX_RESPONSE_BYTES) throw new DeskError(502, 'PANTA_BAD_RESPONSE', 'The provider response was too large.');
  let size = 0;
  const chunks = [];
  if (!response.body) throw new DeskError(502, 'PANTA_BAD_RESPONSE', 'The provider returned no data.');
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > MAX_RESPONSE_BYTES) throw new DeskError(502, 'PANTA_BAD_RESPONSE', 'The provider response was too large.');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new DeskError(502, 'PANTA_BAD_RESPONSE', 'The provider returned an unreadable response.'); }
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nullableString = (value) => value === undefined || value === null || typeof value === 'string';
const nullableAmount = (value) => value === undefined || value === null ||
  ((typeof value === 'string' || typeof value === 'number') && Number.isFinite(Number(value)) && Number(value) >= 0);
function nullableTimestamp(value) {
  if (value === undefined || value === null || value === '') return true;
  // Unix seconds and ISO date strings are both used by Panta. Match the Date
  // range so a malformed or overflowing timestamp cannot reach date rendering.
  if (typeof value === 'number' || (typeof value === 'string' && /^[+-]?\d+(\.\d+)?$/.test(value))) {
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds >= 0 && seconds <= 8.64e12;
  }
  if (typeof value !== 'string' || value.length > 128) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && milliseconds >= 0;
}
function validMarket(market) {
  return isObject(market) && typeof market.marketId === 'string' && BASE58_ID.test(market.marketId) &&
    typeof market.title === 'string' &&
    ['description', 'resolutionRule', 'category', 'phase', 'priceSource', 'valuationStatus'].every((field) => nullableString(market[field])) &&
    (market.sources === undefined || market.sources === null || (Array.isArray(market.sources) && market.sources.every((source) => typeof source === 'string'))) &&
    ['startTime', 'endTime', 'resolutionTime'].every((field) => nullableTimestamp(market[field])) &&
    ['yesPrice', 'noPrice', 'volumeUsdc'].every((field) => nullableAmount(market[field]));
}
function validTrade(trade) {
  return isObject(trade) && nullableString(trade.signature) &&
    nullableTimestamp(trade.blockTime) && nullableTimestamp(trade.timestamp);
}

function validateBody(route, data) {
  if (!isObject(data)) throw new DeskError(502, 'PANTA_BAD_RESPONSE', 'The provider returned an unexpected response.');
  if (route.kind === 'categories' && (!Array.isArray(data.categories) || !data.categories.every((x) => typeof x === 'string' && CATEGORY.test(x)))) {
    throw new DeskError(502, 'PANTA_BAD_RESPONSE', 'The provider category data is unavailable.');
  }
  if (route.kind === 'markets' && (!Array.isArray(data.items) || !data.items.every(validMarket) || !nullableString(data.nextCursor))) {
    throw new DeskError(502, 'PANTA_BAD_RESPONSE', 'The provider catalog data is unavailable.');
  }
  if (route.kind === 'market' && (data.marketId !== route.id || !validMarket(data))) {
    throw new DeskError(502, 'PANTA_BAD_RESPONSE', 'The provider market data is unavailable.');
  }
  if (route.kind === 'trades' && (data.marketId !== route.id || !Array.isArray(data.items) || !data.items.every(validTrade))) {
    throw new DeskError(502, 'PANTA_BAD_RESPONSE', 'The provider trade sample is unavailable.');
  }
  return data;
}

export function createPantaClient({ apiKey = '', mode = 'demo', fetchImpl = fetch, timeoutMs = 8000, now = () => new Date() } = {}) {
  apiKey = apiKey.trim();
  // This is scoped to one configured client, so changing keys/restarting resets it.
  let sandboxObserved = mode === 'sandbox' || apiKey.startsWith('pk_test_');
  return {
    mode,
    async read(route) {
      if (mode === 'needs-key' || (mode !== 'demo' && !apiKey.trim())) {
        throw new DeskError(503, 'CONFIG_REQUIRED', 'Add a Panta API key to the server environment or enable demo mode.');
      }
      if (mode === 'demo') return { data: demoData(route), meta: { mode: 'demo', retrievedAt: now().toISOString(), source: 'Sample data', sampleAsOf } };
      const url = upstreamUrl(route);
      const controller = new AbortController();
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new DeskError(504, 'PANTA_TIMEOUT', 'Panta did not respond in time. Please retry.'));
        }, timeoutMs);
      });
      try {
        const operation = (async () => {
          const response = await fetchImpl(url, { method: 'GET', headers: { 'X-Api-Key': apiKey, Accept: 'application/json' }, redirect: 'error', signal: controller.signal });
          if (!response.ok) {
            // Never forward error bodies: they may echo credentials or internal details.
            await response.body?.cancel().catch(() => {});
            if (response.status === 401 || response.status === 403) throw new DeskError(502, 'PANTA_AUTH_ERROR', 'Panta rejected the configured API key. Check the server configuration.');
            if (response.status === 429) {
              const raw = response.headers.get('retry-after');
              const retryAfter = raw && /^\d+$/.test(raw) ? Math.min(3600, Number(raw)) : undefined;
              throw new DeskError(429, 'PANTA_RATE_LIMIT', 'Panta is limiting requests. Please try again later.', retryAfter);
            }
            if (response.status === 404) throw new DeskError(404, 'PANTA_NOT_FOUND', 'Panta could not find this market.');
            throw new DeskError(502, 'PANTA_UNAVAILABLE', 'Panta is temporarily unavailable. Please retry.');
          }
          const data = validateBody(route, await readJson(response));
          if (JSON.stringify(data).includes(apiKey)) throw new DeskError(502, 'PANTA_BAD_RESPONSE', 'The provider response could not be displayed safely.');
          const disclaimer = typeof data.disclaimer === 'string' ? data.disclaimer : undefined;
          sandboxObserved ||= Boolean(disclaimer && /sandbox|test mode|fixtures|not on mainnet|does not access Solana mainnet/i.test(disclaimer));
          const meta = { mode: sandboxObserved ? 'sandbox' : 'live', retrievedAt: now().toISOString(), source: sandboxObserved ? 'Panta sandbox' : 'Panta API' };
          if (disclaimer) meta.disclaimer = disclaimer;
          return { data, meta };
        })();
        return await Promise.race([operation, timeout]);
      } catch (error) {
        if (error instanceof DeskError) throw error;
        if (controller.signal.aborted) throw new DeskError(504, 'PANTA_TIMEOUT', 'Panta did not respond in time. Please retry.');
        throw new DeskError(502, 'PANTA_UNAVAILABLE', 'Panta is temporarily unavailable. Please retry.');
      } finally { clearTimeout(timer); }
    },
  };
}
