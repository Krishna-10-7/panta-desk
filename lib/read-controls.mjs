import { DeskError } from './panta.mjs';

const monotonicNow = () => performance.now();
const WINDOW_MS = 60_000;
const REQUEST_LIMIT = 100;
const CACHE_LIMIT = 100;

// One shared budget for this Node process, across every configured client.
// Replicas and restarted processes need a shared external limiter before scaling.
export function createUpstreamBudget({ clock = monotonicNow } = {}) {
  let starts = [];
  let cooldownUntil = 0;
  return {
    reserve() {
      const time = clock();
      starts = starts.filter((start) => start > time - WINDOW_MS);
      if (time < cooldownUntil) throw new DeskError(429, 'PANTA_RATE_LIMIT', 'Panta is limiting shared requests. Please try again later.', Math.max(1, Math.ceil((cooldownUntil - time) / 1000)));
      if (starts.length >= REQUEST_LIMIT) throw new DeskError(429, 'DESK_RATE_LIMIT', 'The shared desk request budget is busy. Please try again later.', Math.max(1, Math.ceil((starts[0] + WINDOW_MS - time) / 1000)));
      starts.push(time); // Failures and aborted requests still consumed a slot.
    },
    coolDown(seconds = 60) {
      const delay = Number.isFinite(seconds) ? Math.max(1, Math.min(3600, Math.ceil(seconds))) : 60;
      const time = clock();
      cooldownUntil = Math.max(cooldownUntil, time + delay * 1000);
      return Math.max(1, Math.ceil((cooldownUntil - time) / 1000));
    },
  };
}

export const processUpstreamBudget = createUpstreamBudget();

function cacheKey(route) {
  return JSON.stringify([route.kind, route.id ?? '', Object.entries(route.query ?? {}).sort(([a], [b]) => a.localeCompare(b))]);
}

// Each configured client owns its cache, so keys and sandbox provenance cannot mix.
export function createReadCache({ clock = monotonicNow } = {}) {
  const entries = new Map();
  const inFlight = new Map();
  return {
    async read(route, load) {
      const key = cacheKey(route);
      const time = clock();
      for (const [storedKey, entry] of entries) if (entry.expiresAt <= time) entries.delete(storedKey);
      const hit = entries.get(key);
      if (hit) {
        entries.delete(key);
        entries.set(key, hit); // LRU touch does not extend the data's expiry.
        return structuredClone(hit.response);
      }
      const existing = inFlight.get(key);
      if (existing) return structuredClone(await existing);
      const pending = Promise.resolve().then(load).then((response) => {
        const ttl = route.kind === 'categories' ? 300_000 : 30_000;
        entries.set(key, { response: structuredClone(response), expiresAt: clock() + ttl });
        while (entries.size > CACHE_LIMIT) entries.delete(entries.keys().next().value);
        return response;
      }).finally(() => inFlight.delete(key));
      inFlight.set(key, pending);
      // Cached responses keep the original provider retrieval time, including hits.
      return structuredClone(await pending);
    },
  };
}
