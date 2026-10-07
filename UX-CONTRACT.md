# Panta Desk behavior contract

`public/app.mjs` owns the single-page interaction; `public/model.mjs` owns formatting, evidence-link validation and export. `public/styles.css` owns tokens and responsive layout. There are no alternative component implementations.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native HTML select in index.html | DESIGN.md | native | Browser category/status selection |
| Scrollbar | public/styles.css global baseline | DESIGN.md | geometry only | Browser computed styles |
| Toast | announce() in public/app.mjs | This contract | polite status | Browser status text |

- Catalog: category/status query the API; text search and watchlist filter only loaded rows. Load more appends distinct IDs. AbortController and identity checks prevent stale catalog responses from replacing new results. Previous rows remain labeled as potentially stale after a refresh failure.
- Comparison: up to three explicit markets, independent of current catalog filters. Each has detail and activity provenance. Removing a market aborts its requests. Refresh clears selected snapshots while preserving saved notes and watchlist. Export is unavailable while detail requests are pending.
- Evidence: exact title, description and supplied resolution rule remain separate. Source links are validated HTTP(S) URLs without embedded credentials. An empty title gets an explicit missing-question label. A missing field does not become a guess. Resolved outcome values retain a distinct label.
- Activity: counts refer only to returned rows. Date uses blockTime with timestamp fallback. Mainnet transaction links require live activity provenance and a valid signature; sandbox/sample signatures cannot become mainnet evidence.
- Review: checks and notes are local browser data. Writes are caught; a failure offers Markdown export. These marks are user review records, not certification. Notes are bounded to 10,000 characters.
- Select: native browser/OS popup ownership is accepted; labels and keyboard behavior remain native. No app-authored popup geometry is promised.
- Feedback: contextual status/error text and one polite announcement region. No native dialogs, fake progress or optimistic payment state.
- Accessibility: semantic landmarks, visible control labels, keyboard actions, focus outlines, explicit selected/disabled state, UTC text dates, document scroll, mobile stacking and reduced motion. Full assistive-technology certification is outside this prototype's verification scope.
