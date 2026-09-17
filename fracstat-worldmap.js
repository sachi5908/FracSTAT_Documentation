window.FracSTATWorldMap = (function () {
    "use strict";

    const VIEW_WIDTH = 1000;
    const LAT_TOP = 84;
    const LAT_BOTTOM = -60;
    const DEFAULT_COLORS = ["#2f7d9e", "#2f9c85", "#57b96b", "#a8c94a", "#e0a63a", "#c2411d"];

    function mercatorY(lat) {
        const rad = lat * Math.PI / 180;
        return 0.5 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / (2 * Math.PI);
    }

    const Y_TOP = mercatorY(LAT_TOP);
    const Y_BOTTOM = mercatorY(LAT_BOTTOM);
    const VIEW_HEIGHT = Math.round(VIEW_WIDTH * (Y_BOTTOM - Y_TOP));

    function round2(value) {
        return Math.round(value * 100) / 100;
    }

    function project(lon, lat) {
        const x = ((lon + 180) / 360) * VIEW_WIDTH;
        const clamped = Math.max(LAT_BOTTOM, Math.min(LAT_TOP, lat));
        const y = ((mercatorY(clamped) - Y_TOP) / (Y_BOTTOM - Y_TOP)) * VIEW_HEIGHT;
        return [round2(x), round2(y)];
    }

    // One GeoJSON ring -> "M x y L x y ... Z"
    function ringPath(ring) {
        if (!Array.isArray(ring) || ring.length < 4) return "";
        let path = "";
        for (let i = 0; i < ring.length; i++) {
            const point = project(Number(ring[i][0]) || 0, Number(ring[i][1]) || 0);
            path += (i === 0 ? "M" : "L") + point[0] + " " + point[1] + " ";
        }
        return path + "Z";
    }

    // GeoJSON Polygon / MultiPolygon -> single path string
    function geometryPath(geometry) {
        if (!geometry) return "";
        const polygons = geometry.type === "Polygon"
            ? [geometry.coordinates]
            : (geometry.type === "MultiPolygon" ? geometry.coordinates : []);
        const parts = [];
        polygons.forEach(function (polygon) {
            (polygon || []).forEach(function (ring) {
                const path = ringPath(ring);
                if (path) parts.push(path);
            });
        });
        return parts.join(" ");
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString();
    }

    // ---------------------------------------------------------------------
    // Colour scale
    //
    // Six buckets spread geometrically over the largest observed count, so a
    // map with a single dominant country still shows contrast elsewhere.
    // ---------------------------------------------------------------------
    function buildScale(maxCount, colors) {
        const palette = (colors && colors.length ? colors : DEFAULT_COLORS).slice();
        const top = Math.max(2, Number(maxCount) || 0);
        const thresholds = [];
        for (let i = 1; i <= palette.length; i++) {
            const value = Math.max(1, Math.round(Math.pow(top, i / palette.length)));
            if (thresholds[thresholds.length - 1] !== value) thresholds.push(value);
        }
        return { thresholds: thresholds, colors: palette.slice(0, thresholds.length) };
    }

    function bucketIndex(count, thresholds) {
        for (let i = 0; i < thresholds.length; i++) {
            if (count <= thresholds[i]) return i;
        }
        return thresholds.length - 1;
    }

    function legendLabels(thresholds) {
        const labels = [];
        let previous = 0;
        thresholds.forEach(function (value) {
            labels.push(previous === 0 ? "1 – " + value : (previous + 1) + " – " + value);
            previous = value;
        });
        if (labels.length) labels[labels.length - 1] = labels[labels.length - 1].replace(/^\d+ – /, "> ");
        return labels;
    }


    const SVG_NS = "http://www.w3.org/2000/svg";

    function resolveElement(target) {
        if (!target) return null;
        if (typeof target === "string") return document.querySelector(target);
        return target.nodeType === 1 ? target : null;
    }

    // Accepts a full stats object from FracSTATStats.getStats(), a plain
    // { USA: 3, India: 12 } map, or nothing at all (reads the live stats).
    function normalizeData(input, stats) {
        if (input && Array.isArray(input.countries)) {
            const total = typeof input.total === "number"
                ? input.total
                : input.countries.reduce(function (sum, c) { return sum + (Number(c.count) || 0); }, 0);
            return { countries: input.countries, total: total, source: input };
        }

        if (input && typeof input === "object" && typeof input !== "function") {
            const countries = Object.keys(input).map(function (country) {
                return { country: country, count: Number(input[country]) || 0 };
            });
            return {
                countries: countries,
                total: countries.reduce(function (sum, c) { return sum + c.count; }, 0),
                source: null
            };
        }

        const data = stats.getStats();
        return { countries: data.countries, total: data.total, source: data };
    }

    function labelOf(stats, country) {
        return stats && typeof stats.label === "function" ? stats.label(country) : country;
    }

    function colorForCount(count, scale) {
        if (!count || !scale || !scale.thresholds.length) return "";
        return scale.colors[bucketIndex(count, scale.thresholds)] || "";
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
        });
    }

    // ---------------------------------------------------------------------
    // create() — the interactive map
    // ---------------------------------------------------------------------
    function create(target, options) {
        const opts = options || {};
        const stats = opts.stats || window.FracSTATStats;
        const host = resolveElement(target);

        if (!host) throw new Error("FracSTATWorldMap.create: container element not found.");
        if (!stats || typeof stats.loadGeoJSON !== "function" || typeof stats.getStats !== "function") {
            throw new Error("FracSTATWorldMap.create: load fracstat-stats.js before fracstat-worldmap.js.");
        }

        const palette = (opts.colors && opts.colors.length ? opts.colors : DEFAULT_COLORS).slice();
        const highlightListeners = [];
        const countMap = new Map();
        const entryMap = new Map();
        const pathsByCountry = new Map();
        let dataTotal = 0;
        let scale = { thresholds: [], colors: [] };
        let lastData = null;
        let destroyed = false;
        let unsubscribe = null;

        host.innerHTML = "";

        const wrapper = document.createElement("div");
        wrapper.className = "fs-map";

        const status = document.createElement("p");
        status.className = "fs-map-status";
        status.textContent = opts.loadingText || "Loading world map…";
        wrapper.appendChild(status);

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("class", "fs-map-svg");
        svg.setAttribute("viewBox", "0 0 " + VIEW_WIDTH + " " + VIEW_HEIGHT);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", "World map of FracSTAT downloads by country");
        svg.style.display = "none";
        wrapper.appendChild(svg);

        const legend = document.createElement("div");
        legend.className = "fs-map-legend";
        wrapper.appendChild(legend);

        const note = document.createElement("p");
        note.className = "fs-map-note";
        note.classList.add("is-hidden");
        wrapper.appendChild(note);

        const tooltip = document.createElement("div");
        tooltip.className = "fs-map-tooltip";
        tooltip.setAttribute("aria-hidden", "true");
        tooltip.style.display = "none";
        wrapper.appendChild(tooltip);

        host.appendChild(wrapper);

        // ---- Tooltip -------------------------------------------------------
        function placeTooltip(evt) {
            const box = wrapper.getBoundingClientRect();
            const x = Math.max(0, Math.min(box.width, evt.clientX - box.left));
            const y = Math.max(0, evt.clientY - box.top);
            tooltip.style.left = Math.round(x) + "px";
            tooltip.style.top = Math.round(y) + "px";
            // Keep the bubble inside the frame when hovering near the edges.
            const half = (tooltip.offsetWidth || 140) / 2;
            tooltip.classList.toggle("flip-left", x < half);
            tooltip.classList.toggle("flip-right", (box.width - x) < half);
        }

        function tooltipHtml(country, evt) {
            if (typeof opts.tooltipHtml === "function") {
                tooltip.innerHTML = opts.tooltipHtml(country, countMap.get(country) || 0, entryMap.get(country));
            } else {
                const count = countMap.get(country) || 0;
                const share = dataTotal ? Math.round((count / dataTotal) * 1000) / 10 : 0;
                tooltip.innerHTML = "<strong>" + escapeHtml(labelOf(stats, country)) + "</strong><span>" +
                    formatNumber(count) + (count === 1 ? " download" : " downloads") +
                    (count > 0 ? " • " + share + "% of total" : " • no downloads yet") + "</span>";
            }
            if (evt) placeTooltip(evt);
        }

        function hideTooltip() {
            tooltip.style.display = "none";
        }

        // ---- Hover / highlight --------------------------------------------
        function notifyHighlight(country, source) {
            highlightListeners.forEach(function (entry) {
                if (entry.source === source) return;
                try { entry.fn(country); } catch (err) { /* isolated listener */ }
            });
        }

        function setHighlight(country, source) {
            if (destroyed) return;
            pathsByCountry.forEach(function (path, key) {
                path.classList.toggle("is-active", !!country && key === country);
                path.classList.toggle("is-dim", !!country && key !== country);
            });
            notifyHighlight(country, source);
        }

        function clearHighlight(source) {
            pathsByCountry.forEach(function (path) {
                path.classList.remove("is-active", "is-dim");
            });
            notifyHighlight("", source);
        }

        // ---- Legend --------------------------------------------------------
        // Both parts are optional, and the public page uses the second one:
        //   showLegend: false         — no swatch row at all; the element itself
        //                               is hidden, so an empty flex row cannot
        //                               leave a stray gap under the map
        //   showLegendCaption: false  — the swatches stay, only the
        //                               "Registered downloads per country"
        //                               caption is dropped
        function renderLegend() {
            legend.innerHTML = "";

            if (opts.showLegend === false) {
                // The element itself has to go, not just its contents: as an
                // empty flex row it would still contribute its margin-top and
                // leave a gap under the map.
                legend.style.display = "none";
                return;
            }
            legend.style.display = "";

            const empty = document.createElement("span");
            empty.className = "fs-legend-item";
            empty.innerHTML = '<i class="fs-legend-swatch fs-swatch-empty"></i>0';
            legend.appendChild(empty);

            const labels = legendLabels(scale.thresholds);
            scale.colors.forEach(function (color, index) {
                const item = document.createElement("span");
                item.className = "fs-legend-item";
                item.innerHTML = '<i class="fs-legend-swatch" style="background:' + color + '"></i>' +
                    escapeHtml(labels[index] || "");
                legend.appendChild(item);
            });

            // Opt-out on its own, so the swatch row can sit centred without the
            // caption trailing it (index.html does exactly that).
            if (opts.showLegendCaption !== false) {
                const caption = document.createElement("span");
                caption.className = "fs-legend-caption";
                caption.textContent = opts.legendCaption || "Registered downloads per country";
                legend.appendChild(caption);
            }
        }

        function updateNote(unmatched) {
            const parts = [];
            if (unmatched.length) {
                parts.push(unmatched.length === 1
                    ? "1 country with downloads (" + labelOf(stats, unmatched[0]) +
                      ") has no outline on this basemap; it is still counted below."
                    : unmatched.length + " countries with downloads have no outline on this basemap; " +
                      "they are still counted in the table below.");
            }
            if (lastData && lastData.source && lastData.source.loadError) {
                parts.push("The published statistics file could not be read (" + lastData.source.loadError + ").");
            }
            note.textContent = parts.join(" ");
            note.classList.toggle("is-hidden", parts.length === 0);
        }

        // ---- render() ------------------------------------------------------
        function render(input) {
            if (destroyed) return null;

            const data = normalizeData(input, stats);
            lastData = data;
            countMap.clear();
            entryMap.clear();

            data.countries.forEach(function (entry) {
                const count = Number(entry.count) || 0;
                countMap.set(entry.country, count);
                entryMap.set(entry.country, entry);
            });

            dataTotal = Number(data.total) || 0;
            const maxCount = data.countries.reduce(function (max, entry) {
                return Math.max(max, Number(entry.count) || 0);
            }, 0);

            scale = buildScale(maxCount, palette);

            pathsByCountry.forEach(function (path, country) {
                const count = countMap.get(country) || 0;
                path.style.fill = colorForCount(count, scale);
                path.setAttribute("data-count", String(count));
                path.classList.toggle("has-data", count > 0);
            });

            // Countries with downloads that the basemap does not draw
            // (micro-states such as Monaco or Singapore are not in the 110m
            // outline file) — reported instead of silently dropped.
            const unmatched = [];
            countMap.forEach(function (count, country) {
                if (count > 0 && !pathsByCountry.has(country)) unmatched.push(country);
            });
            unmatched.sort(function (a, b) {
                return (countMap.get(b) || 0) - (countMap.get(a) || 0) || a.localeCompare(b);
            });

            svg.setAttribute("aria-label", "World map of FracSTAT downloads by country: " +
                formatNumber(dataTotal) + " downloads across " + data.countries.length + " countries.");

            renderLegend();
            updateNote(unmatched);
            refreshTooltip();

            if (typeof opts.onRender === "function") opts.onRender(data, api);
            return data;
        }

        // Keep a visible tooltip in step with freshly rendered data.
        function refreshTooltip() {
            if (tooltip.style.display === "none") return;
            const hovered = Array.from(pathsByCountry.entries())
                .find(function (pair) { return pair[1].classList.contains("is-active"); });
            if (hovered) tooltipHtml(hovered[0], null);
        }

        // ---- Geometry (built once, then only re-coloured) ------------------
        function buildGeometry(geojson) {
            const features = (geojson && geojson.features) || [];
            const group = document.createElementNS(SVG_NS, "g");
            group.setAttribute("class", "fs-map-countries");

            features.forEach(function (feature) {
                const name = (feature.properties && feature.properties.name) || "";
                if (!name) return;
                const pathData = geometryPath(feature.geometry);
                if (!pathData) return;

                const path = document.createElementNS(SVG_NS, "path");
                path.setAttribute("d", pathData);
                path.setAttribute("class", "fs-map-country");
                path.setAttribute("data-country", name);
                path.setAttribute("fill-rule", "evenodd");
                path.addEventListener("mouseenter", function (evt) {
                    setHighlight(name);
                    tooltip.style.display = "";
                    tooltipHtml(name, evt);
                });
                path.addEventListener("mousemove", function (evt) {
                    placeTooltip(evt);
                });
                path.addEventListener("mouseleave", function () {
                    clearHighlight();
                    hideTooltip();
                });
                if (typeof opts.onSelect === "function") {
                    path.addEventListener("click", function () {
                        opts.onSelect(name, entryMap.get(name) || null);
                    });
                }

                group.appendChild(path);
                pathsByCountry.set(name, path);
            });

            svg.appendChild(group);
            svg.style.display = "";
            status.style.display = "none";
            return pathsByCountry.size;
        }

        function fail(message) {
            status.className = "fs-map-status is-error";
            status.textContent = message;
            status.style.display = "";
            if (typeof opts.onError === "function") opts.onError(message);
        }

        // ---- Data loading --------------------------------------------------
        function loadOutlines() {
            return stats.loadGeoJSON().then(function (geojson) {
                if (destroyed) return 0;
                const drawn = buildGeometry(geojson);
                if (!drawn) {
                    fail("The country outline file contains no usable shapes.");
                    return 0;
                }
                return drawn;
            }, function (err) {
                if (!destroyed) fail("World map unavailable: " + (err && err.message ? err.message : "outlines could not be loaded") + ".");
                return 0;
            });
        }

        const api = {
            element: wrapper,
            svg: svg,
            status: status,
            legend: legend,
            paths: pathsByCountry,
            render: render,
            colorFor: function (count) { return colorForCount(count, scale); },
            setHighlight: setHighlight,
            clearHighlight: clearHighlight,
            highlightFromList: function (country) { setHighlight(country, "list"); },
            // Cross-highlight registration used by createRankList(); the token
            // keeps a list from re-highlighting itself in a loop.
            onHighlight: function (fn, source) {
                const entry = { fn: fn, source: source || fn };
                highlightListeners.push(entry);
                return function () {
                    const idx = highlightListeners.indexOf(entry);
                    if (idx !== -1) highlightListeners.splice(idx, 1);
                };
            },
            // Re-read the published JSON + queued submissions, then repaint.
            refresh: function (force) {
                return stats.load(force).then(function () {
                    if (destroyed) return null;
                    return render(stats.getStats());
                });
            },
            destroy: function () {
                if (destroyed) return;
                destroyed = true;
                if (unsubscribe) unsubscribe();
                wrapper.remove();
            }
        };

        // First paint: outlines, then the numbers. A registration recorded
        // later repaints the map through FracSTATStats.subscribe().
        loadOutlines().then(function () {
            if (destroyed) return;
            render(stats.getStats());
            if (opts.autoUpdate !== false) {
                unsubscribe = stats.subscribe(function () {
                    if (!destroyed) render(stats.getStats());
                });
            }
            if (typeof opts.onReady === "function") opts.onReady(api);
        });

        return api;
    }

    // ---------------------------------------------------------------------
    // createRankList() — the accessible, always-readable version of the map
    //
    // Same data, same colours, same hover: pointing at a row highlights the
    // country on the map and vice versa. Also the fallback for screen readers
    // and for the case where the outline file cannot be loaded.
    // ---------------------------------------------------------------------
    function createRankList(target, options) {
        const opts = options || {};
        const stats = opts.stats || window.FracSTATStats;
        const host = resolveElement(target);
        if (!host) throw new Error("FracSTATWorldMap.createRankList: container element not found.");

        const map = opts.map || null;
        const limit = Number(opts.limit) > 0
            ? Number(opts.limit)
            : Number((stats.config && stats.config.topCountriesShown) || 8);
        let expanded = false;
        let lastData = null;
        let destroyed = false;
        let unsubscribe = null;
        let rankUnsubscribe = null;

        host.innerHTML = "";
        const list = document.createElement("ol");
        list.className = "fs-rank-list";
        host.appendChild(list);

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "fs-rank-toggle";
        toggle.hidden = true;
        host.appendChild(toggle);

        toggle.addEventListener("click", function () {
            expanded = !expanded;
            render(lastData);
        });

        function render(input) {
            if (destroyed) return;
            const data = input && Array.isArray(input.countries) ? input : stats.getStats();
            lastData = data;

            const entries = data.countries.filter(function (entry) { return (Number(entry.count) || 0) > 0; });
            const total = data.total || entries.reduce(function (sum, e) { return sum + e.count; }, 0);
            const max = entries.reduce(function (top, e) { return Math.max(top, e.count); }, 0);
            const visible = expanded ? entries : entries.slice(0, limit);
            const rowScale = buildScale(max, opts.colors || DEFAULT_COLORS);

            list.innerHTML = "";

            if (!visible.length) {
                const empty = document.createElement("li");
                empty.className = "fs-rank-empty";
                empty.textContent = opts.emptyText || "No downloads registered yet — be the first!";
                list.appendChild(empty);
            }

            visible.forEach(function (entry, index) {
                const item = document.createElement("li");
                item.className = "fs-rank-item";
                item.setAttribute("data-country", entry.country);
                const share = total ? Math.round((entry.count / total) * 1000) / 10 : 0;
                const width = max ? Math.max(4, Math.round((entry.count / max) * 100)) : 0;
                const color = colorForCount(entry.count, rowScale) || DEFAULT_COLORS[1];

                item.innerHTML =
                    '<span class="fs-rank-pos">' + (index + 1) + '</span>' +
                    '<span class="fs-rank-name">' + escapeHtml(labelOf(stats, entry.country)) + '</span>' +
                    '<span class="fs-rank-bar"><i style="width:' + width + '%;background:' + color + '"></i></span>' +
                    '<span class="fs-rank-count">' + formatNumber(entry.count) +
                    '<em>' + share + '%</em></span>';

                item.addEventListener("mouseenter", function () {
                    item.classList.add("is-active");
                    if (map && map.highlightFromList) map.highlightFromList(entry.country);
                });
                item.addEventListener("mouseleave", function () {
                    item.classList.remove("is-active");
                    if (map && map.clearHighlight) map.clearHighlight("list");
                });
                if (typeof opts.onSelect === "function") {
                    item.addEventListener("click", function () { opts.onSelect(entry.country, entry); });
                }

                list.appendChild(item);
            });

            // Cross-highlight: hovering a country on the map lights up its row.
            if (map && map.onHighlight) {
                if (rankUnsubscribe) rankUnsubscribe();
                rankUnsubscribe = map.onHighlight(function (country) {
                    Array.prototype.forEach.call(list.children, function (child) {
                        child.classList.toggle("is-active",
                            !!country && child.getAttribute("data-country") === country);
                    });
                }, "list");
            }

            toggle.hidden = entries.length <= limit;
            toggle.textContent = expanded
                ? (opts.collapseLabel || "Show top " + limit)
                : (opts.expandLabel || "Show all " + entries.length + " countries");
        }

        render(stats.getStats());
        unsubscribe = stats.subscribe(function () { render(stats.getStats()); });

        return {
            element: list,
            render: render,
            destroy: function () {
                destroyed = true;
                if (unsubscribe) unsubscribe();
                if (rankUnsubscribe) rankUnsubscribe();
                host.innerHTML = "";
            }
        };
    }

    function formatDate(value) {
        if (!value) return "—";
        const time = Date.parse(value);
        if (isNaN(time)) return String(value);
        return new Date(time).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }

    // ---------------------------------------------------------------------
    // renderMeta() — the small "total / countries / last updated" chip row
    // shared by the public statistics section and the admin panel.
    // ---------------------------------------------------------------------
    function renderMeta(target, options) {
        const opts = options || {};
        const stats = opts.stats || window.FracSTATStats;
        const host = resolveElement(target);
        if (!host) throw new Error("FracSTATWorldMap.renderMeta: container element not found.");

        const items = document.createElement("div");
        items.className = "fs-stat-chips";
        host.innerHTML = "";
        host.appendChild(items);

        let unsubscribe = null;

        function render(input) {
            const data = input && Array.isArray(input.countries) ? input : stats.getStats();
            const chips = [
                { label: "Total downloads", value: formatNumber(data.total) },
                { label: "Countries reached", value: formatNumber(data.countryCount) },
                { label: "Institutions", value: formatNumber(data.institutionCount) },
                { label: "Last " + data.recentWindowDays + " days", value: formatNumber(data.recent) },
                { label: "Last updated", value: formatDate(data.lastUpdated) }
            ];
            if (data.pendingCount) {
                chips.push({ label: "Awaiting sync", value: formatNumber(data.pendingCount), note: true });
            }

            items.innerHTML = chips.map(function (chip) {
                return '<span class="fs-stat-chip' + (chip.note ? " is-note" : "") + '">' +
                    "<strong>" + chip.value + "</strong><em>" + chip.label + "</em></span>";
            }).join("");
        }

        render(stats.getStats());
        if (opts.autoUpdate !== false) {
            unsubscribe = stats.subscribe(function () { render(stats.getStats()); });
        }

        return {
            element: items,
            render: render,
            destroy: function () {
                if (unsubscribe) unsubscribe();
                host.innerHTML = "";
            }
        };
    }

    return {
        create: create,
        createRankList: createRankList,
        renderMeta: renderMeta,
        formatNumber: formatNumber,
        formatDate: formatDate,
        scaleFor: buildScale,
        colorForCount: colorForCount,
        colors: DEFAULT_COLORS.slice(),
        viewBox: "0 0 " + VIEW_WIDTH + " " + VIEW_HEIGHT,
        project: project
    };
}());
