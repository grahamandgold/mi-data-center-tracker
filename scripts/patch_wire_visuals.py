#!/usr/bin/env python3
"""patch_wire_visuals — put the Michigan night-lights aerial behind the wire
lead card and drop the decorative red ring. Operates on the bundle's embedded
template (index.html) and the .dc source, via targeted regex — no hand-editing
of the big generated file.

Idempotent: safe to run repeatedly.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import productionize_homepage as ph  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]

# New lead-card background: dark on the left (text stays crisp), city lights
# peeking through on the right. Overlay keeps WCAG-safe contrast on the headline.
NEW_BG = ("background:linear-gradient(105deg, rgba(16,20,15,.95) 0%, "
          "rgba(16,20,15,.85) 46%, rgba(16,20,15,.60) 100%), "
          "url('michigan-night-lights.jpg') right center/cover no-repeat;")

RING_RE = re.compile(r"\.wire-lead::after\s*\{[^}]*\}\s*")
BG_RE = re.compile(r"(\.wire-lead\s*\{[^}]*?)background:radial-gradient\(140% 130% at 0% 0%,\s*#201a15 0%,\s*#16140f 58%\);")


def transform(css_html: str) -> tuple[str, int]:
    changed = 0
    new, n = BG_RE.subn(lambda m: m.group(1) + NEW_BG, css_html)
    changed += n
    new, n = RING_RE.subn("", new)
    changed += n
    return new, changed


def patch_source() -> None:
    p = ROOT / "Homepage.dc.html"
    if not p.exists():
        return
    txt = p.read_text(encoding="utf-8")
    out, n = transform(txt)
    if n:
        p.write_text(out, encoding="utf-8")
    print(f"Homepage.dc.html: {n} change(s)")


def patch_bundle() -> None:
    p = ROOT / "index.html"
    raw = p.read_text(encoding="utf-8")
    template = ph.extract_template_from_bundle(raw)
    out, n = transform(template)
    if n:
        p.write_text(ph.inject_template_into_bundle(raw, out), encoding="utf-8")
    print(f"index.html bundle: {n} change(s)")


if __name__ == "__main__":
    patch_source()
    patch_bundle()
