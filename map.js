(() => {
  const data = window.TRACKER_DATA || {};
  const points = (data.map_points || []).filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
  const esc = v => String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const safeUrl = v => { try{const u=new URL(String(v||""),location.href);return["http:","https:"].includes(u.protocol)?esc(u.href):"#";}catch{return"#";} };

  // ── Status colors ──
  const colors = {
    "Under construction":             "#cf102d",
    "Proposed":                       "#3a7bd5",
    "Under review":                   "#5b9cf5",
    "Conditionally approved":         "#f59e0b",
    "Approved":                       "#22a86a",
    "Operational":                    "#10b981",
    "Moratorium":                     "#e09820",
    "Utility pause":                  "#9c5fc9",
    "Rejected by planning commission":"#5a6070",
    "Withdrawn":                      "#374151",
    "Under appeal":                   "#6b7280"
  };
  const fallback = "#cf102d";
  const col = s => colors[s] || fallback;

  // ── Tile layers ──
  const darkTile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '© <a href="https://openstreetmap.org/copyright" style="color:#4e5468">OpenStreetMap</a>'
  });
  const satTile = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18,
    attribution: '© <a href="https://www.esri.com" style="color:#4e5468">Esri</a>'
  });

  // ── Read URL state ──
  const params = new URLSearchParams(location.search);
  const initLat = parseFloat(params.get("lat")) || 44.55;
  const initLng = parseFloat(params.get("lng")) || -85.45;
  const initZoom = parseInt(params.get("z")) || 6;
  const initSat = params.get("sat") === "1";
  const initFilters = params.get("f") ? new Set(params.get("f").split(",")) : null;

  // ── Map init ──
  const map = L.map("map", {
    zoomControl: false,
    scrollWheelZoom: false,
    attributionControl: true
  }).setView([initLat, initLng], initZoom);

  (initSat ? satTile : darkTile).addTo(map);
  let currentTile = initSat ? satTile : darkTile;
  let isSat = initSat;

  L.control.zoom({ position: "bottomright" }).addTo(map);

  // Dark tile filter via CSS class
  if (!initSat) document.getElementById("map").classList.add("dark-tiles");

  // ── Update permalink ──
  function updatePermalink() {
    const c = map.getCenter();
    const p = new URLSearchParams();
    p.set("lat", c.lat.toFixed(4));
    p.set("lng", c.lng.toFixed(4));
    p.set("z", map.getZoom());
    if (isSat) p.set("sat", "1");
    const activeFilters = [...filtersEl.querySelectorAll("input:checked")].map(i => i.value);
    if (activeFilters.length !== statuses.length) p.set("f", activeFilters.join(","));
    history.replaceState(null, "", "?" + p.toString());
  }
  map.on("moveend zoomend", updatePermalink);

  // ── Custom glowing marker ──
  function makeIcon(color, isCluster = false) {
    const size = isCluster ? 44 : 36;
    const core = isCluster ? 12 : 5;
    const ring1 = isCluster ? 18 : 8;
    const ring2 = isCluster ? 26 : 14;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${ring2}" fill="${color}" fill-opacity=".10"/>
      <circle cx="${size/2}" cy="${size/2}" r="${ring1}" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width=".8" stroke-opacity=".5"/>
      <circle cx="${size/2}" cy="${size/2}" r="${core}" fill="${color}" stroke="#fff" stroke-width="1.5"
        style="filter:drop-shadow(0 0 5px ${color})"/>
      <circle cx="${size/2-1.5}" cy="${size/2-1.5}" r="1.2" fill="#fff" fill-opacity=".9"/>
    </svg>`;
    return L.divIcon({ html: svg, className:"", iconSize:[size,size], iconAnchor:[size/2,size/2], popupAnchor:[0,-size/2] });
  }

  // ── Popup ──
  function makePopup(p) {
    const c = col(p.status);
    const dateStr = p.last_action_date
      ? new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(p.last_action_date+"T12:00:00"))
      : (p.verified_date
        ? new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(p.verified_date+"T12:00:00"))
        : "");
    return `<div class="map-popup">
      <div class="pop-header" style="--c:${c}">
        <span class="pop-status">${esc(p.status)}${p.confidence?` · ${esc(p.confidence)}`:""}</span>
        <div class="pop-name">${esc(p.name)}</div>
        <div class="pop-location">${esc(p.municipality)}, ${esc(p.county)} County</div>
      </div>
      <div class="pop-body">
        ${p.developer?`<div class="pop-row"><span class="pop-label">Developer</span><span class="pop-val">${esc(p.developer)}</span></div>`:""}
        ${p.power_mw?`<div class="pop-row"><span class="pop-label">Scale</span><span class="pop-val">${esc(p.power_mw)} MW</span></div>`:""}
        ${p.acres?`<div class="pop-row"><span class="pop-label">Acreage</span><span class="pop-val">${esc(p.acres)} acres</span></div>`:""}
        ${p.water_gpd?`<div class="pop-row"><span class="pop-label">Water use</span><span class="pop-val">${esc(p.water_gpd)} gal/day</span></div>`:""}
        ${p.tax_abatement?`<div class="pop-row"><span class="pop-label">Abatement</span><span class="pop-val">${esc(p.tax_abatement)}</span></div>`:""}
        ${dateStr?`<div class="pop-row"><span class="pop-label">Last action</span><span class="pop-val">${dateStr}</span></div>`:""}
        ${p.note?`<p class="pop-note">${esc(p.note)}</p>`:""}
      </div>
      <div class="pop-footer">
        <a class="pop-source" href="${safeUrl(p.source_url)}" target="_blank" rel="noopener">${esc(p.source_name||"Source")}</a>
        <button class="pop-share" onclick="navigator.share&&navigator.share({title:'${esc(p.name)}',url:location.href});return false;">Share ↗</button>
      </div>
    </div>`;
  }

  // ── Layers + markers ──
  const layers = new Map();
  const markerMap = new Map();
  const statuses = [...new Set(points.map(p => p.status))];
  statuses.forEach(s => layers.set(s, L.layerGroup().addTo(map)));

  points.forEach(p => {
    const marker = L.marker([p.latitude, p.longitude], {
      icon: makeIcon(col(p.status)), title: p.name
    }).bindPopup(makePopup(p), { maxWidth:320, className:"intel-popup" });
    layers.get(p.status).addTo(map);
    marker.addTo(layers.get(p.status));
    markerMap.set(p.name, marker);
  });

  // ── Filters ──
  const filtersEl = document.querySelector("#map-filters");
  filtersEl.innerHTML = statuses.map(s => {
    const c = col(s), n = points.filter(p => p.status===s).length;
    const checked = !initFilters || initFilters.has(s);
    return `<label data-status="${esc(s)}" class="${checked?"":"off"}">
      <input type="checkbox" value="${esc(s)}" ${checked?"checked":""}>
      <span class="filter-dot" style="background:${c};box-shadow:0 0 7px ${c};"></span>
      <span class="filter-name">${esc(s)}</span>
      <span class="filter-count">${n}</span>
    </label>`;
  }).join("");

  // Apply initial filter state from URL
  if (initFilters) {
    statuses.forEach(s => {
      if (!initFilters.has(s)) map.removeLayer(layers.get(s));
    });
  }

  filtersEl.addEventListener("change", e => {
    if (!e.target.matches("input")) return;
    const label = e.target.closest("label");
    const layer = layers.get(e.target.value);
    if (e.target.checked) { layer.addTo(map); label.classList.remove("off"); }
    else { map.removeLayer(layer); label.classList.add("off"); }
    updatePermalink();
  });

  document.querySelector("#show-all").addEventListener("click", () => {
    filtersEl.querySelectorAll("input").forEach(inp => {
      inp.checked = true;
      inp.closest("label").classList.remove("off");
      layers.get(inp.value).addTo(map);
    });
    updatePermalink();
  });

  // ── Search ──
  const searchEl = document.querySelector("#map-search");
  const searchResults = document.querySelector("#search-results");
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      const q = searchEl.value.trim().toLowerCase();
      if (!q || q.length < 2) { searchResults.innerHTML=""; searchResults.hidden=true; return; }
      const matches = points.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.municipality.toLowerCase().includes(q) ||
        p.county.toLowerCase().includes(q) ||
        (p.developer||"").toLowerCase().includes(q)
      ).slice(0,8);
      searchResults.hidden = matches.length === 0;
      searchResults.innerHTML = matches.map(p =>
        `<button type="button" data-point="${esc(p.name)}">
          <span class="dir-dot" style="background:${col(p.status)};box-shadow:0 0 5px ${col(p.status)};"></span>
          <span><strong>${esc(p.name)}</strong><small>${esc(p.municipality)} · ${esc(p.status)}</small></span>
        </button>`
      ).join("");
    });
    searchResults.addEventListener("click", e => {
      const btn = e.target.closest("button[data-point]");
      if (!btn) return;
      flyToPoint(btn.dataset.point);
      searchEl.value = "";
      searchResults.innerHTML = "";
      searchResults.hidden = true;
    });
  }

  function flyToPoint(name) {
    const marker = markerMap.get(name);
    if (!marker) return;
    const p = points.find(pt => pt.name === name);
    if (p) {
      const inp = [...filtersEl.querySelectorAll("input")].find(i => i.value === p.status);
      if (inp && !inp.checked) { inp.checked = true; inp.closest("label").classList.remove("off"); layers.get(p.status).addTo(map); }
    }
    map.flyTo(marker.getLatLng(), 11, { animate:true, duration:0.8 });
    setTimeout(() => marker.openPopup(), 900);
    const sidebar = document.querySelector("#map-sidebar");
    if (sidebar && window.innerWidth <= 768) sidebar.classList.remove("open");
    updatePermalink();
  }

  // ── Directory ──
  const dirEl = document.querySelector("#map-directory");
  dirEl.innerHTML = [...points].sort((a,b)=>a.name.localeCompare(b.name)).map(p =>
    `<button type="button" data-point="${esc(p.name)}">
      <span class="dir-dot" style="background:${col(p.status)};box-shadow:0 0 6px ${col(p.status)};"></span>
      <strong>${esc(p.name)}</strong>
      <small>${esc(p.municipality)} · ${esc(p.status)}</small>
    </button>`
  ).join("");
  dirEl.addEventListener("click", e => {
    const btn = e.target.closest("button[data-point]");
    if (btn) flyToPoint(btn.dataset.point);
  });

  // ── Satellite toggle ──
  const satBtn = document.querySelector("#sat-toggle");
  if (satBtn) {
    satBtn.textContent = isSat ? "Dark map" : "Satellite";
    satBtn.addEventListener("click", () => {
      if (isSat) {
        map.removeLayer(satTile); darkTile.addTo(map); currentTile = darkTile;
        document.getElementById("map").classList.add("dark-tiles");
        satBtn.textContent = "Satellite";
      } else {
        map.removeLayer(darkTile); satTile.addTo(map); currentTile = satTile;
        document.getElementById("map").classList.remove("dark-tiles");
        satBtn.textContent = "Dark map";
      }
      isSat = !isSat;
      updatePermalink();
    });
  }

  // ── Copy link button ──
  const linkBtn = document.querySelector("#copy-link");
  if (linkBtn) {
    linkBtn.addEventListener("click", () => {
      updatePermalink();
      navigator.clipboard.writeText(location.href).then(() => {
        linkBtn.textContent = "Copied!";
        setTimeout(() => linkBtn.textContent = "Copy link", 2000);
      });
    });
  }

  // ── Legend ──
  const legendEl = document.querySelector("#hud-legend");
  if (legendEl) {
    legendEl.innerHTML = `<div class="legend-title">Status</div>` +
      statuses.map(s => `<div class="legend-row">
        <span class="legend-swatch" style="background:${col(s)};color:${col(s)};box-shadow:0 0 6px ${col(s)};"></span>${esc(s)}
      </div>`).join("");
  }

  // ── HUD stats ──
  const countEl = document.querySelector("#hud-record-count");
  if (countEl) countEl.textContent = `${points.length} records`;
  const updEl = document.querySelector("#map-updated");
  if (updEl && data.updated_at) {
    updEl.textContent = `Updated ${new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",timeZone:"America/Detroit"}).format(new Date(data.updated_at))}`;
  }

  // ── Mobile sidebar toggle ──
  const toggleBtn = document.querySelector("#sidebar-toggle");
  const sidebar = document.querySelector("#map-sidebar");
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      const open = sidebar.classList.toggle("open");
      toggleBtn.setAttribute("aria-expanded", String(open));
      toggleBtn.textContent = open ? "Close ✕" : "Filter & Directory ↑";
    });
  }

  // initial permalink write
  updatePermalink();
})();
