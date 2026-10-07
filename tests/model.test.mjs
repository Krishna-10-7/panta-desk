import test from 'node:test';
import assert from 'node:assert/strict';
import { timestamp, dateLabel, money, descriptionLinks, evidenceLinks, marketTitle, valueKind, tradeTime, closingGap, signatureUrl, exportBrief } from '../public/model.mjs';

test('missing or invalid dates never become epoch dates or crash formatting', () => {
  for (const value of [null, undefined, '', 'not a date', Infinity, 1e30]) {
    assert.equal(timestamp(value), null);
    assert.equal(dateLabel(value), 'Not supplied');
  }
  assert.equal(timestamp(1791230400).toISOString(), '2026-10-05T20:00:00.000Z');
  assert.equal(timestamp('2026-10-05T20:00:00Z').toISOString(), timestamp(1791230400).toISOString());
});
test('zero prices stay zero and missing prices stay unavailable', () => {
  assert.equal(money('0'), '0 USDC');
  assert.equal(money(null), 'Unavailable');
  assert.equal(money('not a price'), 'Unavailable');
});
test('description links exclude credential-bearing URLs and unsafe protocols', () => {
  assert.deepEqual(descriptionLinks('https://example.com/a. https://user:pass@example.com/x javascript:alert(1) https://example.com/a.'), ['https://example.com/a']);
  assert.equal(signatureUrl('fixture-signature'), null);
  assert.equal(signatureUrl('1'.repeat(64), 'live'), 'https://solscan.io/tx/' + '1'.repeat(64));
  assert.equal(signatureUrl('1'.repeat(64), 'sandbox'), null);
  assert.equal(signatureUrl('1'.repeat(64), 'demo'), null);
});
test('timing interpretation does not invent absent resolution evidence', () => {
  assert.match(closingGap({ endTime: null, resolutionTime: null }), /cannot be determined/);
  assert.match(closingGap({endTime:1791230400,resolutionTime:1791226800}), /precedes/);
  assert.match(closingGap({endTime:1791230400,resolutionTime:1791234000}), /1 hours after closing/);
});
test('export retains sandbox provenance, exact wording and user review limits', () => {
  const brief = exportBrief([{market:{marketId:'sample-test',title:'Example question?',description:'Exact wording\nSecond line',endTime:null,resolutionTime:null,yesPrice:'0',noPrice:null},meta:{source:'Panta sandbox',mode:'sandbox',retrievedAt:'2026-10-07T00:00:00Z',disclaimer:'Sandbox fixtures'},trades:[],tradesMeta:{retrievedAt:'2026-10-07T00:01:00Z'},review:{checks:[true],notes:'Needs source clarification'}}]);
  for (const text of ['Panta sandbox (sandbox)', 'Provider notice: Sandbox fixtures', 'Exact wording\nSecond line','YES share price: 0 USDC','NO share price: Unavailable','0 trade rows in the returned sample','Needs source clarification','do not certify a market']) assert.ok(brief.includes(text), text);
});
test('real detail evidence, resolved outcome values and block times remain distinct', () => {
  assert.equal(marketTitle({title:'',marketId:'123456789'}), 'Question not supplied · 12345678…');
  assert.equal(valueKind({phase:'resolved',priceSource:'resolved_outcome'}), 'outcome value');
  assert.equal(tradeTime({blockTime:1791230400}),1791230400);
  assert.deepEqual(evidenceLinks({sources:['https://example.com','https://user:pass@example.com','javascript:alert(1)'],description:'See https://news.example.com/article'}), [{url:'https://example.com/',kind:'API resolution source'},{url:'https://news.example.com/article',kind:'Description link'}]);
  const brief=exportBrief([{market:{title:'Weather?',marketId:'real-market',phase:'resolved',priceSource:'resolved_outcome',yesPrice:'0',resolutionRule:'Exact rule',sources:['https://example.com']},meta:{source:'Panta API',mode:'live',retrievedAt:'2026-10-07T00:00:00Z'},trades:[{blockTime:1791230400,signature:'1'.repeat(64)}],tradesMeta:{source:'Panta sandbox',mode:'sandbox',retrievedAt:'2026-10-07T00:01:00Z',disclaimer:'Sandbox fixture'},review:{}}]);
  assert.ok(brief.includes('YES outcome value: 0 USDC'));
  assert.ok(brief.includes('Exact rule'));
  assert.ok(brief.includes('Activity source: Panta sandbox (sandbox)'));
  assert.ok(brief.includes('5 Oct 2026, 20:00 UTC'));
  assert.ok(!brief.includes('solscan.io'));
});
