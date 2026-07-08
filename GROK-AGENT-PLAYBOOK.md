# Grok Agent Playbook — the automated newsroom

Four scheduled agents keep the site fresh. All run in **GitHub Actions** in this
repo (free on public repos) and call the **xAI Grok API**. The Grok.com Tasks UI
only supports daily schedules, so hourly automation lives here instead.

| Agent | Schedule | Writes | Safety model |
|---|---|---|---|
| **Wire agent** (`scripts/wire_agent.py`) | Hourly at :15 | `live-data.json` → commits to main | Strict schema validation + dead-link checks; falls back to the previous file on any failure |
| **Headline checker** (`scripts/headline_check.py`) | Same hourly run, stage 2 | Corrects/drops stories in `live-data.json` before commit | Fetches each source article and verifies our AI headline/dek against it — judge sees only the article text |
| **Map scout** (`scripts/map_scout.py`) | Daily 11:00 UTC | Opens a **pull request** on `map-data.json` | Never touches main — you review every map change; MI bounding-box + status-vocabulary checks |
| **Podcast** (`scripts/podcast_agent.py`) | Daily 9:45 UTC | `pod/latest.mp3` + `pod/latest.json` | Script is generated ONLY from the verified wire digest; two hosts (Ada = anchor, Mack = context) |

The pages hot-load `live-data.json` and `pod/latest.json` at runtime — agents
never rebuild HTML, so a bad run can degrade nothing.

## One-time setup (5 minutes)
1. Repo → **Settings → Secrets and variables → Actions → New repository secret**
   - `XAI_API_KEY` — from console.x.ai (required, all four agents)
   - `ELEVENLABS_API_KEY` — for the two podcast voices (or `OPENAI_API_KEY` as fallback; skip both and the podcast publishes a script but no audio)
2. Optional repo *variable*: `XAI_MODEL` (defaults to `grok-4`); `VOICE_ADA` / `VOICE_MACK` env vars to pick voices.
3. Actions tab → enable workflows → run **Hourly wire refresh** once manually (workflow_dispatch) and watch it commit.
4. Merge the first **Map scout** PR after checking its sources.

## Editorial guarantees enforced in code
- Headlines and deks are always original tracker language; the checker verifies
  they accurately portray the source article (numbers, names, proposed-vs-done, tone).
- Every story URL must be `https`, alive (HEAD-checked), and from the agent's own search.
- Meetings need official agenda links; stream links render a red **Watch live ↗** button.
- Fewer than 3 verified stories → the site keeps the previous feed rather than running thin.
- Map changes are human-approved by design (PR), because coordinates and statuses
  are the site's credibility. Rule: municipality centroids unless a source names the site.

## Freshness rules on the site (already deployed)
- Hot window = **15 hours** (`MDCT.HOT_HOURS` in `mdct-editorial.js`).
  ≤6h = pulsing red **Breaking** · ≤15h = gold **Fresh** · older = Latest.
- Timestamps are minute-granular ("42m ago"), so an hourly cadence reads honestly.
- The homepage "Updated …" stamp comes from `live-data.json.updated_at`.

## The podcast ("avatars going over headlines")
- Ships now as an audio show with two illustrated host avatars (A / M) in the
  player bar, daily date + duration from `pod/latest.json`.
- Script rule: hosts may add CONTEXT (what it means, who decides next) but no
  facts beyond the verified digest — that keeps the show as accurate as the wire.
- Video-avatar upgrade path: feed `pod/latest-script.json` to HeyGen/D-ID's API
  in the same workflow and publish an mp4 next to the mp3. Deliberately not
  enabled by default (cost + review burden).

## Weekly human pass (15 min)
- Skim commits by `grok-wire-agent`; spot-check 3 headlines against sources.
- Review/merge the map scout PRs; reject anything with a weak source.
- Promote the best wire items into `content-data.js` (the curated fallback).
- Listen to one podcast episode; adjust the prompt in `podcast_agent.py` if tone drifts.
