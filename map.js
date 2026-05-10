/* ============================================
   Today in History — Map Panel (Phase 2)
   LeafletJS spatial context for historical events
   ============================================ */

var TodayMap = (function () {
    'use strict';

    var map = null;
    var markersLayer = null;
    var mapContainer = null;
    var toggleBtn = null;
    var isVisible = false;

    // ---- Initialize Map DOM ----
    function createMapPanel() {
        var section = document.getElementById('timeline-section');
        if (!section) return;

        // Build the map panel
        var panel = document.createElement('div');
        panel.id = 'map-panel';
        panel.className = 'map-panel';

        // Header with toggle
        var header = document.createElement('div');
        header.className = 'map-panel-header';

        var title = document.createElement('h2');
        title.className = 'map-panel-title';
        title.textContent = 'Spatial Context';

        toggleBtn = document.createElement('button');
        toggleBtn.id = 'map-toggle-btn';
        toggleBtn.className = 'map-toggle-btn';
        toggleBtn.textContent = 'Show Map';
        toggleBtn.setAttribute('aria-label', 'Toggle map visibility');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.addEventListener('click', toggleMap);

        header.appendChild(title);
        header.appendChild(toggleBtn);
        panel.appendChild(header);

        // Map container
        mapContainer = document.createElement('div');
        mapContainer.id = 'map-container';
        mapContainer.className = 'map-container';
        panel.appendChild(mapContainer);

        // Insert before the timeline section
        section.parentNode.insertBefore(panel, section);
    }

    // ---- Initialize Leaflet ----
    function initLeaflet() {
        if (map) return;

        map = L.map('map-container', {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView([20, 0], 2);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 18
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);
    }

    // ---- Toggle Map Visibility ----
    function toggleMap() {
        var panel = document.getElementById('map-panel');
        if (!panel) return;

        isVisible = !isVisible;
        panel.classList.toggle('map-expanded', isVisible);
        toggleBtn.textContent = isVisible ? 'Hide Map' : 'Show Map';
        toggleBtn.setAttribute('aria-expanded', String(isVisible));

        if (isVisible && !map) {
            initLeaflet();
        }

        // Leaflet needs a resize nudge after container becomes visible
        if (isVisible && map) {
            setTimeout(function () {
                map.invalidateSize();
            }, 300);
        }
    }

    // ---- Extract Coordinates from API Data ----
    function extractCoordinates(data) {
        var results = [];
        var categories = ['selected', 'births', 'deaths', 'events', 'holidays'];

        categories.forEach(function (cat) {
            var items = data[cat];
            if (!items || !Array.isArray(items)) return;

            items.forEach(function (event) {
                if (!event.pages) return;
                event.pages.forEach(function (page) {
                    if (page.coordinates && page.coordinates.lat != null && page.coordinates.lon != null) {
                        results.push({
                            lat: page.coordinates.lat,
                            lon: page.coordinates.lon,
                            year: event.year,
                            text: event.text || '',
                            pageTitle: page.titles ? page.titles.normalized : (page.title || '')
                        });
                    }
                });
            });
        });

        // Deduplicate by lat/lon (rounded to 3 decimals)
        var seen = {};
        return results.filter(function (r) {
            var key = r.lat.toFixed(3) + ',' + r.lon.toFixed(3);
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
    }

    // ---- Update Map with New Data ----
    function update(data) {
        var panel = document.getElementById('map-panel');
        if (!panel) return;

        var coords = extractCoordinates(data);

        if (coords.length === 0) {
            // Hide entire panel when no coordinates available
            panel.style.display = 'none';
            return;
        }

        // Show panel (header always visible, map hidden until toggled)
        panel.style.display = '';

        // Update the marker count in the button
        toggleBtn.textContent = isVisible
            ? 'Hide Map'
            : 'Show Map (' + coords.length + ')';

        if (!map || !markersLayer) return;

        // Clear existing markers
        markersLayer.clearLayers();

        var bounds = [];

        coords.forEach(function (c) {
            var yearLabel = c.year != null ? Math.abs(c.year) + (c.year < 0 ? ' BCE' : ' CE') : '';
            var popupContent = document.createElement('div');
            popupContent.className = 'map-popup';

            var yearEl = document.createElement('strong');
            yearEl.textContent = yearLabel;
            popupContent.appendChild(yearEl);

            if (c.text) {
                var textEl = document.createElement('p');
                textEl.textContent = c.text.length > 120 ? c.text.substring(0, 120) + '...' : c.text;
                popupContent.appendChild(textEl);
            }

            var marker = L.marker([c.lat, c.lon]);
            marker.bindPopup(popupContent, { maxWidth: 280 });
            markersLayer.addLayer(marker);
            bounds.push([c.lat, c.lon]);
        });

        // Fit map to show all markers
        if (bounds.length > 0 && isVisible) {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 });
        }
    }

    // ---- Public API ----
    return {
        init: createMapPanel,
        update: update
    };
})();
