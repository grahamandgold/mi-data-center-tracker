#!/usr/bin/env python3
"""Agenda investigator — original reporting from public documents.

For every meeting on the tracker calendar happening TODAY or TOMORROW (ET),
this agent opens the agenda, digs into linked packet PDFs, site plans,
renderings, staff reports, and any local coverage, and produces:

  1. Original preview stories ("Tonight in Saline: board takes up …") filed
     into the desk approval queue (live-data-pending.json) — the News
     Director approves before anything publishes.
  2. agenda-brief.json — tight bullets per meeting that the next morning's
     DATA CENTER INTELLIGENCE REPORT includes as "Inside the agendas".

Fact discipline: report ONLY what is in the documents or attributed
coverage. Cite the document ("per the staff report", "the site plan shows").
Never invent agenda items, numbers, or renderings. If the agenda can't be
read, say what's scheduled and link it — nothing more.

Requires: XAI_API_KEY. Stdlib only. Runs via .github/workflows/agenda-scout.yml.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

ROOT = Path(__file__).resolve().parents[1]
LIVE = ROOT / "live-data.json"
PENDING = ROOT / "live-data-pending.json"
BRIEF = ROOT / "agenda-brief.json"
NOTES = ROOT / "agent-notes.json"
KEY = os.environ.get("XAI_API_KEY", "")
MODEL = os.environ.get("XAI_MODEL", "grok-4")

ET_OFFSET = timedelta(hours=-4)  # EDT; close enough for date math year-round


def et_today() -> datetime:
    return datetime.now(timezone.utc) + ET_OFFSET


def director_notes() -> str:
    try:
        notes = json.loads(NOTES.read_text(encoding="utf-8")).get("notes", [])
        mine = [n for n in notes if n.get("agent") in ("All agents", "Assignment Manager")]
        if mine:
            return ("\nSTANDING NOTES FROM THE NEWS DIRECTOR (obey these):\n"
                    + "\n".join(f"- {n['text']}" for n in mine))
    except Exception:  # noqa: BLE001
        pass
    return ""


def investigate(meeting: dict, when_label: str) -> dict | None:
    prompt = f"""You are the agenda investigator for the Michigan Data Center Tracker —
a transparent aggregator doing document-based preview reporting.

THE MEETING ({when_label}):
- Body: {meeting.get('body')}
- Date: {meeting.get('iso')} at {meeting.get('time', 'TBD')} ET
- Topic on our calendar: {meeting.get('topic', '')}
- Agenda link: {meeting.get('link', '')}

YOUR JOB:
1. OPEN the agenda link. If it's a PDF or a meeting-portal page, read it.
2. DIG: find the packet — staff reports, site plans, renderings, rezoning
   requests, tax-abatement resolutions, moratorium drafts, utility agreements.
   Follow links inside the agenda page. Also search for local news coverage
   of this specific meeting.
3. REPORT what you actually found about data centers, power, water, zoning,
   or land use. Concrete specifics win: acreage, megawatts, parcel names,
   developer names, dollar figures, vote items — each attributed to the
   document it came from ("per the staff report", "the agenda shows").

FACT RULES (hard):
- Only facts from the documents or attributed local coverage. NEVER invent
  agenda items, figures, or renderings. No speculation about outcomes.
- If you cannot open the agenda or it has nothing data-center related,
  return {{"skip": true, "why": "<one line>"}}.
- Identify every named person by role. Political balance where relevant.
- Headline must be original wording, preview-framed ("{when_label} in X: …",
  "X board to weigh …"), never copied.

Respond ONLY with JSON:
{{"skip": false,
 "title": "<original preview headline, ≤95 chars>",
 "dek": "<2-3 sentences: the concrete items on the agenda, attributed>",
 "findings": "<the 3-5 most important specifics you found, attributed, one line each separated by ' | '>",
 "brief": "<one tight newsletter bullet, ≤160 chars, the single most important thing>",
 "region": "<Southeast Michigan|West Michigan|Mid-Michigan|Northern Michigan|statewide>"}}
{director_notes()}"""
    import xai_client
    out = xai_client.chat(KEY, {"model": MODEL, "messages": [{"role": "user", "content": prompt}],
                                "search_parameters": {"mode": "on"}, "temperature": 0.2}, timeout=420)
    if not out:
        return None
    try:
        text = out["choices"][0]["message"]["content"]
        m = re.search(r"\{.*\}", text, re.S)
        return json.loads(m.group(0)) if m else None
    except Exception as e:  # noqa: BLE001
        print(f"::warning::parse failed for {meeting.get('body')}: {e}")
        return None


def main() -> int:
    if not KEY:
        print("::error::XAI_API_KEY secret is not set")
        return 1
    try:
        live = json.loads(LIVE.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"::error::no live-data.json: {e}")
        return 1

    today = et_today().strftime("%Y-%m-%d")
    tomorrow = (et_today() + timedelta(days=1)).strftime("%Y-%m-%d")
    targets = [m for m in live.get("meetings", []) if m.get("iso") in (today, tomorrow) and m.get("link")]
    if not targets:
        print("No meetings today or tomorrow — nothing to investigate.")
        return 0

    try:
        pending = json.loads(PENDING.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        pending = {"items": []}
    have_urls = {it.get("url") for it in pending.get("items", [])}
    try:
        have_urls |= {s.get("url") for s in live.get("stories", [])}
    except Exception:  # noqa: BLE001
        pass

    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
    briefs, filed = [], 0
    for m in targets[:6]:
        label = "Tonight" if m.get("iso") == today else "Tomorrow"
        r = investigate(m, label)
        if not r:
            continue
        if r.get("skip"):
            print(f"skip {m.get('body')}: {r.get('why', '')[:80]}")
            continue
        if not (r.get("title") and r.get("dek")):
            continue
        url = m.get("link", "")
        briefs.append({"iso": m.get("iso"), "time": m.get("time", "TBD"), "meeting": m.get("body"),
                       "bullet": (r.get("brief") or r["title"])[:180], "link": url})
        if url in have_urls:
            print(f"already filed: {m.get('body')}")
            continue
        item = {
            "title": r["title"][:120], "dek": r["dek"][:400], "url": url,
            "source": f"{m.get('body', 'Meeting')} agenda", "region": r.get("region", "statewide"),
            "cat": "Meetings", "tag": "Agenda watch", "iso": now_iso,
            "kind": "agenda", "id": hashlib.sha1((url + m.get("iso", "")).encode()).hexdigest()[:12],
            "filed_at": now_iso, "accuracy": "document-based",
            "findings": r.get("findings", "")[:600],
        }
        pending.setdefault("items", []).insert(0, item)
        have_urls.add(url)
        filed += 1
        print(f"filed: {item['title'][:80]}")

    pending["items"] = pending["items"][:20]
    pending["updated_at"] = now_iso
    PENDING.write_text(json.dumps(pending, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    BRIEF.write_text(json.dumps({"generated_at": now_iso, "for_dates": [today, tomorrow],
                                 "items": briefs}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Agenda scout: {filed} stories filed to the desk, {len(briefs)} newsletter bullets")
    return 0


if __name__ == "__main__":
    sys.exit(main())
