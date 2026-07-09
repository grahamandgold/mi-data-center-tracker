(function () {
  'use strict';

  var DATA = window.YOUR_VOICE_2026;
  var ZIP = window.YOUR_VOICE_ZIP;
  if (!DATA || !DATA.races) return;

  var root = document.getElementById('voice-candidates');
  var filterNote = document.getElementById('voice-filter-note');
  var lookupResult = document.getElementById('voice-lookup-result');
  var zipInput = document.getElementById('voice-zip');
  var lookupBtn = document.getElementById('voice-lookup-btn');
  var updatedEl = document.getElementById('voice-updated');

  if (updatedEl && DATA.updated) {
    updatedEl.textContent = 'Candidate records last reviewed ' + formatDate(DATA.updated);
  }

  var activeFilter = null;

  function formatDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatSourceDate(iso) {
    return formatDate(iso);
  }

  function initials(name) {
    return (name || '')
      .split(/\s+/)
      .map(function (p) {
        return p[0] || '';
      })
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function raceMatchesFilter(race, filter) {
    if (!filter) return true;
    if (race.scope === 'statewide') return true;
    if (race.scope === 'house' && filter.house && race.district === filter.house) return true;
    if (race.scope === 'senate' && filter.senate && race.district === filter.senate) return true;
    return false;
  }

  function renderCandidate(c) {
    var photoHtml = c.photo
      ? '<img class="voice-card-photo" src="' +
        escapeHtml(c.photo) +
        '" alt="" loading="lazy" width="96" height="112">'
      : '<div class="voice-card-photo voice-card-photo--initial" aria-hidden="true">' +
        escapeHtml(initials(c.name)) +
        '</div>';

    var stancesHtml = '';
    if (c.stances && c.stances.length) {
      stancesHtml = c.stances
        .map(function (s) {
          return (
            '<div class="voice-stance">' +
            '<div class="voice-stance-topic">' +
            escapeHtml(s.topic) +
            '</div>' +
            '<blockquote>“' +
            escapeHtml(s.quote) +
            '”</blockquote>' +
            '<cite>' +
            escapeHtml(s.source) +
            ' · ' +
            formatSourceDate(s.date) +
            (s.context ? ' · ' + escapeHtml(s.context) : '') +
            ' · <a href="' +
            escapeHtml(s.url) +
            '" target="_blank" rel="noopener noreferrer">Source ↗</a></cite>' +
            '</div>'
          );
        })
        .join('');
    } else if (c.noStatementNote) {
      stancesHtml =
        '<p class="voice-no-statement">' + escapeHtml(c.noStatementNote) + '</p>';
    }

    return (
      '<article class="voice-card" data-candidate="' +
      escapeHtml(c.id) +
      '">' +
      photoHtml +
      '<div class="voice-card-meta">' +
      '<h3>' +
      escapeHtml(c.name) +
      '</h3>' +
      '<p class="voice-card-role">' +
      escapeHtml(c.role) +
      '</p>' +
      '<span class="voice-party">' +
      escapeHtml(c.party) +
      '</span>' +
      stancesHtml +
      '</div></article>'
    );
  }

  function renderRaces(filter) {
    if (!root) return;
    var html = '';
    DATA.races.forEach(function (race) {
      if (!raceMatchesFilter(race, filter)) return;
      html +=
        '<section class="voice-race-block" id="race-' +
        escapeHtml(race.id) +
        '" data-race="' +
        escapeHtml(race.id) +
        '" data-house="' +
        escapeHtml(race.district || '') +
        '" data-scope="' +
        escapeHtml(race.scope) +
        '">' +
        '<div class="voice-race-head">' +
        '<span class="eyebrow">' +
        (race.scope === 'statewide' ? 'Statewide' : 'Your legislature') +
        '</span>' +
        '<h2>' +
        escapeHtml(race.title) +
        '</h2>' +
        '<p>' +
        escapeHtml(race.subtitle) +
        '</p></div>' +
        '<div class="voice-cards">' +
        race.candidates.map(renderCandidate).join('') +
        '</div></section>';
    });
    root.innerHTML = html || '<p class="voice-no-statement">No races match this ZIP. Statewide races are always listed when available.</p>';
  }

  function setFilter(filter, label) {
    activeFilter = filter;
    renderRaces(filter);
    if (filterNote) {
      if (filter && label) {
        filterNote.className = 'voice-filter-note is-active';
        filterNote.textContent =
          'Showing statewide races plus legislative districts for ' +
          label +
          (filter.house ? ' (House ' + filter.house + ')' : '') +
          (filter.senate ? ' · Senate ' + filter.senate : '') +
          '.';
      } else {
        filterNote.className = 'voice-filter-note';
        filterNote.textContent =
          'Enter a ZIP code to highlight your state House and Senate districts, or click a district on the map.';
      }
    }
  }

  function lookupZip(zip) {
    zip = String(zip || '')
      .replace(/\D/g, '')
      .slice(0, 5);
    if (zip.length !== 5) {
      if (lookupResult) lookupResult.textContent = 'Enter a valid 5-digit Michigan ZIP code.';
      setFilter(null);
      return;
    }
    var entry = (ZIP && ZIP[zip]) || (ZIP && ZIP.default) || {};
    var label = entry.label || 'Michigan';
    if (lookupResult) {
      lookupResult.innerHTML =
        '<strong>' +
        escapeHtml(zip) +
        '</strong> — ' +
        escapeHtml(label) +
        (entry.house
          ? ' · State House district <strong>' +
            escapeHtml(entry.house) +
            '</strong>'
          : '') +
        (entry.senate
          ? ' · State Senate district <strong>' +
            escapeHtml(entry.senate) +
            '</strong>'
          : '') +
        (entry.congress
          ? ' · U.S. House district <strong>MI-' +
            escapeHtml(entry.congress) +
            '</strong>'
          : '') +
        '.';
    }
    setFilter(
      { house: entry.house, senate: entry.senate, congress: entry.congress },
      label
    );
    highlightDistrictOnMap(entry.house, entry.senate);
    var first = document.querySelector(
      '[data-house="' + (entry.house || '') + '"], [data-race="us-senate"]'
    );
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var map;
  var districtLayers = [];
  var houseMarkers = [];

  function highlightDistrictOnMap(house, senate) {
    houseMarkers.forEach(function (m) {
      var d = m.options.district;
      var match =
        (house && m.options.scope === 'house' && d === house) ||
        (senate && m.options.scope === 'senate' && d === senate);
      m.setStyle({
        radius: match ? 12 : 8,
        fillColor: match ? '#E03131' : '#6f8fbf',
        fillOpacity: match ? 0.95 : 0.65,
        color: match ? '#fff' : '#1a1d24',
        weight: match ? 2 : 1
      });
    });
  }

  function scrollToRace(raceId, house, senate) {
    setFilter(
      house || senate ? { house: house, senate: senate } : null,
      null
    );
    if (house || senate) highlightDistrictOnMap(house, senate);
    var el = document.getElementById('race-' + raceId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var card = el && el.querySelector('.voice-card');
    if (card) {
      card.classList.add('is-highlight');
      setTimeout(function () {
        card.classList.remove('is-highlight');
      }, 2400);
    }
  }

  function initMap() {
    var el = document.getElementById('voice-map');
    if (!el || typeof L === 'undefined') return;

    map = L.map(el, { scrollWheelZoom: false, tap: true }).setView([42.45, -83.35], 8);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    fetch('geo/mi-counties.geojson')
      .then(function (r) {
        return r.json();
      })
      .then(function (geo) {
        L.geoJSON(geo, {
          style: {
            fillColor: '#1a2030',
            fillOpacity: 0.35,
            color: '#2e3648',
            weight: 1
          },
          onEachFeature: function (feat, layer) {
            var name = (feat.properties && (feat.properties.NAME || feat.properties.name)) || '';
            if (name) layer.bindTooltip(name, { sticky: true, className: 'voice-map-tip' });
          }
        }).addTo(map);
      })
      .catch(function () {});

    fetch('geo/mi-congressional-districts.geojson')
      .then(function (r) {
        return r.json();
      })
      .then(function (geo) {
        var layer = L.geoJSON(geo, {
          style: {
            fillColor: '#cf102d',
            fillOpacity: 0.06,
            color: '#cf102d',
            weight: 1.5,
            dashArray: '4 6'
          },
          onEachFeature: function (feat, l) {
            var label = feat.properties && feat.properties.label;
            l.bindTooltip(label || 'Congressional district', { sticky: true });
          }
        }).addTo(map);
        districtLayers.push(layer);
      })
      .catch(function () {});

    DATA.races.forEach(function (race) {
      if (!race.lat || !race.lng || race.scope === 'statewide') return;
      var marker = L.circleMarker([race.lat, race.lng], {
        radius: 8,
        fillColor: '#6f8fbf',
        fillOpacity: 0.75,
        color: '#0f1116',
        weight: 1,
        district: race.district,
        scope: race.scope,
        raceId: race.id
      })
        .addTo(map)
        .bindTooltip(race.title, { direction: 'top' });
      marker.on('click', function () {
        var h = race.scope === 'house' ? race.district : null;
        var s = race.scope === 'senate' ? race.district : null;
        scrollToRace(race.id, h, s);
      });
      houseMarkers.push(marker);
    });
  }

  if (lookupBtn) {
    lookupBtn.addEventListener('click', function () {
      lookupZip(zipInput ? zipInput.value : '');
    });
  }
  if (zipInput) {
    zipInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') lookupZip(zipInput.value);
    });
  }

  setFilter(null);
  initMap();

  var params = new URLSearchParams(window.location.search);
  var qZip = params.get('zip');
  if (qZip && zipInput) {
    zipInput.value = qZip;
    lookupZip(qZip);
  }
})();