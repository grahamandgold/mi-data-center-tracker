# THE DATA — what we have per project (for building detail spots)

Source of truth: `map-data.json` → `map_points` where `layer === "projects"` (**19 projects**). Every project uses the same flat schema. This is also what powers the map and the Data table.

---

## 1. Per-project fields (and how reliably they're filled)

| Field | Fill rate | Notes |
|---|---|---|
| `name` | 19/19 | e.g. "Saline Township campus (Stargate)" |
| `municipality` | 19/19 | town/township |
| `county` | 19/19 | → region via the county→region map (se/west/mid/north) |
| `status` | 19/19 | Proposed / Under review / Conditionally approved / Approved / Under construction / Withdrawn / Rejected by planning commission |
| `developer` | 19/19 | company/owner (some "Undisclosed") |
| `latitude`, `longitude` | 19/19 | for the map + a mini-map on the detail spot |
| `confidence` | 19/19 | **Confirmed** (9) or **Reported** (10) — show as a badge |
| `verified_date` | 19/19 | when we last verified the record |
| `source_name` + `source_url` | 19/19 | the single primary citation (always present) |
| `note` | 19/19 | **the richest field** — 1–3 sentences of context (acreage, sq ft, $, timeline, opposition). This is your detail-body copy today. |
| `power_mw` | **5/19** | disclosed load, comma string ("1,400"). **14 are blank → show "Undisclosed," never 0.** |

**What's reliably available for every detail spot right now:** name, location (town/county/region), status, developer, confidence, verified date, coordinates, a one-line source citation, and a paragraph of context. That's enough for a solid v1 detail card.

---

## 2. The 19 projects (quick index)

| # | Project | Town · County | Status | Load | Developer |
|---|---|---|---|---|---|
| 1 | Saline Township campus (Stargate) | Saline Twp · Washtenaw | Under construction | 1,400 MW | Related Digital / Oracle / OpenAI |
| 2 | Van Buren Township Google | Van Buren Twp · Wayne | Proposed | 1,000 MW | Google (Project Cannoli) |
| 3 | Lyon Township Project Flex | Lyon Twp · Oakland | Conditionally approved | — | Verrus / Walbridge |
| 4 | Southfield Metrobloks | Southfield · Oakland | Approved | 100 MW | Metrobloks |
| 5 | Allen Park Solstice | Allen Park · Wayne | Rejected by planning comm. | 26 MW | Solstice Data |
| 6 | Mason-area proposal | Mason · Ingham | Proposed | — | Undisclosed |
| 7 | Howell Township Meta | Howell Twp · Livingston | Withdrawn | — | Randee LLC / Meta (reported) |
| 8 | Augusta Township Thor Equities | Augusta Twp · Washtenaw | Approved | — | Thor Equities |
| 9 | York Township Sansone (Toyota land) | York Twp · Washtenaw | Proposed | — | Sansone Group |
| 10 | Ypsilanti Twp UM / Los Alamos | Ypsilanti Twp · Washtenaw | Under review | — | U-M / Los Alamos |
| 11 | Gaines Township Microsoft | Gaines Twp · Kent | Proposed | — | Microsoft |
| 12 | Dorr Township Microsoft | Dorr Twp · Allegan | Proposed | — | Microsoft |
| 13 | Lowell Township Franklin Partners | Lowell Twp · Kent | Proposed | — | Franklin Partners |
| 14 | Pavilion Township Franklin Partners | Pavilion Twp · Kalamazoo | Withdrawn | — | Franklin Partners |
| 15 | Lansing Deep Green | Lansing · Ingham | Withdrawn | 24 MW | Deep Green |
| 16 | Frenchtown Project Cherry Blossom | Frenchtown Twp · Monroe | Proposed | — | Cloverleaf |
| 17 | Dundee Township Project Ironwood | Dundee Twp · Monroe | Proposed | — | Cloverleaf |
| 18 | Kalkaska Rocklocker | Kalkaska · Kalkaska | Withdrawn | — | Rocklocker LLC |
| 19 | Springfield Township 84-acre campus | Springfield Twp · Oakland | Proposed | — | Undisclosed |

Full records (with `note`, `source_url`, `verified_date`, coords) are in `map-data.json`.

---

## 3. What a "project detail spot" can show — v1 (from existing data)

- **Header:** name · status pill (color by status bucket) · confidence badge (Confirmed/Reported)
- **At a glance:** developer · municipality, county (+ region) · disclosed load (MW or "Undisclosed") · last verified date
- **Mini-map:** the lat/lng pin (reuse the map layer styling)
- **The record:** the `note` paragraph (context/story)
- **Source:** "Verified from {source_name} ↗" → `source_url` (the credibility line)
- **Related on the tracker** (cross-referenced by county/name — data already exists):
  - nearby **moratoria** (map_points `layer:"moratoria"` in same county)
  - upcoming **meetings** for that community (`live-data.json` meetings + map meetings)
  - **stories** mentioning it (`live-data.json` stories by county/keyword)

That gives every project a real page with zero new data entry.

---

## 4. To make the detail spots *rich*, add these fields (recommended schema growth)

A lot of this is **already sitting inside the `note` text** — it just needs to be pulled into structured fields so the detail spot can render facts, not prose. Suggested additions per project:

| New field | Example (from existing notes) | Why |
|---|---|---|
| `id` / `slug` | `saline-stargate` | **Needed for permalinks** — projects have no stable ID today; detail URLs need one |
| `acres` | 250 / 575 (Saline), 316 (Gaines), 522 (Augusta) | headline site-size fact |
| `sq_ft` | 1.8M (Lyon), 110,000 (Southfield) | scale |
| `investment_usd` | $1B (Mason), $1.2B (Ypsilanti), $120M (Lansing) | the "how big" number |
| `water_use` | (not tracked yet) | **the #1 public concern — worth researching** |
| `jobs` | (not tracked yet) | construction vs. permanent |
| `tax_deal` | referendum expected (Augusta), tax abatement (Saline) | the money angle |
| `timeline[]` | application → hearing → vote → withdrawn | a status history / dates |
| `sources[]` | array of {name, url, date} | detail pages deserve **multiple** citations, not one |
| `opposition` | 7–2 reject (Allen Park), backlash (Pavilion) | the fight |
| `utility` / `power_source` | BWL heat-reuse (Lansing) | grid/energy tie-in |

**Recommendation:** keep the current 13 fields as the backbone (they're 100% filled and safe), add `id`/`slug` + `sources[]` first (they make detail pages *possible* and *credible*), then structure `acres`/`sq_ft`/`investment_usd`/`water_use` from the notes as the "stat strip" on each detail page. Water use is the biggest missing story and the one readers care about most.

**Rule holds:** every fact on a detail spot must trace to a `source_url`. Blank load stays "Undisclosed." Confidence badge stays visible so "Reported" ≠ "Confirmed."
