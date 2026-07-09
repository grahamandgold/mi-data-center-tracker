#!/usr/bin/env python3
"""prune_map — keep the Live Map free of stale meetings and past one-off events.

The map should only show live intelligence: standing infrastructure (projects,
plants, moratoria, transmission, policy) plus UPCOMING meetings. Past hearings
and one-off events (rallies, forums, protests) that have already happened are
noise and make the map look unmaintained.

This removes, from map-data.json:
  * meetings-layer points whose meeting date is in the past (before today ET),
  * any point that is a one-off EVENT (rally / protest / march / forum / town
    hall) whose date is in the past — regardless of layer (catches the
    "Michigan State Capitol rally" mis-filed under policy).

Everything else — data centers, power plants, moratoria, transmission lines,
standing policy records — is left untouched. Deterministic, stdlib only.
Runs daily via workflow and can be run by hand anytime.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAPD = ROOT / "map-data.json"

ET_OFFSET = timedelta(hours=-4)
EVENT_RE = re.compile(r"\b(rally|protest|march|forum|town hall|townhall|vigil|demonstration)\b", re.I)


def _today_et() -> str:
    return (datetime.now(timezone.utc) + ET_OFFSET).strftime("%Y-%m-%d")


def main() -> int:
    try:
        data = json.loads(MAPD.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"::error::cannot read map-data.json: {e}")
        return 1

    pts = data.get("map_points", [])
    today = _today_et()

    def event_date(p: dict) -> str:
        # meetings/events carry the event date in verified_date (or a date/iso field)
        return str(p.get("date") or p.get("iso") or p.get("verified_date") or "")[:10]

    kept, dropped = [], []
    for p in pts:
        layer = str(p.get("layer", "")).lower()
        name = str(p.get("name", ""))
        d = event_date(p)
        is_past = bool(re.match(r"\d{4}-\d{2}-\d{2}", d)) and d < today

        if layer == "meetings" and is_past:
            dropped.append((name, d, "past meeting"))
            continue
        if EVENT_RE.search(name) and is_past:
            dropped.append((name, d, "past one-off event"))
            continue
        kept.append(p)

    if not dropped:
        print(f"Map hygiene: nothing stale (checked {len(pts)} points, today={today}).")
        return 0

    data["map_points"] = kept
    data["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    MAPD.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Map hygiene: removed {len(dropped)} stale point(s), {len(kept)} remain:")
    for name, d, why in dropped:
        print(f"  - {name[:50]} ({d}) — {why}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
