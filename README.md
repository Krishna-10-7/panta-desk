# Panta Desk

A read-only research workspace for Panta prediction markets. Inspect exact market questions, supplied resolution rules and source links; compare up to three markets; keep a local watchlist, review checklist and notes; export a Markdown research brief.

## Run locally

Requires Node.js 22.9 or newer. No package installation is needed.

```sh
npm start
```

Open <http://127.0.0.1:4173>. Without a key, the app uses clearly labeled local sample markets. To use Panta data, copy `.env.example` to `.env`, set `PANTA_API_KEY` to your own key and set `PANTA_DEMO=false`. Restart the process after configuration changes. `.env` is ignored by Git; never upload it. A test key returns sandbox data; a live key is needed for real markets.

```sh
npm test
```

The provided local preview has already been configured through a process environment variable. The source package contains no API key. Closing that process removes its configured environment; use your own environment configuration when starting elsewhere.

## Integration

The server calls the official Panta host with authenticated GET requests for categories, catalog pages, market detail and recent trade rows. The browser calls the local server; it never receives the credential. The proxy permits only these read paths and validated query parameters. It uses a bounded timeout/response size, sanitized errors and loopback binding. The project has no wallet connection, trade submission or market creation.

Live API validation uncovered opaque base64url cursors, null list prices, additional detail rule/source fields, block-time trade dates, and occasional stale list phase versus current detail phase. The app preserves these differences: detail fields carry their own timestamp and source, and resolved outcome values are labeled separately from share prices.

## Data limits

- Catalog search covers loaded rows, not the provider's entire market database.
- Data is a retrieved snapshot. Use Refresh data to fetch a new catalog; this clears comparison snapshots but keeps local notes/watchlist.
- Dates display in UTC. An API resolution field does not establish settlement guarantees.
- Empty values stay explicit. Description links and supplied resolution sources are distinguished. The app does not independently verify a source's contents or a market's adjudication.
- Trade counts refer to the returned sample, and links appear only for live activity with valid signatures. No history chart is invented from spot data.
- Notes and watchlist are local to the current browser/device. Export a brief to keep a portable copy.

## Submission preparation

`SUBMISSION.md` contains an entry draft and demo script. Public GitHub source, a hosted demo, a recorded pitch and account/submission steps still need completion before entering the bounty. No payout or acceptance is claimed.

Provider documentation: <https://docs.panta.market/>. Bounty: <https://superteam.fun/earn/listing/panta-api-side-track>. Powered by Panta.
