# Your Voice 2026 — Election Page: what we have so far

**Live:** `/mi-data-center-tracker/your-voice-2026.html` (linked from the homepage "Your Voice" promo and the nav).
**Purpose:** A nonpartisan voter guide showing **where Michigan candidates stand on data centers** — sourced quotes only.

---

## 1. The page (files + structure)

| File | Role |
|---|---|
| `your-voice-2026.html` | Page markup (uses the shared site header + drawer) |
| `your-voice-2026.css` | Page styles (incl. the new logo-forward hero) |
| `your-voice-2026.js` | Renders candidate cards + ballot filtering |
| `your-voice-data.js` | **The content** — races, candidates, sourced stances |
| `your-voice-zip-lookup.js` | ZIP → highlights your House/Senate districts |
| `your-voice-logo-dark.png` | Transparent "Your Voice, Your Candidates" logo (white/red, for dark) |

**Sections, top to bottom:**
1. **Hero (redesigned)** — the logo front & center, "2026" in red, lead line, and two CTAs: **Track the Election** (→ ballot) and **See Our Coverage** (→ stories). Eyebrow: "Tracking the public record."
2. **Find your ballot — ZIP lookup** (`#ballot`) — enter ZIP → highlights your tracked House/Senate districts.
3. **Sourced positions** — the candidate cards (photo, name, party, role, and each stance as a linked pull-quote).
4. **District map** — SE-Michigan Leaflet map of tracked legislative districts.
5. **Editorial standard** — the methodology note.

**The rule (shown on the page):** *"Every quote is copied from a linked public source (news, debate, campaign site, or official statement). The tracker does not rate or endorse candidates."* No ratings, no endorsements, no invented positions.

---

## 2. The data model (`your-voice-data.js`)

```js
window.YOUR_VOICE_2026 = {
  updated: "2026-07-09",
  disclaimer: "…sourced quotes only…",
  races: [
    {
      id: "us-senate",
      title: "U.S. Senate",
      subtitle: "Open seat · General election Nov. 3, 2026",
      scope: "statewide",            // statewide | senate | house
      candidates: [
        {
          id: "el-sayed",
          name: "Abdul El-Sayed",
          party: "Democratic",
          role: "U.S. Senate candidate",
          photo: "https://…",         // URL or local path; blank = initials fallback
          photoCredit: "Wikimedia Commons",
          stances: [
            {
              topic: "Federal AI & data-center regulation",
              quote: "We need legislation now…",   // verbatim, linked
              source: "Michigan Advance",
              url: "https://…",
              date: "2026-05-28",
              context: "Mackinac Policy Conference debate"
            }
          ]
        }
      ]
    }
  ]
};
```
A candidate with an empty `stances: []` renders a clean "no statement yet" card (already styled). Photos with no file fall back to an initials tile.

---

## 3. Current roster on the page (13 candidates, mostly with real sourced quotes)

### Statewide
**U.S. Senate** (open seat) — all 4 have photos + 2 stances each:
- Abdul El-Sayed (D) · Mallory McMorrow (D) · Haley Stevens (D) · Mike Rogers (R)

**Governor** (open seat):
- Jocelyn Benson (D) — photo, 2 stances · Dana Nessel (D) — photo, 2 stances · **Tom Leonard (R) — 2 stances, NO photo**

### State legislative districts (data-center hot spots)
- **HD-26** Dylan Wegela (D) — 2 stances, *no photo*
- **HD-14** Erin Byrnes (D) — *no stances yet, no photo*
- **HD-27** Jim DeSana (R) — 1 stance, *no photo*
- **HD-53** Joey Andrews (D) — 2 stances, *no photo*
- **SD-15** Jim Runestad (R) — 1 stance, *no photo*
- **HD-48** Jennifer Conlin (D) — *no stances yet, no photo*

**Photo status:** 6 of 13 have photos (the 4 Senate + Benson + Nessel). **7 still need photos:** Leonard, Wegela, Byrnes, DeSana, Andrews, Runestad, Conlin.

---

## 4. The 32 staged headshots (a DIFFERENT roster — decision needed)

In `img/candidates/` there are **32 real headshots** from your WKAR guide folder — but they're for **local races that are NOT on the page yet**, and we have **no data-center stances for them** (just name/office/party/photo/source):

- **U.S. House MI-07:** Bridget Brink (D), Matt Maasdam (D), William Lawrence (D), Tom Barrett (R)
- **MI House 73:** Dan Ewart (R), Norm Grant (R), Joshua Rockey (R), Julie Brixie (D)
- **MI House 74:** Aaron Iturralde (D), Harold Pope (D), TyJuan Thirdgill (D)
- **MI Senate 28:** Robert Pena (D), Rashida Harrison (D), Mark Polsdofer (D), Ted Kilvington (D), Julie DeRose (R)
- **MI Senate 34:** Roger Hauck (R), Rhonda Lange (R), Tyler Landgraf (D)
- **Delta Township Supervisor:** Dennis Fedewa (D), Andrea Cascarilla (D)
- **Jackson Mayor:** Christy Davis, Derk Dobies, Shalanda Hunt, Dena Morgan, John Wilson
- **Livingston 44th Circuit Court:** Andrea Banfield, Christopher Candela, Mark Gatesman, Mary Hayes, Kristina Lyke, Daniel Bain

**So there are two candidate sets that don't overlap.** None of the 32 photos match the 7 statewide/district folks who need photos.

---

## 5. Open decision (for you)

1. **Roster:** Keep the current statewide + district roster (it has the real sourced quotes)? Replace it with the local WKAR roster (has photos)? Or run **both** — statewide races on top, local races below?
2. **Photos:** For the current roster, we still need headshots for the 7 named above. For the local roster, photos are ready but they'd publish **without data-center stances** until quotes are verified.
3. **Stances-first rule:** Per the page's own standard, no candidate should show a *position* that isn't a linked quote. Local candidates would either show an honest "we're tracking their position" placeholder, or stay hidden until they have at least one sourced quote.

**My recommendation:** run both tiers — statewide (already sourced, strong) + the local WKAR races (photos ready) — and gate each local candidate's *stance* on a real quote, using a neutral "position not yet on record" line until then. That keeps it honest and gets your headshots live.

---

## 6. Design note (if the site rebrands)

The hero logo (`your-voice-logo-dark.png`) and the page's red/dark accents were built for the **current red-on-dark** identity. If the site moves to the new **blue-on-light** brand system, this page's hero logo and accent colors need to convert too — the "Your Voice, Your Candidates" mark is currently red.
