# Handoff — Mobile/Responsive Fixes (Michigan Data Center Tracker redesign)

**For:** Codex
**From:** the integration assistant
**Goal:** Make the redesigned site fully responsive on phone + tablet. The desktop layout, data, and numbers are already correct and verified — **this is a CSS/layout job only. Do not change any data or numbers.**

---

## 1. Where everything lives

- **Repo:** `github.com/grahamandgold/mi-data-center-tracker` (GitHub Pages, base path `/mi-data-center-tracker/`).
- **Current LIVE site (old red design):** `https://grahamandgold.github.io/mi-data-center-tracker/` — **do not touch.** Served from repo root on `main`.
- **The redesign you're fixing (blue/light):** lives in the **`preview/`** folder on `main`, live at:
  **`https://grahamandgold.github.io/mi-data-center-tracker/preview/`**
- **Work only in `preview/`.** There are two older staging folders (`_redesign-incoming/`, `_redesign-build/`) — **ignore them, they're stale scratch.** `preview/` is the single source of truth and has every fix.

### Files in `preview/` (21 pages + runtime + data)
- Pages (clean URLs): `index.html`, `live-map.html`, `data.html`, `stories.html`, `meetings.html`, `dashboard.html`, `learn.html`, `understanding-the-power.html`, `faq.html`, `your-voice-2026.html`, `subscribe.html`, `advertise.html`, `methodology.html`, `about.html`, `corrections.html`, `privacy.html`, `terms.html`, `brand-kit.html`, `social-templates.html`, `data-ops.html`, `daily-briefing.html`.
- Runtime: `support.js` (the framework — see below), `image-slot.js`, `doc-page.js`.
- Data (pages fetch these at runtime): `map-data.json`, `live-data.json`, plus `michigan.geojson`, `mi-glyph.json`.

---

## 2. The framework (important — it's not plain HTML)

Each page is an HTML file containing a `<x-dc>` custom element and an inline
`<script type="text/x-dc" data-dc-script>` with `class Component extends DCLogic { ... }`.
**`support.js` is a small React-based runtime** that parses `<x-dc>`, mounts the component, and
renders. Key things:

- **Everything is styled with INLINE `style="..."` attributes. There are almost no CSS classes and almost no `@media` queries.** That's the root cause of the broken mobile layout — the multi-column grids never collapse.
- Custom attribute `style-hover="..."` handles hover states (framework feature).
- `support.js` self-fetches `location.href` to hydrate; the component's root name is derived from the filename. **Renaming files is safe** (already tested), but you shouldn't need to.
- Data-driven lists (the Data table rows, map pins, story cards, meeting rows) are **rendered by JS into container elements** — they still end up as normal DOM with inline styles, so CSS attribute selectors (below) match them fine.

---

## 3. What I already did (your starting point)

I injected a shared block into every page's `<head>`:

```html
<style id="mdct-mobile-fix"> ... </style>
```

Because there are no classes to target, it uses **CSS attribute-substring selectors** on the inline
styles, with `!important` to beat the inline values. Current rules:

- `@media (max-width:960px)` → collapse `repeat(3/4/5/6/7,1fr)` grids to 2 columns; collapse the wide feature rows (`1.45fr 1fr 0.92fr`, etc.) to 1 column; `overflow-x:hidden`.
- `@media (max-width:640px)` → collapse **all** grids to 1 column; trim the big `padding:... 40px` side padding to 18px; clamp `img/svg/canvas` to `max-width:100%`.

This fixed the worst grid overflow but **is a blunt instrument.** It doesn't handle flex-based rows, absolutely-positioned overlays, fixed-width children, or the map/sidebar layout. That's where you come in. Find the block by searching `id="mdct-mobile-fix"` in any page.

**The pattern that works here:** `[style*="<inline-style-substring>"] { ...; }` inside a media query with `!important`. Example:
```css
@media (max-width:640px){
  [style*="grid-template-columns:repeat(4,1fr)"]{ grid-template-columns:1fr !important; }
}
```
You may prefer to **add real classes** to the worst offenders and write normal CSS — that's cleaner and fine to do. Just remember inline styles win unless you use `!important` or a class + `!important`.

---

## 4. Known remaining mobile problems (from real iPhone screenshots)

1. **Homepage (`index.html`) hero ribbon** — 4 stat cells (`grid-template-columns:repeat(4,1fr)`) overflow off-screen ("33 LOCAL PAUSES / 1.65× PROJECTS" gets cut off). Should stack.
2. **Homepage 3-column body** (`grid-template-columns:1.45fr 1fr 0.92fr`: THE WIRE / LIVE MAP / GET INVOLVED) — columns overlap badly; the middle "LIVE MAP" card's text ("33 local pauses vs 20 projects…") **overlaps the Michigan map graphic**. Likely an absolutely-positioned element inside the map card. Needs to stack and the overlay repositioned.
3. **Homepage "OPEN THE LIVE MAP" button** renders as a tiny black square with vertically-wrapped text.
4. **Meetings (`meetings.html`)** — meeting rows are a date-column + body-column layout; on mobile the **body text is cut off on the right**. Rows should stack (date above body).
5. **Dashboard (`dashboard.html`)** — charts panel leaves a **huge empty white area** and "THE BUILDOUT CURVE" is cut off on the right. The chart grid needs to stack and the SVG/canvas charts need `width:100%`.
6. **"Explore the Tracker" cards (homepage)** — horizontal card row overflows (4th card cut off). Either a scroll-row (ok) or should wrap — verify.
7. **General** — oversized `40px` side padding wastes space on phones (partially handled at ≤640, extend as needed).

**Nav:** the top nav is a horizontal list; on mobile it may need a hamburger. `index.html` and `subscribe.html` are the only two pages that already had a couple of real `@media` rules — look there for any existing mobile nav pattern before adding your own.

---

## 5. How to preview + test

- **Test responsiveness in Chrome DevTools device mode** (iPhone/iPad presets) or a real device. (Heads up: some remote/headless browsers pin the viewport ~1244px and won't show mobile — use real DevTools.)
- Local quick-serve: `cd preview && python3 -m http.server 8000` → open `http://localhost:8000/`. Data fetches are relative, so they resolve because `map-data.json`/`live-data.json` sit in `preview/`.

## 6. How to deploy

Files are committed to `main` and served by GitHub Pages:
```bash
cd /path/to/mi-data-center-tracker
git add preview
git commit -m "Mobile: <what you fixed>"
git pull --rebase --autostash origin main   # an agent pipeline pushes data commits; rebase first
git push origin main
```
GitHub Pages/CDN caches ~1–2 min. **Append `?v=2` (bump the number) to the URL to bust the cache** when verifying.

---

## 7. Hard rules — do NOT change

- **No data/number changes.** Verified figures, consistent site-wide: **20 tracked projects · 2.9 GW disclosed · 33 mapped pauses · 1.65× ratio.** (Exception: the FAQ intentionally shows statewide-cited `~30 / 52+` with sources — leave it; that's a pending editorial decision, not a bug.)
- **Don't edit the `<script type="text/x-dc">` component logic** unless a layout fix truly requires it — prefer CSS.
- **Don't touch repo root / the old live site**, `map-data.json`, `live-data.json`, or the `scripts/` folder (agent pipeline).
- Keep the `noindex` meta on preview pages until the site goes fully live.
- Preserve the brand tokens (CSS vars like `--lake #1E6FC4`, `--ink`, `--mist`, `--cherry`, Archivo + IBM Plex Mono fonts).

---

## 8. Suggested order of attack
1. Homepage: ribbon → 3-col body/overlap → explore cards → nav. (Highest visibility.)
2. Meetings rows. 3. Dashboard charts. 4. Sweep the rest at 390px + 768px in DevTools.
Consider replacing the blunt `mdct-mobile-fix` block with per-section classes as you go.
