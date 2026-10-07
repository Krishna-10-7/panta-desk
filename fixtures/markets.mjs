// Entirely illustrative records. These are not fetched Panta markets.
// sample-* identifiers and null signatures deliberately prevent on-chain claims.
const epoch = (value) => Math.floor(Date.parse(value) / 1000);
export const sampleAsOf = '2026-10-07T06:30:00.000Z';
const base = {
  region: 'Global', resolved: false, status: 'open', marketType: 'standard',
  startTime: epoch('2026-10-01T00:00:00Z'), campaignId: null,
  createdByPartner: false, secondaryYesPrice: null, secondaryNoPrice: null,
  creatorAddress: null, oracle: null,
};
export const sampleCategories = ['crypto', 'science', 'world', 'other'];
export const sampleMarkets = [
  {
    ...base, marketId: 'sample-report', category: 'science', phase: 'primary',
    title: 'Will the observatory publish its annual report by 31 October?',
    description: 'Illustrative market. YES if the fictional Community Observatory publishes its full annual report before 23:59 UTC on 31 October 2026. A press announcement alone does not qualify. The report must be publicly accessible. Example source: https://example.org/observatory/annual-report. These details are invented for demonstrating the research interface.',
    resolutionRule: 'Illustrative rule: the fictional Community Observatory publishes a publicly accessible full annual report by 23:59 UTC on 31 October 2026; a press announcement alone does not count.',
    sources: ['https://example.org/observatory/annual-report'], priceSource: 'illustrative_sample', valuationStatus: 'sample_not_verified',
    endTime: epoch('2026-10-31T23:59:00Z'), resolutionTime: epoch('2026-11-02T12:00:00Z'),
    volumeUsdc: '1240.00', yesPrice: '0.64', noPrice: '0.36', primaryYesPrice: '0.64', primaryNoPrice: '0.36',
  },
  {
    ...base, marketId: 'sample-upgrade', category: 'crypto', phase: 'primary',
    title: 'Will the example network publish its upgrade by 20 October?',
    description: 'Illustrative market about a fictional network upgrade. A release candidate is different from a production release. This sample deliberately omits a source URL and exact resolution criteria so the checklist can flag what a researcher still needs to verify. It does not describe a real project.',
    resolutionRule: null, sources: [], priceSource: null, valuationStatus: 'sample_unavailable',
    endTime: epoch('2026-10-20T23:59:00Z'), resolutionTime: null,
    volumeUsdc: '82.50', yesPrice: null, noPrice: null, primaryYesPrice: null, primaryNoPrice: null,
  },
  {
    ...base, marketId: 'sample-survey', category: 'world', phase: 'secondary',
    title: 'Will the city pilot survey reach 1,000 responses?',
    description: 'Illustrative market about a fictional public survey. Count unique, completed responses listed in the final report published by 15 November 2026. Duplicate and incomplete responses do not qualify. Example report location: https://example.org/city-pilot/final-report. These records are sample data, not live findings.',
    endTime: epoch('2026-11-15T12:00:00Z'), resolutionTime: epoch('2026-11-17T12:00:00Z'),
    volumeUsdc: '576.20', yesPrice: '0.48', noPrice: '0.52', primaryYesPrice: null, primaryNoPrice: null,
    secondaryYesPrice: '0.48', secondaryNoPrice: '0.52',
  },
  {
    ...base, marketId: 'sample-archive', category: 'science', phase: 'resolved', resolved: true, status: 'resolved',
    title: 'Did the fictional archive publish its September catalog?',
    description: 'Resolved illustrative market used to demonstrate phase filters. Its catalog question, volumes and prices are invented. No actual transaction or resolution evidence is represented.',
    resolutionRule: 'Illustrative resolved rule: the fictional archive publishes its September catalog before the stated closing time.',
    sources: [], priceSource: 'resolved_outcome', valuationStatus: 'illustrative_sample',
    endTime: epoch('2026-09-30T23:59:00Z'), resolutionTime: epoch('2026-10-02T12:00:00Z'),
    volumeUsdc: '920.00', yesPrice: '1.00', noPrice: '0.00', primaryYesPrice: null, primaryNoPrice: null,
  },
  {
    ...base, marketId: 'sample-workshop', category: 'other', phase: 'primary',
    title: 'Will the fictional community hold three public workshops?',
    description: 'Illustrative workshop market. The sample question does not define whether online sessions count, and no source is included. Its missing context is intentional for research checklist testing.',
    endTime: epoch('2026-10-25T16:00:00Z'), resolutionTime: epoch('2026-10-26T16:00:00Z'),
    volumeUsdc: '16.00', yesPrice: '0.71', noPrice: '0.29', primaryYesPrice: '0.71', primaryNoPrice: '0.29',
  },
  {
    ...base, marketId: 'sample-cancelled', category: 'world', phase: 'cancelled', status: 'cancelled',
    title: 'Cancelled example: community schedule announcement',
    description: 'Cancelled illustrative record, included to demonstrate that closed phases remain distinguishable. Not an actual Panta market.',
    endTime: epoch('2026-10-04T12:00:00Z'), resolutionTime: null,
    volumeUsdc: '0.00', yesPrice: null, noPrice: null, primaryYesPrice: null, primaryNoPrice: null,
  },
];
const trade = (id, marketId, time, yes, no) => ({
  id: `sample-trade-${id}`, marketId, wallet: null, signature: null,
  isPrimary: true, yesAmount: yes, noAmount: no, feePaid: '0',
  blockTime: epoch(time), quoteAsset: 'USDC',
});
export const sampleTrades = {
  'sample-report': [
    trade('a', 'sample-report', '2026-10-07T06:10:00Z', '12000000', '0'),
    trade('b', 'sample-report', '2026-10-06T21:45:00Z', '0', '8000000'),
    trade('c', 'sample-report', '2026-10-06T13:20:00Z', '5000000', '0'),
  ],
  'sample-upgrade': [],
  'sample-survey': [
    { ...trade('d', 'sample-survey', '2026-10-05T14:00:00Z', '0', '2000000'), isPrimary: false },
  ],
  'sample-archive': [], 'sample-workshop': [], 'sample-cancelled': [],
};
