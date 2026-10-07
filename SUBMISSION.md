# Panta Desk — submission draft

Prepared on 7 October 2026. This is a reviewable draft; no competition entry has been submitted. Replace the pending links and personal details before using it.

## Entry details

| Field | Draft value |
| --- | --- |
| Product | Panta Desk |
| One-line description | A research workspace for comparing Panta prediction-market questions, rules, timing, and observed data. |
| Stage | Local working prototype |
| Intended users | Prediction-market researchers and people comparing questions before deciding whether to participate |
| Stack | Node.js 22.9+, browser JavaScript modules, HTML, CSS, Panta read API |
| Public product URL | Pending — the current application runs locally |
| Repository URL | https://github.com/Krishna-10-7/panta-desk |
| Presentation video | Pending — record and upload a separate pitch of up to 2 minutes (current portal limit) |
| Product demo video | Pending — record and upload the demo below; keep it under 3 minutes |
| Colosseum project link | https://colosseum.com/arena/projects/panta-desk — draft created; final submission pending |
| Founder/team names, location, experience | Entrant to supply accurate details |

## Product description for Colosseum and the Panta sidetrack

Panta Desk helps a researcher inspect the meaning of a prediction-market question before making a decision. Similar headlines can hide different closing dates, resolution rules, or evidence sources. A price alone does not explain those differences.

The product brings the question, exact description, supplied resolution rule, source links, closing time, API resolution time, share prices, and recent activity into a single workspace. Researchers can compare up to three markets, keep a local watchlist, record what they have checked, and export their findings as a Markdown brief.

The first version focuses on a clear research workflow: discover a market, inspect its terms, compare alternatives, and leave with a portable record. It requires no wallet connection. It does not place trades, create markets, claim funds, or send transactions.

### What is implemented

- Market discovery with Panta categories, status filters, cursor pagination, and manual refresh. Text search covers the markets already loaded in the browser.
- Market details containing the exact description, API-supplied resolution rule and evidence links, closing time, and API resolution time. Missing fields remain visibly missing.
- Observed YES/NO share prices with a displayed price source. A resolved outcome is labelled as an outcome value when the API identifies it as such; it is not presented as a current trading quote or a verified forecast.
- Recent trade activity using the returned timestamps. The displayed trade count describes only the returned sample. Mainnet transaction links are omitted for sample or sandbox data.
- Side-by-side comparison of up to three selected markets.
- Watchlist, review checks, and research notes saved in the browser's local storage.
- Markdown export containing the selected questions, data provenance, rules, links, timing, prices, activity, and researcher notes.

### How Panta is integrated

The Node server reads Panta's categories, market catalog, individual market details, and recent trades from `https://live-api.panta.market/api/v1/`. Catalog requests pass category, status, page-size, and cursor parameters to the provider. The browser receives the response and retrieval metadata through the application's own read endpoints.

`PANTA_API_KEY` is a server environment variable. It is not included in browser assets or exposed by the configuration endpoint. The proxy accepts only the implemented read routes; it provides no trading or wallet endpoints. It bounds provider response size and request duration and displays errors for unavailable data.

The same interface can run with clearly labelled illustrative sample data. A test-key configuration or a provider disclaimer indicating sandbox fixtures is labelled as sandbox. A successful response from a configured production key is labelled as Panta API data. These labels describe the response source; they do not independently certify the provider's data or a market's resolution.

### Original contribution

This entry contributes the comparison and review interface, browser-local research workflow, provenance-aware display, and Markdown brief export. The current prototype was built with AI assistance. The entrant should review the code, explain their own contribution accurately, and disclose any relevant earlier work in the competition form.

### Current limitations

The application currently runs on localhost and the source is published on GitHub. A deployed product URL and recorded videos are still pending. Authenticated live catalog, cursor pagination, detail and trade-sample reads were verified on 7 October 2026. A deployed environment will need its own configuration and verification.

Data is a snapshot refreshed on request, not a streaming feed. Search is limited to loaded catalog pages. Watchlists and notes do not sync between devices or users. Checklist marks record a researcher's review; they do not certify evidence or market quality. No independent oracle verification, forecast validation, custom Solana program, or on-chain execution is implemented.

No customer adoption, revenue, or demand metrics are claimed. The repository contains automated tests; use the actual final command output when describing verification, and do not imply a production security audit.

### Proposed next steps and demand validation

The next product step is to invite a small group of prediction-market researchers to complete the same comparison task with and without Panta Desk. Measure whether they identify wording and timing differences, how long the review takes, and whether they use the exported brief. These are proposed experiments; none has been run yet.

If that workflow proves useful, the next priorities are broader catalog search, source-review history, and optional shared research. Distribution would begin through a public demo and direct feedback from Panta builders and market researchers. Pricing and business-model assumptions remain unvalidated.

## Optional Superteam India entry paragraph

Panta Desk is tooling around Panta's Solana prediction-market infrastructure. It makes market questions and supplied resolution information easier to inspect, compare, and document without requiring a wallet for research. Its potential ecosystem contribution is a clearer route from discovering a Solana market to understanding its terms.

This is an API-based research product; it does not deploy its own Solana program. The entrant must confirm that the project meets the track's Solana requirement and that the team is based in India. Select India in the Colosseum profile only if that is accurate. No residency or team eligibility is asserted by this draft.

## Product demo script — approximately 2 minutes 45 seconds

Record the real application. Keep its data-source banner visible. Use the relevant line below for the mode actually shown.

| Time | Show | Suggested narration |
| --- | --- | --- |
| 0:00–0:20 | Product heading and provenance banner | “This is Panta Desk, a workspace for researching prediction-market questions. Today I am showing **[illustrative sample data / Panta sandbox fixtures / Panta API responses retrieved at the displayed time]**. The banner makes that source explicit.” |
| 0:20–0:45 | Market library; category and status controls; load more if available | “The catalog comes from Panta's read API when a key is configured. I can filter by category and market status and load another page with the returned cursor. Search checks only the markets I have loaded.” |
| 0:45–1:20 | Inspect one market | “Here are the exact question, supplied resolution rule, evidence links, closing time, and API resolution time. Missing information stays missing. The YES and NO values are labelled using their price source; a resolved outcome is not treated as a current quote.” |
| 1:20–1:45 | Select a second market and show comparison | “These questions can now be reviewed side by side. I am looking for differences in wording, dates, and resolution terms before treating them as equivalent.” |
| 1:45–2:10 | Recent activity, review checks, a short note, watchlist | “Activity shows the returned trade sample, not lifetime trading volume. I can record what I checked and note what still needs clarification. The watchlist and these notes stay in this browser.” |
| 2:10–2:35 | Export research brief; open the downloaded Markdown file | “The export preserves the questions, source labels, retrieval times, rules, links, and my notes. That gives me a review record I can keep or share.” |
| 2:35–2:45 | Return to the workspace | “This prototype supports research without connecting a wallet. The next step is user feedback and verification of the production-data workflow.” |

If a feature is unavailable in the response being demonstrated, show the application's missing-data state and explain it. Do not replace real API responses with samples while describing them as live. Record a separate pitch of up to 2 minutes covering the entrant, problem, target user, contribution, limitations, and proposed validation plan. The current signed-in portal's 2-minute limit takes precedence over the broader public FAQ.

## Submission destinations and deadline

Submit the product once through the [official Colosseum Crypto World's Fair portal](https://colosseum.com/hackathon). Then submit it separately to the [Panta API sidetrack on Superteam Earn](https://superteam.fun/earn/listing/panta-api-side-track). If eligible, also submit it to the [Superteam India track](https://superteam.fun/earn/listing/colosseum-crypto-worlds-fair-hackathon-superteam-india-track). An Earn sidetrack submission does not replace the Colosseum entry.

Both Earn listing pages were rechecked on 7 October 2026. Their published `deadline` and `validThrough` metadata are **13 October 2026 at 06:59 UTC — 12:29 PM IST**. The India listing describes the main submission date as October 12. Complete all forms early and recheck each portal's displayed cutoff before relying on the remaining time.

The Panta listing requires English and a working demonstration with meaningful Panta API use. The India listing requires a team based in India, a Solana project, India selected in Colosseum, and entries on both platforms. Colosseum's [submission guidance](https://colosseum.com/hackathon) requires each teammate to have an account and permits one product per team or individual. It describes separate presentation and product-demo videos and a repository available to reviewers.

## Before sending this draft

1. The entrant creates or signs into their own Colosseum and Superteam Earn accounts, joins the current hackathon, and completes accurate team/profile details. They read and accept the current rules, terms, and attestations themselves.
2. Review this prototype, confirm the team's development history and AI-assisted contribution disclosure, and supply truthful founder backgrounds and location.
3. Configure and verify a Panta key through the server environment. Choose the actual demo mode and keep its provenance visible in recordings.
4. Publish a reviewer-accessible repository and working demo, or provide the alternative access accepted by the submission form. Remove secrets and check the published files before sharing links.
5. Record the presentation and product-demo videos, upload them, and replace all pending links. Check the form for any additional required assets or questions.
6. Enter the final verification results without inventing test counts, deployment claims, user metrics, or revenue. Submit the main Colosseum entry first, then the selected Earn entries, and save the confirmations.

Competition prizes depend on sponsor judging and eligibility. This prototype and draft do not establish a win or a payout.
