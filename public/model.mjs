export const REVIEW_CHECKS = ['I understand the exact question', 'I checked the closing time', 'I checked the resolution timing', 'I reviewed the supplied links or noted they are missing'];

export function timestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  const milliseconds = typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value)) ? Number(value) * 1000 : Date.parse(value);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return null;
  const date = new Date(milliseconds);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function dateLabel(value) {
  const date = timestamp(value);
  return date ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC' : 'Not supplied';
}

export function money(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 'Unavailable';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(number) + ' USDC';
}

export function marketTitle(market) {
  return typeof market.title === 'string' && market.title.trim() ? market.title : `Question not supplied · ${String(market.marketId || '').slice(0,8)}…`;
}

export function valueKind(market) {
  return market.priceSource === 'resolved_outcome' ? 'outcome value' : market.phase === 'resolved' ? 'API value' : 'share price';
}

export function tradeTime(trade) { return trade.blockTime ?? trade.timestamp; }

export function evidenceLinks(market) {
  const links = [];
  for (const url of Array.isArray(market.sources) ? market.sources : []) {
    if (typeof url !== 'string') continue;
    try {
      const parsed = new URL(url);
      if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) links.push({url:parsed.href, kind:'API resolution source'});
    } catch { /* Invalid provider URLs remain unlinked. */ }
  }
  for (const url of descriptionLinks(market.description)) if (!links.some(link=>link.url===url)) links.push({url,kind:'Description link'});
  return links.slice(0,10);
}

export function descriptionLinks(text) {
  return [...new Set((String(text || '').match(/https?:\/\/[^\s<>]+/g) || []).map(value => value.replace(/[),.;]+$/, '')).filter(value => {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
  }))].slice(0,10);
}

export function closingGap(market) {
  const close = timestamp(market.endTime), resolution = timestamp(market.resolutionTime);
  if (!close || !resolution) return 'Timing gap cannot be determined from the supplied fields.';
  const hours = (resolution - close) / 3600000;
  if (hours < 0) return 'The supplied resolution time precedes the closing time. Check the market wording.';
  return `The resolution field is ${Number(hours.toFixed(1))} hours after closing. Confirm its meaning in the market rule.`;
}

export function signatureUrl(signature, mode) {
  return mode === 'live' && typeof signature === 'string' && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature) ? 'https://solscan.io/tx/' + signature : null;
}

export function exportBrief(entries) {
  const lines = ['# Panta Desk research brief', '', `Exported: ${new Date().toISOString()}`, 'Share prices are not verified forecasts. Resolved outcome values are not trading quotes. Trade counts describe the returned sample only.', 'Local checklist marks record the researcher’s review; they do not certify a market.', ''];
  for (const {market,meta,trades,tradesMeta,review} of entries) {
    lines.push(`## ${marketTitle(market)}`, '', `Market ID: ${market.marketId}`, `Data source: ${meta.source} (${meta.mode})`, `Retrieved: ${meta.retrievedAt}`, `Category: ${market.category || 'Not supplied'}`, `Phase: ${market.phase || 'Not supplied'}`, `Closing: ${dateLabel(market.endTime)}`, `API resolution time: ${dateLabel(market.resolutionTime)}`, closingGap(market), `Reported volume: ${money(market.volumeUsdc)}`, `YES ${valueKind(market)}: ${money(market.yesPrice)}`, `NO ${valueKind(market)}: ${money(market.noPrice)}`, `Price source: ${market.priceSource || 'Not supplied'}`, '', '### Exact description', '', market.description || 'Not supplied', '', '### API resolution rule', '', typeof market.resolutionRule === 'string' && market.resolutionRule ? market.resolutionRule : 'Not supplied', '', '### Supplied evidence links', '', ...evidenceLinks(market).map(link => `- ${link.kind}: ${link.url}`));
    if (!evidenceLinks(market).length) lines.push('No evidence links supplied in these API fields. This does not establish that no resolution source exists.');
    if (meta.disclaimer) lines.push('', `Provider notice: ${meta.disclaimer}`);
    lines.push('', '### Recent activity', '', trades ? `${trades.length} trade rows in the returned sample. Activity retrieved: ${tradesMeta?.retrievedAt || 'Unavailable'}.` : 'Recent activity unavailable; it was not inferred from volume.');
    if (tradesMeta) lines.push(`Activity source: ${tradesMeta.source} (${tradesMeta.mode})`, ...(tradesMeta.disclaimer ? [`Activity provider notice: ${tradesMeta.disclaimer}`] : []));
    for (const trade of (trades || []).slice(0,5)) lines.push(`- ${dateLabel(tradeTime(trade))}${signatureUrl(trade.signature,tradesMeta?.mode) ? ' · ' + signatureUrl(trade.signature,tradesMeta.mode) : ' · no verified mainnet transaction link supplied'}`);
    lines.push('', '### Researcher review', '', ...REVIEW_CHECKS.map((label,i)=>`- [${review?.checks?.[i] ? 'x' : ' '}] ${label}`), '', '### Notes', '', review?.notes || 'No notes recorded.', '');
  }
  return lines.join('\n');
}
