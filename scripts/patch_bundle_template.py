#!/usr/bin/env python3
"""Patch the homepage bundle template JSON in-place (preserves bundler encoding)."""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "/mi-data-center-tracker/"

LINK_REPLACEMENTS = [
    ("Homepage.dc.html", "index.html"),
    ("Live Map.dc.html", "map/"),
    ("Stories.dc.html", "stories.html"),
    ("Meetings.dc.html", "meetings.html"),
    ("Learn.dc.html", "learn.html"),
    ("Sponsor.dc.html", "sponsor.html"),
]


def extract_raw_template(html: str) -> tuple[str, str, str]:
    m = re.search(
        r'(<script type="__bundler/template">\s*\n)(.+?)(\n\s*</script>)',
        html,
        re.DOTALL,
    )
    if not m:
        raise ValueError("template block not found")
    return m.group(1), m.group(2).strip(), m.group(3)


def _escape_json_closing_tags(encoded: str) -> str:
    return re.sub(
        r"</([^>]+)>",
        lambda m: "<\\u002F" + m.group(1) + ">",
        encoded,
    )


def encode_like_bundler(template: str) -> str:
    """Match Claude bundler JSON: escape every closing HTML tag in the string."""
    return _escape_json_closing_tags(json.dumps(template, ensure_ascii=True))


def patch_decoded_template(tpl: str) -> str:
    from productionize_homepage import productionize_homepage

    tpl = productionize_homepage(tpl)
    for old, new in LINK_REPLACEMENTS:
        tpl = tpl.replace(old, new)
    return tpl


def patch_index_html(html: str) -> str:
    m = re.search(
        r'(<script type="__bundler/template">\s*\n)(.+?)(\n\s*</script>)',
        html,
        re.DOTALL,
    )
    if not m:
        raise ValueError("template block not found")
    template = patch_decoded_template(json.loads(m.group(2).strip()))
    encoded = encode_like_bundler(template)
    return html[: m.start()] + m.group(1) + encoded + m.group(3) + html[m.end() :]


def main() -> None:
    shell = subprocess.check_output(
        ["git", "-C", str(ROOT), "show", "c61b724:index.html"],
        text=True,
    )
    (ROOT / "index.html").write_text(patch_index_html(shell), encoding="utf-8")
    print("Patched index.html from c61b724 shell")


if __name__ == "__main__":
    main()