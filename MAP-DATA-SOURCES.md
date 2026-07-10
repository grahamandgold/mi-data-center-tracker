# Michigan Data Center Tracker — Map Data Sources

Everything the map needs lives in this repo (GitHub Pages, base path **`/mi-data-center-tracker/`**). All URLs below are relative to the site root. No API/keys required — it's all static JSON/GeoJSON, fetched client-side.

**Ground rule (non-negotiable):** every plotted record is sourced. Each point carries `source_url`, `source_name`, `verified_date`, and `confidence`. The map must surface the source (popup link). Never invent a point, a stat, or a coordinate.

---

## 1. Primary file — `map-data.json`

Single JSON object. `updated_at` is an ISO timestamp. Top-level keys:

| Key | What it is |
|---|---|
| `map_points` | **The pins.** Array of 83 point records across 6 layers (see below). |
| `map_layers` | The 6 point-layer definitions (id, label, description, color, default_on). |
| `boundary_layers` | Polygon boundary overlays → GeoJSON files (counties, townships, congressional). |
| `overlay_layers` | Extra overlays → GeoJSON (transmission grid, aquifers, water, buoys, airports, substations). Some have `min_zoom`, `style_by`, `style_map`. |
| `transmission_lines` | Proposed HV line routes (ITC Oneida–Sabine), with counties/townships/length. |
| `lake_levels` | Great Lakes gauge stations (NOAA station IDs) for live water levels. |
| `map_stories` | Featured map explainers (title, kicker, summary, region, source). |
| `map_meta` | Version, tagline, badge, external map link. |
| `stats_ribbon` | Which computed counts to show (keys: total, projects, moratoria…). |
| `industry_stats` / `context_facts` | Sourced national context stats + facts. |
| `live_map_links` | Outbound live tools (AIS ships, GLOS buoys, NOAA levels). |
| `site_links` / `sponsors` | Nav links + sponsor block. |

### The point model (`map_points[]`)
Every point — regardless of layer — uses the **same flat schema**:

```json
{
  "name": "Saline Township campus (Stargate)",
  "layer": "projects",
  "status": "Under construction",
  "municipality": "Saline Township",
  "county": "Washtenaw",
  "developer": "Related Digital / Oracle / OpenAI",
  "power_mw": "1,400",          // STRING, comma-formatted; "" = undisclosed. Parse before math.
  "latitude": 42.166,            // number
  "longitude": -83.782,          // number
  "source_url": "https://…",
  "source_name": "Engineering News-Record",
  "verified_date": "2026-06-02",
  "confidence": "Confirmed",     // "Confirmed" | "Reported"
  "note": "250-acre build on 575-acre property…"
}
```

### The 6 point layers (color = brand palette)

| `layer` | Count | Label | Color | Notes |
|---|---|---|---|---|
| `projects` | 19 | Data center sites | `#cf102d` (red) | status: Proposed / Under review / Conditionally approved / Approved / Under construction / Withdrawn / Rejected by planning commission |
| `moratoria` | 33 | Moratoria & pauses | `#e09820` (amber) | status: "Moratorium" (local pauses/bans) |
| `generation` | 24 | Power generation | `#14b8a6` (teal) | existing plants; status = fuel type (Nuclear, etc.); `power_mw` = plant capacity |
| `transmission` | 4 | Grid proposals | `#9c5fc9` (violet) | substations/line endpoints |
| `meetings` | 2 | Public meetings | `#5b9cf5` (blue) | upcoming hearings; `verified_date` = meeting date |
| `policy` | 1 | Capitol & policy | `#22a86a` (green) | MPSC tariffs etc. |

`map_layers[]` gives each: `{id, label, description, color, default_on}` — use it to build the legend + toggles instead of hardcoding.

---

## 2. GeoJSON overlays — `geo/*.geojson`

Referenced by `boundary_layers` and `overlay_layers` (each entry has `id, label, description, color, url, default_on`, plus optional `min_zoom`, `geometry_type`, `style_by`, `style_map`).

| File | Features | Geometry | Key props | Use |
|---|---|---|---|---|
| `geo/mi-counties.geojson` | 83 | Polygon/Multi | name, fips, label | County boundaries |
| `geo/mi-townships.geojson` | 1,240 | Polygon/Multi | name, fips, label | Township boundaries (1.5 MB) |
| `geo/mi-congressional-districts.geojson` | 13 | Polygon | district, name, label | 118th Congress districts |
| `geo/mi-transmission-grid.geojson` | 1,737 | LineString | voltage, voltage_class, owner, status, type | 100kV+ grid (HIFLD). `style_by: voltage_class` (345/230/138/120/100 kV → color/weight in `style_map`); `min_zoom: 7` |
| `geo/mi-aquifers.geojson` | 1,388 | Polygon/Multi | category, label | Glacial aquifers (1.1 MB) |
| `geo/mi-water-sources.geojson` | 21 | Point | name, type, operator, county, note | Public water intakes/sources |
| `geo/mi-substations.geojson` | 15 | Point | name, operator, type, county | Major substations |
| `geo/mi-noaa-buoys.geojson` | 9 | Point | name, station, type | NOAA buoys |
| `geo/mi-airports.geojson` | 14 | Point | name, code, county | Commercial airports |

Big files (townships, aquifers, transmission) should be lazy-loaded on toggle / `min_zoom`, not on first paint.

---

## 3. Live / dynamic data

- **`water-live.json`** — refreshed by an agent; current Great Lakes levels + water context.
- **`lake_levels`** (inside map-data.json) — NOAA gauge stations per lake (Superior/Michigan/Huron/Erie/St. Clair) with `station` IDs, for pulling live levels from NOAA if desired.
- **`live_map_links`** — outbound live tools (BoatNerd AIS, GLOS Seagull, NOAA GLERL).

---

## 4. Stats (don't recompute wrong)

The homepage/map counts (e.g. "19 projects", "2.5 GW disclosed", "72 communities") are derived from `map-data.json` — count `map_points` by `layer`, and sum `power_mw` (parse the comma strings; skip blanks) for disclosed load. `content-data.js` also exposes `window.MDCT_STATS` (precomputed). Use one source; never type a number by hand.

---

## 5. Quick-start for the map build

1. `fetch('map-data.json')` → render `map_points` colored by `map_layers`; popups show `name`, `municipality/county`, `status`, `power_mw` (if any), and a **Source ↗** link (`source_url`).
2. Build legend + layer toggles from `map_layers` + `boundary_layers` + `overlay_layers`.
3. Load GeoJSON overlays on demand from the `url` in each layer def; style the grid by `voltage_class` using `style_map`.
4. Center on Michigan (~`[44.3, -85.6]`, zoom 6). Recommended basemap: CARTO dark (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) to match the site's dark theme — or `light_all` for a light map.
5. Keep the source link visible. That's the whole credibility model.

---

## 6. Meetings data

Two places carry meetings — use whichever fits the map:

**A. `live-data.json` → `meetings[]`** (the richer, canonical feed; drives the homepage "On Deck" and the Meetings page):

```json
{
  "iso": "2026-07-09",                 // meeting date (YYYY-MM-DD)
  "body": "Lenox Township Board",      // governing body
  "topic": "Regular meeting — data center zoning on the radar",
  "region": "SE Michigan",             // display label
  "regionKey": "metro",                // region key (metro=se, west, mid, north) — see §7
  "county": "Macomb",
  "time": "7:00 PM",                   // local time string
  "status": "Board meeting",           // meeting TYPE: "Board meeting" | "State hearing" | "Public hearing"
  "urgent": false,
  "link": "https://…/agendacenter",    // agenda/details URL
  "linkLabel": "Agenda"                // "Agenda" or "Details"
}
```
Note: meeting records here have **no lat/lng** — they're time-based, not mapped by coordinate. To place them on a map, geocode by `county`/`body`, or pull the 2 meeting *points* that do have coordinates from `map-data.json` (`layer: "meetings"`, blue `#5b9cf5`, `verified_date` = meeting date). `live-data.json` also holds the `stories[]` news feed (see §8).

**B. `map-data.json` → `map_points` where `layer:"meetings"`** — same flat point schema as everything else, with real lat/lng, for pins.

---

## 7. Region taxonomy (categorization)

**Four regions + Statewide.** Keys and labels (`REGIONS`):

| key | label |
|---|---|
| `se` | SE Michigan |
| `west` | West Michigan |
| `mid` | Mid-Michigan *(Lansing/Jackson/Flint/Saginaw/Bay City/Midland/Mt. Pleasant broadcast belt — the old "Capital Region" is folded in here)* |
| `north` | Northern Michigan *(incl. the U.P.)* |
| `statewide` | Statewide (fallback / no county) |

Region is **derived from county**, never trusted blind (so the map, stats, and stories never disagree). County → region map:

- **se:** Wayne, Oakland, Macomb, Washtenaw, Monroe, Livingston, St. Clair, Lenawee
- **west:** Berrien, Cass, St. Joseph, Branch, Hillsdale, Van Buren, Kalamazoo, Calhoun, Allegan, Barry, Ottawa, Kent, Ionia, Muskegon, Montcalm, Newaygo, Oceana, Mecosta, Mason, Lake, Osceola
- **mid:** Ingham, Clinton, Eaton, Jackson, Shiawassee, Gratiot, Genesee, Saginaw, Midland, Bay, Isabella, Tuscola, Lapeer, Sanilac, Huron, Arenac, Gladwin, Clare
- **north:** everything else (Grand Traverse, Emmet, Cheboygan, Marquette, Chippewa, … all U.P. counties)

Logic: lowercase the county, strip a trailing "County"/"Co.", look it up; unknown/empty → `statewide`. (`metro` and `capital` are accepted legacy inputs → normalized to `se` and `mid`.)

---

## 8. Status categorization + colors

Raw `status` strings are messy; normalize them into **5 status buckets** for map coloring/filtering (this is the exact live logic, `mapStatusKey(status, layer)`):

| Bucket | Matches (case-insensitive), or layer | Suggested color |
|---|---|---|
| `Moratorium` | `layer === "moratoria"`, or status has *moratorium / pause* | `#e09820` amber |
| `Construction` | *under construction / construction* | `#cf102d` red |
| `Operating` | *operating / approved / conditionally* | `#16a36f` green |
| `Proposed` | *proposed / review / pending / filed* (also the default) | `#c9a227` gold |
| `Withdrawn` | *withdrawn / rejected / halted / dead* | `#8a847c` gray |

Actual `status` values in the data today:
- **projects:** Proposed (9), Withdrawn (4), Approved (2), Under construction (1), Conditionally approved (1), Under review (1), Rejected by planning commission (1)
- **generation:** the `status` field is the **fuel type** — Wind, Natural gas, Solar, Coal, Nuclear, Hydroelectric (color generation pins by fuel if you show them)
- **meetings:** the `status` is the **meeting type** — Board meeting, State hearing, Public hearing

Other categorization used across the site (for filters/chips):
- **Story tags** (news feed): `Power & Grid`, `Local Government`, `Policy`, `Water`, `Money`, `Explainers`
- **`confidence`** on every point: `Confirmed` vs `Reported` (show as a badge; don't hide Reported, just label it)
- **`power_mw`**: string like `"1,400"`; `parseMW()` = strip commas → number; blank → label "Undisclosed" (never 0 on screen)

There's a ready-made normalizer in `mdct-editorial.js` — `MDCT.recordFromPoint(point)` — that turns any raw map point into a clean record `{type, name, city, county, region, operator, status(bucket), rawStatus, load, loadLabel, lat, lng, …}`. The design Claude can copy that function's logic rather than re-deriving it.
