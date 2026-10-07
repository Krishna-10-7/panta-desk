# Panta Desk

A read-only research workspace for Panta prediction markets. Inspect exact market questions, supplied resolution rules and source links; compare up to three markets; keep a local watchlist, review checklist and notes; export a Markdown research brief.

## Run locally

Requires Node.js 22.9 or newer. No package installation is needed.

Public source: <https://github.com/Krishna-10-7/panta-desk>. Colosseum project draft: <https://colosseum.com/arena/projects/panta-desk>.

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

Hosting can explicitly set `HOST=0.0.0.0` and use the platform's `PORT`. The local default stays `127.0.0.1`. Market reads may reuse a snapshot for 30 seconds; categories for five minutes. Concurrent identical reads share one request and cached responses retain their original retrieval timestamp. One process permits at most 100 upstream request starts per rolling minute and honors provider cooldowns. This limiter is in memory; multiple replicas or process restarts require a shared limiter before scaling.

Live API validation uncovered opaque base64url cursors, null list prices, additional detail rule/source fields, block-time trade dates, and occasional stale list phase versus current detail phase. The app preserves these differences: detail fields carry their own timestamp and source, and resolved outcome values are labeled separately from share prices.

## Data limits

- Catalog search covers loaded rows, not the provider's entire market database.
- Data is a retrieved snapshot. Use Refresh data to fetch a new catalog; this clears comparison snapshots but keeps local notes/watchlist.
- Dates display in UTC. An API resolution field does not establish settlement guarantees.
- Empty values stay explicit. Description links and supplied resolution sources are distinguished. The app does not independently verify a source's contents or a market's adjudication.
- Trade counts refer to the returned sample, and links appear only for live activity with valid signatures. No history chart is invented from spot data.
- Notes and watchlist are local to the current browser/device. Export a brief to keep a portable copy.

## Submission preparation

`SUBMISSION.md` contains an entry draft and demo script. Public GitHub source and the Colosseum draft are prepared. Hosting, recorded videos, founder details and final submission steps remain. No payout or acceptance is claimed.

`render.yaml` describes a free Node web service that initially uses labeled sample data. A Render deployment can set the key privately and `PANTA_DEMO=false` to enable API reads. Do not put the key in the Blueprint, browser assets or repository. Free Render services can sleep during inactivity; allow time for startup when demonstrating.

Provider documentation: <https://docs.panta.market/>. Bounty: <https://superteam.fun/earn/listing/panta-api-side-track>. Powered by Panta.
