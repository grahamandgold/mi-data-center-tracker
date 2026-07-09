#!/usr/bin/env python3
"""patch_map_welcome — turn the map's full-screen intro takeover (which reads
like an ad) into a compact, non-blocking corner helper. Idempotent.

Changes to the map bundle template:
  * .welcome        full-screen blocking scrim -> bottom-left, no scrim, the
                    map stays visible and usable behind it.
  * .welcome-card   560px hero -> 340px quiet helper card.
  * .welcome-title  38px display -> 19px "How to use this map" helper tone.
  * copy            drop "permit" (we don't track permits); shorten the sub;
                    "Explore the map →" CTA -> "Got it".
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import productionize_homepage as ph  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / "map" / "index.html"

REPLACEMENTS = [
    # non-blocking corner placement, no scrim, map interactive around it
    (re.compile(r"\.welcome \{[^}]*\}"),
     ".welcome { position: absolute; inset: auto auto 22px 22px; z-index: 1200; "
     "display: block; padding: 0; background: none; pointer-events: none; }"),
    # compact quiet helper card (re-enable pointer events on the card itself)
    (re.compile(r"\.welcome-card \{[^}]*\}"),
     ".welcome-card { width: min(340px, calc(100vw - 44px)); pointer-events: auto; "
     "border: 1px solid #2f2a24; border-radius: 0; background: linear-gradient(168deg, "
     "rgba(26,23,17,.97), rgba(17,15,11,.98)); box-shadow: 0 18px 44px rgba(0,0,0,.5); }"),
    # helper-tone title
    (re.compile(r"\.welcome-title \{[^}]*\}"),
     ".welcome-title { font-family: 'Saira Condensed', sans-serif; font-weight: 700; "
     "font-size: 19px; line-height: 1.05; letter-spacing: .02em; text-transform: uppercase; "
     "color: #f6f3f0; margin-bottom: 8px; }"),
    (re.compile(r"\.welcome-inner \{[^}]*\}"),
     ".welcome-inner { padding: 18px 18px 16px; }"),
    # copy
    ("EXPLORE MICHIGAN'S DATA CENTER BUILDOUT", "How to use this map"),
    ("Every tracked facility, permit, and local moratorium — mapped from public records. "
     "Filter it, dig into a site, find what's near you, and take the data with you.",
     "A quick tour: search near you, filter by status, toggle grid & water layers, "
     "and export the data. Close this anytime."),
    ("Live map · Updated real-time", "Quick guide"),
    (">Explore the map →<", ">Got it<"),
]


def apply(text: str) -> tuple[str, int]:
    n = 0
    for pat, repl in REPLACEMENTS:
        if hasattr(pat, "sub"):
            text, c = pat.subn(repl, text)
        else:
            c = text.count(pat)
            text = text.replace(pat, repl)
        n += c
    return text, n


def main() -> int:
    raw = MAP.read_text(encoding="utf-8")
    template = ph.extract_template_from_bundle(raw)
    out, n = apply(template)
    if not n:
        print("Map welcome: nothing to change (already patched?).")
        return 0
    MAP.write_text(ph.inject_template_into_bundle(raw, out), encoding="utf-8")
    print(f"Map welcome: {n} change(s) applied — now a compact corner helper.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
