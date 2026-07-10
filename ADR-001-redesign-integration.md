# ADR-001: Integrating the blue-on-light redesign

**Status:** Accepted
**Date:** 2026-07-09
**Deciders:** Andy (News Director). Built by the integration agent; redesign authored by a second agent.

## Context

A second Claude produced a full 21-page redesign ("boutique" blue-on-light brand) as a
self-contained static site in a custom `.dc.html` component framework (runtime: `support.js`).
Three problems made it unsafe to publish as-delivered:

1. **Data was rewritten, not just restyled.** Each data page carried its own hardcoded
   `_data()` array. Several project pins were fabricated (New Boston 900 MW, Pontiac 300 MW,
   Portage 250 MW — the latter two are actually *moratorium* communities), inflating the
   disclosed-load headline to a false **3.25 GW**. Verified figure is **~2.9 GW**.
2. **Duplication broke the single-source model.** The same dataset was copy-pasted into 5+
   pages, contradicting `SOURCES.md`'s rule that the map is the one place data is updated.
3. **The newsletter signup was a no-op** (validated then `setState`, never submitted).

Constraints: the live site (`grahamandgold/mi-data-center-tracker`, GitHub Pages base
`/mi-data-center-tracker/`) must stay untouched until verified; the agent pipeline that
maintains `map-data.json` / `live-data.json` must keep working; "the map is truth."

## Decision

Adopt the redesign's **presentation** but not its **data**. Rewire every data-bearing page to
**fetch the existing verified JSON** (`map-data.json`, `live-data.json`) at runtime, keeping the
embedded arrays only as an offline fallback. Stage everything in `_redesign-incoming/` (never
served), verify on a **local server on the user's Mac**, then promote via a `redesign` branch
before merging to `main`.

## Options Considered

### Option A: Publish redesign as-is (embedded data)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Correctness | **Fails** — fabricated pins + 3.25 GW go public under the newsroom byline |
| Maintainability | Poor — data updates need hand-edits in 5+ files |

**Cons:** Violates the map-is-truth / no-fabrication standard. Rejected.

### Option B: Fetch single source of truth (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — per-page transform from map schema to the page's shape |
| Correctness | Strong — one verified dataset, agent pipeline stays authoritative |
| Maintainability | Strong — update the map, every page follows |

**Pros:** Restores single-source; fixes dead source links; auto-reflects agent updates.
**Cons:** Field-shape transforms per page; render only verifiable once served over http.

## Trade-off Analysis

Embedding is simpler but structurally wrong for a sourced newsroom — the whole value is that
every figure traces to the map. The fetch approach costs a small transform layer per page
(schema mapping: `power_mw→mw`, `source_url→url`, county→region, etc.) but keeps the redesign
honest and low-maintenance. Fallback arrays mean a failed fetch degrades to last-known data
rather than an empty page.

## Consequences

- **Easier:** one data update propagates everywhere; source links are real; stats compute live.
- **Harder:** the `.dc.html` framework must be preserved (can't flatten to plain HTML without
  reworking `support.js`); render verification requires an http server, not file://.
- **Revisit:** the Live Map's curated Oneida–Sabine corridor is kept hardcoded (no `oneida`
  layer in `map-data.json`) — fold into the data model later if it should be sourced/dynamic.

## Action Items

1. [x] Add verified Marshall project; exclude fabricated pins; disclosed load → 2.9 GW.
2. [x] Rewire The Data, Live Map, Meetings, Stories to fetch the JSON (with fallbacks).
3. [x] Wire Subscribe to the real Mailchimp audience (JSONP, double opt-in).
4. [x] Stand up a local verification server; confirm The Data renders live.
5. [ ] Recompute hardcoded headline numbers (3.25 GW → 2.9 GW) on Home/Power/FAQ/Methodology/Dashboard/Daily Briefing + `SOURCES.md` disclosed table.
6. [ ] Wire the homepage inline signup like Subscribe.
7. [ ] Clean URLs (drop spaces/`.dc.html`) + redirects; vendor unpkg libs locally; `noindex` staging.
8. [ ] Promote to a `redesign` branch; final verification; merge to `main` with a rollback tag.
