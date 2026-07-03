# Repository Boundaries — Michigan Data Center Tracker

## This repo (`midatacentertracker/mi-data-center-tracker`)

Public static Michigan Data Center Tracker site.

**Belongs here:** public pages, map, stories/meetings views, methodology, sponsor pages, static geo/map data layers.

**Does not belong here:** private Desk pipeline internals, raw `mmt.db`, live `source_checks/`, secrets, Florida Signal production code, Google Drive live dependency.

**Consumes:** approved/exported outputs from Michigan Live Desk only.

---

## `midatacentertracker/mi-live-desk`

Private staging/editorial engine. See that repo's `README_STAGING_STATE.md`.

---

## Public Meeting Tracker

Future public calendar product (`publicmeetingtracker.com`). Separate from this site's static build.

---

## Florida Signal / WKAR / Pink Boat / client sites

Separate projects. Do not mix into this repo.