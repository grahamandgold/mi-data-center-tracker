/* Michigan Data Center Tracker — map bootstrap */
(function () {
  const escAttr = v => String(v || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  function showBootError(msg) {
    const el = document.getElementById("panel-record-count");
    if (el) el.textContent = msg;
    console.error("[map]", msg);
  }

  async function loadMapData() {
    try {
      const res = await fetch("map-data.json?v=20260629e", { cache: "no-store" });
      if (!res.ok) throw new Error(`map-data.json HTTP ${res.status}`);
      const json = await res.json();
      if (!json.map_points?.length) throw new Error("map-data.json has no map_points");
      return json;
    } catch (err) {
      console.warn("[map] fetch failed, falling back to TRACKER_DATA", err);
      const fallback = window.TRACKER_DATA || {};
      if (fallback.map_points?.length) return fallback;
      throw err;
    }
  }

  async function initMap() {
    if (typeof L === "undefined") {
      showBootError("Map library failed to load");
      return;
    }

    let data;
    try {
      data = await loadMapData();
    } catch (err) {
      showBootError("Data failed to load");
      return;
    }

    const points = (data.map_points || []).filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    const layersMeta = data.map_layers || [];
    const stories = data.map_stories || [];
    const transmissionLines = data.transmission_lines || [];
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const esc = v => String(v || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
    const safeUrl = v => {
      try {
        const u = new URL(String(v || ""), location.href);
        return ["http:", "https:"].includes(u.protocol) ? esc(u.href) : "#";
      } catch {
        return "#";
      }
    };

    const LAYER_COLORS = Object.fromEntries(layersMeta.map(l => [l.id, l.color]));
    const LAYER_LABELS = Object.fromEntries(layersMeta.map(l => [l.id, l.label]));
    const STATUS_COLORS = {
      "Under construction": "#cf102d",
      "Proposed": "#3a7bd5",
      "Under review": "#5b9cf5",
      "Conditionally approved": "#f59e0b",
      "Approved": "#22a86a",
      "Operational": "#10b981",
      "Moratorium": "#e09820",
      "Utility pause": "#9c5fc9",
      "Rejected by planning commission": "#5a6070",
      "Withdrawn": "#374151",
      "Under appeal": "#6b7280",
      "Public meeting": "#5b9cf5",
      "Public signal": "#22a86a"
    };
    const pointColor = p => LAYER_COLORS[p.layer] || STATUS_COLORS[p.status] || "#cf102d";
    const layerLabel = p => LAYER_LABELS[p.layer] || p.layer || "Record";

    const REGION_COUNTIES = {
      metro_detroit: new Set(["Wayne","Oakland","Macomb","Washtenaw","Livingston","Monroe","Lenawee","St. Clair","Lapeer","Genesee","Hillsdale","Sanilac"]),
      west_michigan: new Set(["Kent","Ottawa","Allegan","Muskegon","Berrien","Cass","Van Buren","Kalamazoo","Barry","Ionia","Montcalm","Mecosta","Newaygo","Oceana","Mason","Lake","Manistee","Benzie","Leelanau"]),
      mid_michigan: new Set(["Ingham","Eaton","Clinton","Jackson","Calhoun","Branch","Shiawassee","Gratiot","Isabella","Clare","Midland","Bay","Saginaw","Tuscola","Huron"]),
      northern_michigan: new Set(["Grand Traverse","Antrim","Charlevoix","Emmet","Cheboygan","Presque Isle","Alpena","Alcona","Iosco","Ogemaw","Oscoda","Crawford","Kalkaska","Missaukee","Wexford","Osceola","Mackinac","Chippewa","Schoolcraft","Delta","Dickinson","Menominee","Marquette","Alger","Baraga","Houghton","Keweenaw","Ontonagon","Gogebic","Iron","Luce"])
    };
    const regionForCounty = county => {
      const c = String(county || "").replace(/ County$/i, "").trim();
      for (const [key, set] of Object.entries(REGION_COUNTIES)) {
        if (set.has(c)) return key;
      }
      return "statewide";
    };

    const params = new URLSearchParams(location.search);
    const initMode = params.get("mode") || "dark";
    const initRegion = params.get("region") || "all";
    const initFilters = params.get("f") ? new Set(params.get("f").split(",")) : null;
    const initLayersRaw = params.get("layers");
    const initLayers = initLayersRaw ? new Set(initLayersRaw.split(",").map(s => s.trim()).filter(Boolean)) : null;
    const initPoint = params.get("point") || "";
    const initStory = params.get("story") || "";

    const defaultLayers = new Set(layersMeta.filter(l => l.default_on !== false).map(l => l.id));
    if (!defaultLayers.size) ["projects","moratoria","meetings","transmission","policy"].forEach(id => defaultLayers.add(id));
    let activeLayers = initLayers?.size ? initLayers : new Set(defaultLayers);

    const darkTile = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, attribution: '&copy; OSM &copy; CARTO' });
    const dayTile = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19, attribution: '&copy; OSM &copy; CARTO' });
    const satTile = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: '&copy; Esri' });

    const map = L.map("map", { zoomControl: false, scrollWheelZoom: true }).setView([44.3, -85.2], 6);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    let currentMode = ["dark","day","sat"].includes(initMode) ? initMode : "dark";
    const setTileMode = mode => {
      [darkTile, dayTile, satTile].forEach(t => { try { map.removeLayer(t); } catch (_) {} });
      if (mode === "day") dayTile.addTo(map);
      else if (mode === "sat") satTile.addTo(map);
      else darkTile.addTo(map);
      currentMode = mode;
      $$(".tile-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    };
    setTileMode(currentMode);
    $$(".tile-btn").forEach(b => b.addEventListener("click", () => setTileMode(b.dataset.mode)));

    const boundaryLayer = L.geoJSON(null, { style: { color: "#cf102d", weight: 2, opacity: 0.55, fillColor: "#cf102d", fillOpacity: 0.04 }, interactive: false }).addTo(map);
    fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json")
      .then(r => r.json())
      .then(geo => { const mi = geo.features.find(f => f.properties?.name === "Michigan"); if (mi) boundaryLayer.addData(mi); })
      .catch(() => {});

    function makeIcon(color, active = false, layer = "projects") {
      const size = active ? 28 : 22;
      const shapes = {
        moratoria: `<rect x="5" y="3" width="14" height="14" rx="2" fill="${color}" stroke="#fff" stroke-width="1.5"/>`,
        meetings: `<circle cx="12" cy="10" r="7" fill="${color}" stroke="#fff" stroke-width="1.5"/>`,
        transmission: `<path d="M13 2L8 12h3.5l-1 10 7-12h-3.5L13 2z" fill="${color}" stroke="#fff" stroke-width="1.2"/>`,
        policy: `<polygon points="12,2 15,9 22,9 16.5,13.5 18.5,21 12,17 5.5,21 7.5,13.5 2,9 9,9" fill="${color}" stroke="#fff" stroke-width="1.2"/>`
      };
      const inner = shapes[layer] || `<path d="M12 2c-3.3 0-6 2.5-6 5.6 0 4.2 6 12.4 6 12.4s6-8.2 6-12.4C18 4.5 15.3 2 12 2z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="7.6" r="2.2" fill="#fff" fill-opacity=".9"/>`;
      return L.divIcon({ html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">${inner}</svg>`, className: active ? "map-pin map-pin--active" : "map-pin", iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -size/2] });
    }

    const dateLabel = value => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "";

    function makePopup(p) {
      const c = pointColor(p);
      const dateStr = p.verified_date ? dateLabel(p.verified_date) : "";
      return `<div class="map-popup"><div class="pop-header" style="--status:${c}"><span class="pop-status">${esc(layerLabel(p))} · ${esc(p.status)}</span><div class="pop-name">${esc(p.name)}</div><div class="pop-location">${esc(p.municipality)}, ${esc(p.county)} County</div></div><div class="pop-body">${p.developer ? `<div class="pop-row"><span class="pop-label">Developer</span><span class="pop-val">${esc(p.developer)}</span></div>` : ""}${p.power_mw ? `<div class="pop-row"><span class="pop-label">Scale</span><span class="pop-val">${esc(p.power_mw)} MW</span></div>` : ""}${dateStr ? `<div class="pop-row"><span class="pop-label">Verified</span><span class="pop-val">${dateStr}</span></div>` : ""}${p.note ? `<p class="pop-note">${esc(p.note)}</p>` : ""}</div><div class="pop-footer"><a class="pop-source" href="${safeUrl(p.source_url)}" target="_blank" rel="noopener">${esc(p.source_name || "Source")} ↗</a></div></div>`;
    }

    function makeLinePopup(line) {
      return `<div class="map-popup"><div class="pop-header" style="--status:#9c5fc9"><span class="pop-status">Power & grid · ${esc(line.status)}</span><div class="pop-name">${esc(line.name)}</div><div class="pop-location">${esc((line.counties||[]).join(", "))}</div></div><div class="pop-body"><div class="pop-row"><span class="pop-label">Operator</span><span class="pop-val">${esc(line.operator)}</span></div>${line.note ? `<p class="pop-note">${esc(line.note)}</p>` : ""}</div><div class="pop-footer"><a class="pop-source" href="${safeUrl(line.source_url)}" target="_blank" rel="noopener">${esc(line.source_name)} ↗</a></div></div>`;
    }

    const markerLayer = L.layerGroup().addTo(map);
    const transmissionGroup = L.layerGroup().addTo(map);
    const markerMap = new Map();
    const pointByName = new Map(points.map(p => [p.name, p]));
    let activeMarker = null, activePointName = null, activeRegion = initRegion;
    const filtersEl = $("#map-filters"), layersEl = $("#map-layers"), dirEl = $("#map-directory"), storiesEl = $("#map-stories");
    const statuses = [...new Set(points.map(p => p.status))].sort();

    points.forEach(p => {
      const marker = L.marker([p.latitude, p.longitude], { icon: makeIcon(pointColor(p), false, p.layer), title: p.name });
      marker.bindPopup(makePopup(p), { maxWidth: 320, className: "tracker-popup" });
      marker.on("click", () => selectPoint(p.name, false));
      markerMap.set(p.name, marker);
    });

    transmissionLines.forEach(line => {
      if (!line.coordinates?.length) return;
      const isAlt = String(line.id).includes("route-b");
      const poly = L.polyline(line.coordinates, { color: isAlt ? "#c084fc" : "#9c5fc9", weight: isAlt ? 3 : 4, opacity: isAlt ? 0.55 : 0.85, dashArray: isAlt ? "10 8" : null });
      poly.bindPopup(makeLinePopup(line), { maxWidth: 340 });
      transmissionGroup.addLayer(poly);
    });

    function pointVisible(p) {
      const layerOk = activeLayers.has(p.layer || "projects");
      const regionOk = activeRegion === "all" || regionForCounty(p.county) === activeRegion;
      const statusInp = filtersEl?.querySelector(`input[value="${escAttr(p.status)}"]`);
      const statusOk = !statusInp || statusInp.checked;
      return layerOk && regionOk && statusOk;
    }

    function refreshMarkers() {
      markerLayer.clearLayers();
      const visible = points.filter(pointVisible);
      visible.forEach(p => markerLayer.addLayer(markerMap.get(p.name)));
      const countEl = $("#panel-record-count");
      if (countEl) countEl.textContent = `${visible.length} of ${points.length} records shown`;
      if (dirEl) {
        dirEl.innerHTML = [...visible].sort((a,b) => a.municipality.localeCompare(b.municipality)).map(p =>
          `<button type="button" data-point="${esc(p.name)}"><span class="dir-dot" style="background:${pointColor(p)}"></span><strong>${esc(p.name)}</strong><small>${esc(p.municipality)} · ${esc(p.status)}</small></button>`
        ).join("");
      }
      if (activeLayers.has("transmission")) map.addLayer(transmissionGroup);
      else map.removeLayer(transmissionGroup);
    }

    function fitAll() {
      const latlngs = [];
      points.filter(pointVisible).forEach(p => latlngs.push([p.latitude, p.longitude]));
      if (activeLayers.has("transmission")) transmissionLines.forEach(l => (l.coordinates||[]).forEach(c => latlngs.push(c)));
      if (latlngs.length) map.fitBounds(latlngs, { padding: [50, 50], maxZoom: 8 });
    }

    if (layersEl && layersMeta.length) {
      layersEl.innerHTML = layersMeta.map(l => {
        const n = points.filter(p => p.layer === l.id).length;
        const on = activeLayers.has(l.id);
        return `<label class="layer-toggle ${on ? "" : "off"}"><input type="checkbox" value="${esc(l.id)}" ${on ? "checked" : ""}><span class="layer-swatch" style="background:${l.color}"></span><span class="layer-copy"><span class="layer-name">${esc(l.label)}</span><span class="layer-desc">${esc(l.description)}</span></span><span class="layer-count">${n}</span></label>`;
      }).join("");
      layersEl.addEventListener("change", e => {
        if (!e.target.matches("input")) return;
        if (e.target.checked) activeLayers.add(e.target.value); else activeLayers.delete(e.target.value);
        e.target.closest("label")?.classList.toggle("off", !e.target.checked);
        refreshMarkers();
        fitAll();
      });
    }

    if (filtersEl) {
      filtersEl.innerHTML = statuses.map(s => {
        const checked = !initFilters || initFilters.has(s);
        return `<label class="${checked ? "" : "off"}"><input type="checkbox" value="${esc(s)}" ${checked ? "checked" : ""}><span class="filter-dot" style="background:${STATUS_COLORS[s]||"#cf102d"}"></span><span class="filter-name">${esc(s)}</span><span class="filter-count">${points.filter(p=>p.status===s).length}</span></label>`;
      }).join("");
      filtersEl.addEventListener("change", () => { refreshMarkers(); fitAll(); });
    }

    if (storiesEl && stories.length) {
      storiesEl.innerHTML = stories.map(s => `<button type="button" class="story-card" data-story="${esc(s.id)}"><span class="story-kicker">${esc(s.kicker)}</span><strong>${esc(s.title)}</strong><small>${esc(s.region)}</small></button>`).join("");
      storiesEl.addEventListener("click", e => { const btn = e.target.closest("[data-story]"); if (btn) openStory(btn.dataset.story); });
    }

    function openStory(id) {
      const story = stories.find(s => s.id === id);
      if (!story) return;
      const panel = $("#story-detail");
      if (panel) { panel.hidden = false; panel.innerHTML = `<div class="story-detail-kicker">${esc(story.kicker)}</div><h3>${esc(story.title)}</h3><p>${esc(story.summary)}</p><div class="story-detail-actions"><a href="${safeUrl(story.source_url)}" target="_blank" rel="noopener">${esc(story.source_name)} ↗</a></div>`; }
      if (story.fly_to) map.flyTo([story.fly_to.lat, story.fly_to.lng], story.fly_to.zoom || 8, { duration: 0.8 });
    }

    function selectPoint(name, fly = true) {
      const marker = markerMap.get(name), p = pointByName.get(name);
      if (!marker || !p) return;
      if (activeMarker && activePointName) { const prev = pointByName.get(activePointName); if (prev) activeMarker.setIcon(makeIcon(pointColor(prev), false, prev.layer)); }
      activeMarker = marker; activePointName = name;
      marker.setIcon(makeIcon(pointColor(p), true, p.layer));
      if (fly) { map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 10), { duration: 0.6 }); setTimeout(() => marker.openPopup(), 500); }
    }

    $("#show-all")?.addEventListener("click", () => {
      activeRegion = "all";
      activeLayers = new Set(layersMeta.map(l => l.id));
      $$("#map-filters input").forEach(i => { i.checked = true; i.closest("label")?.classList.remove("off"); });
      $$("#map-layers input").forEach(i => { i.checked = true; i.closest("label")?.classList.remove("off"); });
      $$(".region-chip").forEach(c => c.classList.toggle("active", c.dataset.region === "all"));
      refreshMarkers(); fitAll();
    });

    $$(".region-chip").forEach(chip => {
      chip.classList.toggle("active", chip.dataset.region === activeRegion);
      chip.addEventListener("click", () => { activeRegion = chip.dataset.region; $$(".region-chip").forEach(c => c.classList.toggle("active", c.dataset.region === activeRegion)); refreshMarkers(); fitAll(); });
    });

    dirEl?.addEventListener("click", e => { const btn = e.target.closest("button[data-point]"); if (btn) selectPoint(btn.dataset.point); });

    const searchEl = $("#map-search"), searchResults = $("#search-results");
    if (searchEl && searchResults) {
      searchEl.addEventListener("input", () => {
        const q = searchEl.value.trim().toLowerCase();
        if (q.length < 2) { searchResults.hidden = true; searchResults.innerHTML = ""; return; }
        const matches = points.filter(p => pointVisible(p) && [p.name,p.municipality,p.county,p.developer||""].some(v => v.toLowerCase().includes(q))).slice(0, 10);
        searchResults.hidden = !matches.length;
        searchResults.innerHTML = matches.map(p => `<button type="button" data-point="${esc(p.name)}"><span class="dir-dot" style="background:${pointColor(p)}"></span><span><strong>${esc(p.name)}</strong><small>${esc(p.municipality)}</small></span></button>`).join("");
      });
      searchResults.addEventListener("click", e => { const btn = e.target.closest("button[data-point]"); if (btn) { selectPoint(btn.dataset.point); searchEl.value = ""; searchResults.hidden = true; } });
    }

    const updEl = $("#map-updated");
    if (updEl && data.updated_at) updEl.textContent = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Detroit" }).format(new Date(data.updated_at));

    const ext = data.map_meta?.external_map;
    if (ext) { const link = $("#external-map-link"); if (link) { link.href = ext.url; link.textContent = ext.label; link.hidden = false; } }

    refreshMarkers();
    if (!initStory && !initPoint) fitAll();
    if (initStory) openStory(initStory);
    else if (initPoint && markerMap.has(initPoint)) selectPoint(initPoint);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initMap().catch(e => showBootError("Map init error")));
  else initMap().catch(e => showBootError("Map init error"));
})();