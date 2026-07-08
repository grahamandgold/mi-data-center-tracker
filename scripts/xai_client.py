#!/usr/bin/env python3
"""Shared xAI helper — chat calls with automatic model discovery.

If the configured model has been retired (HTTP 404/410), we ask the API
which models exist and retry once with the newest grok chat model, so the
agents survive xAI model deprecations without human intervention.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

API = "https://api.x.ai/v1"


def _get(url: str, key: str) -> dict:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def discover_model(key: str) -> str | None:
    """Newest available grok text model (skips image/video/embedding models)."""
    try:
        models = _get(API + "/models", key).get("data", [])
    except Exception as e:  # noqa: BLE001
        print(f"::warning::model discovery failed: {e}")
        return None
    cands = [m for m in models
             if str(m.get("id", "")).startswith("grok")
             and not any(x in str(m.get("id", "")) for x in ("image", "video", "embed", "vision"))]
    if not cands:
        return None
    cands.sort(key=lambda m: (m.get("created", 0), str(m.get("id", ""))), reverse=True)
    picked = cands[0]["id"]
    print(f"model discovery: using '{picked}'")
    return picked


def chat(key: str, body: dict, timeout: int = 420) -> dict | None:
    """POST /chat/completions; on 404/410 retry once with a discovered model."""
    model_env = os.environ.get("XAI_MODEL", "")
    body = dict(body)
    body.setdefault("model", model_env or "grok-4")
    for attempt in (1, 2):
        req = urllib.request.Request(
            API + "/chat/completions", data=json.dumps(body).encode(),
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = e.read().decode()[:200]
            except Exception:  # noqa: BLE001
                pass
            print(f"::warning::xAI call failed ({e.code}) with model '{body['model']}': {detail}")
            if attempt == 1 and e.code in (400, 404, 410):
                found = discover_model(key)
                if found and found != body["model"]:
                    body["model"] = found
                    continue
            return None
        except Exception as e:  # noqa: BLE001
            print(f"::warning::xAI call failed: {e}")
            return None
    return None
