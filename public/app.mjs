import { REVIEW_CHECKS, dateLabel, money, evidenceLinks, marketTitle, valueKind, tradeTime, closingGap, signatureUrl, exportBrief } from './model.mjs';

const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const state = { markets: [], nextCursor: null, catalogMeta: null, selected: new Map(), active: null, loading: false, request: null };
let saved = { watchlist: [], reviews: {} };
try {
  const value = JSON.parse(localStorage.getItem('panta-desk-v1') || '{}');
  if (Array.isArray(value.watchlist)) saved.watchlist = value.watchlist.filter(x=>typeof x === 'string').slice(0,500);
  if (value.reviews && typeof value.reviews === 'object' && !Array.isArray(value.reviews)) saved.reviews = value.reviews;
} catch { /* Storage may be unavailable or contain an old value. */ }
const params = new URLSearchParams(location.search);
$('#search').value = params.get('q') || '';
$('#watch-only').checked = params.get('watch') === '1';
for (const phase of ['primary','secondary','resolved','cancelled']) {
  const option = document.createElement('option'); option.value = phase; option.textContent = phase[0].toUpperCase()+phase.slice(1); $('#phase-filter').append(option);
}
if (['primary','secondary','resolved','cancelled'].includes(params.get('status'))) $('#phase-filter').value = params.get('status');

function announce(message) { $('#announcement').textContent = message; }
function storeSaved() {
  try { localStorage.setItem('panta-desk-v1', JSON.stringify(saved)); return true; }
  catch { announce('Browser storage is unavailable. Export your brief to keep notes.'); return false; }
}
function reviewFor(id) {
  const value = saved.reviews[id];
  return { checks: REVIEW_CHECKS.map((_,i)=>value?.checks?.[i] === true), notes: typeof value?.notes === 'string' ? value.notes.slice(0,10000) : '' };
}
function updateUrl() {
  const query = new URLSearchParams();
  for (const [key,value] of [['q',$('#search').value.trim()],['category',$('#category').value],['status',$('#phase-filter').value],['watch',$('#watch-only').checked ? '1' : '']]) if (value) query.set(key,value);
  history.replaceState(null,'',location.pathname+(query.size ? '?'+query : ''));
}
function applyProvenance(meta) {
  const banner = $('#provenance'); banner.classList.toggle('live',meta.mode === 'live');
  if (meta.mode === 'demo') banner.textContent = 'Sample data · local demonstration markets. Connect a Panta key to retrieve API data.';
  else if (meta.mode === 'sandbox') banner.textContent = 'Panta sandbox · the API returned test fixtures, not Solana mainnet markets.';
  else banner.textContent = `Panta API · retrieved ${dateLabel(meta.retrievedAt)}. Snapshots may be reused for 30 seconds; refresh to check again.`;
}
async function requestApi(path, signal) {
  const response = await fetch(path, { signal, cache:'no-store' });
  let value;
  try { value = await response.json(); } catch { throw new Error('The server returned an unreadable response. Try refreshing.'); }
  if (!response.ok) throw new Error(value.error?.message || 'Market data could not be loaded. Try refreshing.');
  return value;
}

async function loadCategories() {
  try {
    const value = await requestApi('/api/categories');
    for (const category of value.data.categories || []) {
      const option = document.createElement('option'); option.value = category; option.textContent = category[0].toUpperCase()+category.slice(1); $('#category').append(option);
    }
    if ([...$('#category').options].some(x=>x.value === params.get('category'))) $('#category').value = params.get('category');
  } catch (error) { announce('Categories unavailable. You can still browse all markets.'); }
}
async function loadCatalog(append = false) {
  if (!append) { state.nextCursor=null; $('#load-more').hidden=true; }
  state.request?.abort(); const controller = new AbortController(); state.request = controller;
  state.loading = true; $('#market-list').setAttribute('aria-busy','true'); $('#refresh').disabled = true; $('#load-more').disabled = true;
  const message = $('#catalog-message'); message.classList.remove('error'); message.textContent = append ? 'Loading more markets…' : 'Loading markets…';
  const query = new URLSearchParams({limit:'20'});
  if ($('#category').value) query.set('category',$('#category').value);
  if ($('#phase-filter').value) query.set('status',$('#phase-filter').value);
  if (append && state.nextCursor) query.set('cursor',state.nextCursor);
  try {
    const value = await requestApi('/api/markets?'+query,controller.signal);
    if (state.request !== controller) return;
    if (!Array.isArray(value.data.items)) throw new Error('Market catalog format is unavailable. Try refreshing.');
    state.markets = append ? [...new Map([...state.markets,...value.data.items].map(x=>[x.marketId,x])).values()] : value.data.items;
    state.nextCursor = value.data.nextCursor; state.catalogMeta = value.meta; applyProvenance(value.meta);
    message.textContent = ''; renderCatalog();
  } catch (error) {
    if (error.name === 'AbortError' || state.request !== controller) return;
    message.classList.add('error'); message.textContent = error.message;
    if (state.markets.length) message.textContent += ' Previously loaded rows remain visible; they may be stale.';
    else { $('#market-list').innerHTML = '<div class="empty-panel"><h3>Market data is unavailable</h3><p>Check your connection and choose Refresh data to try again.</p></div>'; $('#result-count').textContent = 'Unavailable'; }
  } finally {
    if (state.request === controller) { state.loading=false; $('#market-list').setAttribute('aria-busy','false'); $('#refresh').disabled=false; $('#load-more').disabled=false; }
  }
}
function renderCatalog() {
  const focused = document.activeElement?.dataset;
  const q = $('#search').value.trim().toLocaleLowerCase('en');
  const visible = state.markets.filter(m=>(!q || `${marketTitle(m)} ${m.description}`.toLocaleLowerCase('en').includes(q)) && (!$('#watch-only').checked || saved.watchlist.includes(m.marketId)));
  $('#clear-search').hidden = !$('#search').value; $('#result-count').textContent = `${visible.length} shown · ${state.markets.length} loaded`;
  $('#market-list').innerHTML = visible.length ? visible.map(m=>{
    const selected=state.selected.has(m.marketId), watched=saved.watchlist.includes(m.marketId), full=!selected && state.selected.size>=3;
    return `<article class="market-card ${selected ? 'selected' : ''}"><div class="market-meta"><span class="phase">${escape(m.phase || 'Unknown phase')}</span><span>${escape(m.category || 'Uncategorized')}</span></div><h3>${escape(marketTitle(m))}</h3><p class="market-description">${escape((m.description || 'Description not supplied').slice(0,150))}${m.description?.length>150 ? '…' : ''}</p><div class="facts"><div><span class="fact-label">Closes</span><span class="fact-value">${escape(dateLabel(m.endTime))}</span></div><div><span class="fact-label">Reported volume</span><span class="fact-value">${escape(money(m.volumeUsdc))}</span></div></div><div class="card-actions"><button type="button" class="button ${selected ? 'primary' : 'outline'}" data-action="select" data-id="${escape(m.marketId)}" aria-pressed="${selected}" ${full ? 'disabled aria-describedby="selection-count"' : ''}>${selected ? 'Remove comparison' : 'Inspect & compare'}</button><button type="button" class="button outline" data-action="watch" data-id="${escape(m.marketId)}" aria-pressed="${watched}">${watched ? 'Saved to watchlist' : 'Save to watchlist'}</button></div></article>`;
  }).join('') : '<div class="empty-panel"><h3>No matching markets</h3><p>Clear the search or change your filters. Search covers only the markets loaded here.</p></div>';
  $('#load-more').hidden = !state.nextCursor; $('#page-note').textContent = state.nextCursor ? 'More markets available from Panta.' : 'End of the returned catalog.';
  if (focused?.action && focused?.id) $(`[data-action="${CSS.escape(focused.action)}"][data-id="${CSS.escape(focused.id)}"]`)?.focus();
}
function removeSelected(id) {
  const panelFocus = $('#detail').contains(document.activeElement);
  state.selected.get(id)?.controller.abort(); state.selected.delete(id);
  if (state.active === id) state.active=state.selected.keys().next().value || null;
  renderSelection(); renderCatalog(); announce('Market removed from comparison.');
  if (panelFocus) ($(`[data-action="select"][data-id="${CSS.escape(id)}"]`) || $('#research-heading')).focus();
}
async function selectMarket(id) {
  if (state.selected.has(id)) { removeSelected(id); return; }
  if (state.selected.size>=3) { announce('Compare up to three markets. Remove one before adding another.'); return; }
  const market=state.markets.find(m=>m.marketId===id); if (!market) return;
  const entry={market,meta:state.catalogMeta,pending:true,error:null,trades:null,tradesMeta:null,controller:new AbortController()};
  state.selected.set(id,entry); state.active=id; renderSelection(); renderCatalog();
  if (matchMedia('(max-width: 950px)').matches) $('#research-heading').focus();
  const results=await Promise.allSettled([requestApi('/api/markets/'+encodeURIComponent(id),entry.controller.signal),requestApi('/api/markets/'+encodeURIComponent(id)+'/trades?limit=20',entry.controller.signal)]);
  if (state.selected.get(id)!==entry) return;
  entry.pending=false;
  if (results[0].status==='fulfilled') { entry.market=results[0].value.data; entry.meta=results[0].value.meta; }
  else entry.error='Detail could not be loaded. Catalog wording remains visible; spot prices may be unavailable.';
  if (results[1].status==='fulfilled') { entry.trades=results[1].value.data.items; entry.tradesMeta=results[1].value.meta; }
  renderSelection(); announce(entry.error || 'Market details loaded.');
}
function renderSelection() {
  const focused = document.activeElement;
  const focusKey = focused?.id === 'research-notes' ? 'notes' : focused?.dataset.check !== undefined ? 'check' : focused?.dataset.market ? 'chip' : null;
  const focusValue = focused?.dataset.check ?? focused?.dataset.market;
  const caret = focusKey === 'notes' ? [focused.selectionStart, focused.selectionEnd] : null;
  $('#selection-count').textContent=`${state.selected.size} / 3`;
  $('#selected-list').innerHTML=[...state.selected].map(([id,entry])=>`<button type="button" class="selected-chip ${state.active===id?'active':''}" data-market="${escape(id)}" aria-pressed="${state.active===id}" aria-label="Review ${escape(marketTitle(entry.market))}">${escape(marketTitle(entry.market).slice(0,45))}${marketTitle(entry.market).length>45?'…':''}</button>`).join('');
  $('#review-empty').hidden=state.selected.size>0; $('#detail').hidden=state.selected.size===0; $('#export').disabled=state.selected.size===0 || [...state.selected.values()].some(entry=>entry.pending);
  const entry=state.selected.get(state.active);
  if (entry) renderDetail(entry); else $('#detail').innerHTML='';
  renderComparison();
  const target = focusKey === 'notes' ? $('#research-notes') : focusKey === 'check' ? $(`[data-check="${focusValue}"]`) : focusKey === 'chip' ? $(`[data-market="${CSS.escape(focusValue)}"]`) : null;
  if (target) { target.focus({preventScroll:true}); if(caret)target.setSelectionRange(...caret); }
}
function renderDetail(entry) {
  const m=entry.market, review=reviewFor(m.marketId), links=evidenceLinks(m);
  const trades=entry.trades;
  $('#detail').innerHTML=`<h3 class="detail-heading">${escape(marketTitle(m))}</h3>${entry.pending?'<p class="message" role="status">Loading market details and activity…</p>':''}${entry.error?`<p class="message error">${escape(entry.error)}</p>`:''}<div class="price-grid"><div class="price"><span>YES ${escape(valueKind(m))}</span><strong>${escape(money(m.yesPrice))}</strong></div><div class="price"><span>NO ${escape(valueKind(m))}</span><strong>${escape(money(m.noPrice))}</strong></div></div><p class="data-time">${escape(entry.meta.source)} (${escape(entry.meta.mode)}) · retrieved ${escape(dateLabel(entry.meta.retrievedAt))}</p><p class="data-time">Price source: ${escape(m.priceSource || 'Not supplied')} · Detail phase: ${escape(m.phase || 'Not supplied')}</p>${entry.meta.disclaimer?`<p class="message">${escape(entry.meta.disclaimer)}</p>`:''}<div class="detail-section"><h4>Closing & resolution</h4><div class="timing"><div><span class="fact-label">Market closes</span><span class="fact-value">${escape(dateLabel(m.endTime))}</span></div><div><span class="fact-label">API resolution time</span><span class="fact-value">${escape(dateLabel(m.resolutionTime))}</span></div></div><div class="timing-gap">${escape(closingGap(m))}</div></div><div class="detail-section"><h4>Exact market wording</h4><p class="exact-description">${escape(m.description || 'Not supplied')}</p><h4>API resolution rule</h4><p class="exact-description">${escape(typeof m.resolutionRule === 'string' && m.resolutionRule ? m.resolutionRule : 'Not supplied')}</p><h4>Supplied evidence links</h4>${links.length?`<ul>${links.map(link=>`<li><a href="${escape(link.url)}" target="_blank" rel="noopener noreferrer">${escape(new URL(link.url).hostname)}</a> · ${escape(link.kind)}</li>`).join('')}</ul>`:'<p>No evidence links supplied in these API fields. Check the market’s resolution source separately.</p>'}</div><div class="detail-section"><h4>Recent activity</h4>${trades?`<p>${trades.length} trades in the returned sample. This is not the lifetime trade count.</p><ul class="trade-list">${trades.slice(0,5).map(trade=>`<li>${escape(dateLabel(tradeTime(trade)))}${signatureUrl(trade.signature,entry.tradesMeta?.mode)?` · <a href="${escape(signatureUrl(trade.signature,entry.tradesMeta?.mode))}" target="_blank" rel="noopener noreferrer">View transaction</a>`:' · no verified mainnet transaction link supplied'}</li>`).join('')}</ul><p class="data-time">${escape(entry.tradesMeta.source)} (${escape(entry.tradesMeta.mode)}) · activity retrieved ${escape(dateLabel(entry.tradesMeta.retrievedAt))}</p>${entry.tradesMeta.disclaimer?`<p class="message">${escape(entry.tradesMeta.disclaimer)}</p>`:''}`:'<p>Recent activity is unavailable. No activity was inferred from reported volume.</p>'}</div><div class="detail-section"><h4>Your review · ${review.checks.filter(Boolean).length} / 4 checked</h4><div class="checklist">${REVIEW_CHECKS.map((text,i)=>`<label><input type="checkbox" data-check="${i}" ${review.checks[i]?'checked':''}><span>${escape(text)}</span></label>`).join('')}</div><label for="research-notes" class="note-label">Research notes</label><textarea id="research-notes" maxlength="10000" placeholder="What needs clarification before you make a decision?">${escape(review.notes)}</textarea><div id="note-status" class="note-status" role="status">Saved locally in this browser.</div></div><button type="button" class="button outline" id="remove-active">Remove from comparison</button>`;
  $('#remove-active').addEventListener('click',()=>removeSelected(m.marketId));
  $('#detail').querySelectorAll('[data-check]').forEach(input=>input.addEventListener('change',()=>{
    const current=reviewFor(m.marketId); current.checks[Number(input.dataset.check)]=input.checked; saved.reviews[m.marketId]=current;
    $('#note-status').textContent=storeSaved()?'Review saved locally.':'Storage unavailable. Export to keep your review.';
    $('#detail .checklist').previousElementSibling.textContent=`Your review · ${current.checks.filter(Boolean).length} / 4 checked`;
  }));
  $('#research-notes').addEventListener('input',event=>{
    const current=reviewFor(m.marketId); current.notes=event.target.value; saved.reviews[m.marketId]=current;
    $('#note-status').textContent=storeSaved()?'Notes saved locally.':'Storage unavailable. Export to keep your notes.';
    event.target.style.height='auto'; event.target.style.height=Math.max(112,event.target.scrollHeight)+'px';
  });
  $('#research-notes').style.height = Math.max(112,$('#research-notes').scrollHeight)+'px';
}
function renderComparison() {
  $('#comparison').hidden=state.selected.size<2;
  $('#comparison-grid').innerHTML=[...state.selected.values()].map(entry=>{
    const m=entry.market;
    return `<article class="compare-card"><h3>${escape(marketTitle(m))}</h3><dl><dt>Phase</dt><dd>${escape(m.phase || 'Not supplied')}</dd><dt>Closing time</dt><dd>${escape(dateLabel(m.endTime))}</dd><dt>API resolution time</dt><dd>${escape(dateLabel(m.resolutionTime))}</dd><dt>YES / NO ${escape(valueKind(m))}</dt><dd>${escape(money(m.yesPrice))} / ${escape(money(m.noPrice))}</dd><dt>Source</dt><dd>${escape(entry.meta.source)} · ${escape(dateLabel(entry.meta.retrievedAt))}</dd></dl><h4>API resolution rule</h4><p>${escape(m.resolutionRule || 'Not supplied')}</p><h4>Exact description</h4><p>${escape(m.description || 'Not supplied')}</p></article>`;
  }).join('');
}
$('#market-list').addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]'); if (!button || button.disabled) return;
  if (button.dataset.action==='select') selectMarket(button.dataset.id);
  else { const id=button.dataset.id; saved.watchlist=saved.watchlist.includes(id)?saved.watchlist.filter(x=>x!==id):[...saved.watchlist,id]; const persisted=storeSaved(); renderCatalog(); announce(persisted ? saved.watchlist.includes(id)?'Market saved to watchlist.':'Market removed from watchlist.' : 'Watchlist changed for this session. Browser storage is unavailable.'); }
});
$('#selected-list').addEventListener('click',event=>{const button=event.target.closest('button[data-market]'); if(button){state.active=button.dataset.market;renderSelection();}});
let composing=false;
$('#search').addEventListener('compositionstart',()=>{composing=true;});
$('#search').addEventListener('compositionend',()=>{composing=false;updateUrl();renderCatalog();});
$('#search').addEventListener('input',()=>{if(!composing){updateUrl();renderCatalog();}});
$('#clear-search').addEventListener('click',()=>{$('#search').value='';updateUrl();renderCatalog();$('#search').focus();});
$('#watch-only').addEventListener('change',()=>{updateUrl();renderCatalog();});
for(const selector of ['#category','#phase-filter']) $(selector).addEventListener('change',()=>{updateUrl();loadCatalog();});
$('#refresh').addEventListener('click',()=>{loadCatalog();for(const [id,entry] of state.selected){entry.controller.abort();state.selected.delete(id);}state.active=null;renderSelection();announce('Refreshing the catalog. Comparison snapshots cleared; your saved notes and watchlist remain.');});
$('#load-more').addEventListener('click',()=>{if(!state.loading)loadCatalog(true);});
$('#export').addEventListener('click',()=>{
  const text=exportBrief([...state.selected.values()].map(entry=>({...entry,review:reviewFor(entry.market.marketId)})));
  const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='panta-research-brief.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Research brief exported.');
});
await loadCategories();
await loadCatalog();
