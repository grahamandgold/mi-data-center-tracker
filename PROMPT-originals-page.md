# Prompt for Claude Design — "Originals" content page

Build a new page for the **Michigan Data Center Tracker** called **The Desk** (our original reporting), plus the individual **article/detail** view it links to. This is where *our own* journalism lives — agenda breakdowns, meeting recaps, explainers, and data analysis — as opposed to the aggregated "Wire" (which just rewrites and links to other outlets). This content is what makes us a *source*, not a mirror, so it needs to feel authoritative and unmistakably ours.

## Brand system (match it exactly)
- Identity: a precise, engineered, light public-record watchdog. Runs on **data and typography, not stock photos.**
- Palette: **Great Lakes Blue `#1E6FC4`** (primary), Harbor `#124E8C`, Huron Teal `#0E7C86`, Pine `#1E8E52`, **Copper `#C9781F`** (the single warm accent), **Cherry `#C4342C`** (alerts/pauses only), Superior Navy `#0C1E33`, Ink `#14212E` (text), Mist `#EDF1F6` (surfaces), Paper `#FFFFFF` (cards).
- Type: **Archivo** for display/UI (800/900 headlines, 400–500 body), **IBM Plex Mono** for data, labels, timestamps, kickers.
- Logo: the targeting-reticle mark + wordmark; alt mark is the dotted Michigan with a copper site-pin. Signature image is the **dot-grid Michigan "coverage field."**
- Use the **shared site header and footer** already on the other pages (Home · Live Map · The Data · Stories · Meetings · Learn · Diagrams · Sponsor) so this page sits inside the site seamlessly. Add "The Desk" to the nav.

## What this page is (voice)
Eyebrow: "Original reporting." H1: **"From the Desk."** Sub: *"Reporting we do ourselves — reading the agendas, permits and packets so you don't have to. Every fact traces to a primary document."* This is the differentiator; lean into the "we read the 400-page packet" value.

## The two views to build
### A. Index — `/the-desk`
- Hero band (Ink/Navy, dot-grid Michigan on the right).
- A **featured original** (the latest/most important) as a large card.
- **Filter bar** by type: `All · Agenda Breakdown · Meeting Recap · Explainer · Analysis · Investigation` — and by region (SE / West / Mid / Northern Michigan).
- A **grid/list of article cards**: kicker (type), headline, dek, byline "Michigan Data Center Tracker," date, read-time, region chip, and — critically — an **"ORIGINAL" badge** (copper) that distinguishes these from aggregated Wire items.
- Empty state uses the dot-grid field, never a spinner.

### B. Article detail — `/the-desk/{slug}`
- **Header:** type kicker · headline · dek · byline "By the Michigan Data Center Tracker desk" · published + "updated" dates · read-time · region.
- **Body:** long-form (headings, pull-quotes, inline data callouts). Support an occasional inline chart or the map embed.
- **"Sources & documents" block (required):** a list of the **primary documents** the piece is built on — the actual agenda PDF, permit, packet, .gov page — each linked. This is the credibility layer; it must be prominent.
- **"Related on the tracker" sidebar:** the project(s) this story is about (link to the project detail spot), the relevant meeting, and any moratorium in that community — all pulled by `county`/`related_project` from the data.
- Share + "Get the daily brief" CTA.

## Data model — read from a new `the-desk.json` (design against this shape)
```json
{
  "updated_at": "2026-07-09T…",
  "articles": [
    {
      "slug": "lenox-township-july-packet",
      "type": "agenda-breakdown",        // agenda-breakdown | recap | explainer | analysis | investigation
      "title": "What's buried in Lenox Township's July packet",
      "dek": "A 40-page agenda hides a rezoning that would clear the way for a 900 MW campus.",
      "byline": "Michigan Data Center Tracker",
      "published_at": "2026-07-08",
      "updated_at": "2026-07-09",
      "region": "se",                     // se | west | mid | north | statewide
      "county": "Macomb",
      "related_project": "van-buren-google",   // slug into the projects data (may be null)
      "read_minutes": 4,
      "body": "…markdown or block array…",
      "documents": [                      // PRIMARY sources — the whole point
        { "label": "Lenox Twp agenda (PDF)", "url": "https://…gov/…", "kind": "agenda" }
      ],
      "sources": [
        { "name": "Lenox Township", "url": "https://…", "date": "2026-07-08" }
      ],
      "tags": ["rezoning", "power"]
    }
  ]
}
```
Notes for the build:
- **Original vs aggregated:** every card here is an *original* (byline = the tracker, sourced to primary docs). Do NOT mix in the aggregated Wire feed. The Wire (`live-data.json` stories) is a separate, outlet-sourced list — keep the visual distinction obvious.
- **Sourcing rule (non-negotiable):** nothing publishes without at least one `documents[]` primary source. Show it. If a claim isn't in a linked document, it doesn't go on the page. No opinion presented as fact.
- **Cross-links:** `related_project` slugs match the projects in `map-data.json` (see PROJECT-DETAIL-DATA.md); `county` drives the "related meetings/moratoria" via the same region logic (see MAP-DATA-SOURCES.md §7).
- Fetch fresh / cache-bust — this file updates as the desk publishes.

## Integration
- Add **"The Desk"** to the site nav.
- On the homepage, add a **"From the Desk"** slot showing the latest 2–3 originals (with the ORIGINAL badge) so our own reporting gets top billing over the aggregated wire.
- On each **project detail spot**, surface any originals whose `related_project` matches.
- Permalinks: `/the-desk/{slug}`.

## Deliverable
Self-contained page(s) matching the brand tokens above, reading from `the-desk.json` (build with 3–4 realistic sample articles across the types so the layout is exercised), responsive, dark-header/light-body like the rest of the site. Keep every fact traceable to a linked document — that's the identity.
