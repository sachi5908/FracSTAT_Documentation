window.FRACSTAT_CONFIG = {
    preRegistrationOnly: true,
    downloadUrl: "",
    downloadFileName: "FracSTAT_v1.0.0.zip",
    downloadVersion: "v1.0.0",
    dataUrl: "data/fracstat_downloads.json",
    geojsonUrl: "data/world-countries.geojson",
    geojsonVersion: "2",
    geojsonFallbackUrls: [
        "https://cdn.jsdelivr.net/gh/sachi5908/FracSTAT_Documentation@main/data/world-countries.geojson"
    ],
    geojsonGlobal: "FRACSTAT_WORLD_GEOJSON",
    backendUrl: "https://script.google.com/macros/s/AKfycbyArbNm0VEwzkgO6YDJIyMJjB9iwRy-kdD6ArlzqoDKdJw9QDE0tMFgr7PBzIvCw6wj/exec",
    backendRecordAction: "recordDownload",
    backendStatsAction: "downloadStats",
    autoDetectCountry: true,
    geoIpEndpoint: "https://ipapi.co/json/",

    positions: [
        "Student",
        "Researcher",
        "Professor",
        "Industry Professional",
        "Government / Survey Organisation",
        "Other"
    ],
    requireInstitution: true,

    // ---- Statistics ------------------------------------------------------
    recentWindowDays: 30,
    useSampleData: false,
    topCountriesShown: 8,
    topInstitutionsShown: 8,

    // ---- Local storage keys ---------------------------------------------
    storageKeys: {
        pending: "fracstat_pending_downloads",
        cache: "fracstat_stats_cache"
    }
};

(function () {
    "use strict";

    const CONFIG = window.FRACSTAT_CONFIG;
    const SCHEMA_VERSION = 1;
    const ISO_TO_COUNTRY = {
        "AE": "United Arab Emirates", "AF": "Afghanistan", "AL": "Albania",
        "AM": "Armenia", "AO": "Angola", "AQ": "Antarctica",
        "AR": "Argentina", "AT": "Austria", "AU": "Australia",
        "AZ": "Azerbaijan", "BA": "Bosnia and Herzegovina", "BD": "Bangladesh",
        "BE": "Belgium", "BF": "Burkina Faso", "BG": "Bulgaria",
        "BI": "Burundi", "BJ": "Benin", "BN": "Brunei",
        "BO": "Bolivia", "BR": "Brazil", "BS": "The Bahamas",
        "BT": "Bhutan", "BW": "Botswana", "BY": "Belarus",
        "BZ": "Belize", "CA": "Canada", "CD": "Democratic Republic of the Congo",
        "CF": "Central African Republic", "CG": "Republic of the Congo", "CH": "Switzerland",
        "CI": "Ivory Coast", "CL": "Chile", "CM": "Cameroon",
        "CN": "China", "CO": "Colombia", "CR": "Costa Rica",
        "CU": "Cuba", "CY": "Cyprus", "CY-X": "Northern Cyprus",
        "CZ": "Czech Republic", "DE": "Germany", "DJ": "Djibouti",
        "DK": "Denmark", "DO": "Dominican Republic", "DZ": "Algeria",
        "EC": "Ecuador", "EE": "Estonia", "EG": "Egypt",
        "EH": "Western Sahara", "ER": "Eritrea", "ES": "Spain",
        "ET": "Ethiopia", "FI": "Finland", "FJ": "Fiji",
        "FK": "Falkland Islands", "FR": "France", "GA": "Gabon",
        "GB": "England", "GE": "Georgia", "GH": "Ghana",
        "GL": "Greenland", "GM": "Gambia", "GN": "Guinea",
        "GQ": "Equatorial Guinea", "GR": "Greece", "GT": "Guatemala",
        "GW": "Guinea Bissau", "GY": "Guyana", "HN": "Honduras",
        "HR": "Croatia", "HT": "Haiti", "HU": "Hungary",
        "ID": "Indonesia", "IE": "Ireland", "IL": "Israel",
        "IN": "India", "IQ": "Iraq", "IR": "Iran",
        "IS": "Iceland", "IT": "Italy", "JM": "Jamaica",
        "JO": "Jordan", "JP": "Japan", "KE": "Kenya",
        "KG": "Kyrgyzstan", "KH": "Cambodia", "KP": "North Korea",
        "KR": "South Korea", "KW": "Kuwait", "KZ": "Kazakhstan",
        "LA": "Laos", "LB": "Lebanon", "LK": "Sri Lanka",
        "LR": "Liberia", "LS": "Lesotho", "LT": "Lithuania",
        "LU": "Luxembourg", "LV": "Latvia", "LY": "Libya",
        "MA": "Morocco", "MD": "Moldova", "ME": "Montenegro",
        "MG": "Madagascar", "MK": "Macedonia", "ML": "Mali",
        "MM": "Myanmar", "MN": "Mongolia", "MR": "Mauritania",
        "MW": "Malawi", "MX": "Mexico", "MY": "Malaysia",
        "MZ": "Mozambique", "NA": "Namibia", "NC": "New Caledonia",
        "NE": "Niger", "NG": "Nigeria", "NI": "Nicaragua",
        "NL": "Netherlands", "NO": "Norway", "NP": "Nepal",
        "NZ": "New Zealand", "OM": "Oman", "PA": "Panama",
        "PE": "Peru", "PG": "Papua New Guinea", "PH": "Philippines",
        "PK": "Pakistan", "PL": "Poland", "PR": "Puerto Rico",
        "PS": "West Bank", "PT": "Portugal", "PY": "Paraguay",
        "QA": "Qatar", "RO": "Romania", "RS": "Republic of Serbia",
        "RU": "Russia", "RW": "Rwanda", "SA": "Saudi Arabia",
        "SB": "Solomon Islands", "SD": "Sudan", "SE": "Sweden",
        "SI": "Slovenia", "SK": "Slovakia", "SL": "Sierra Leone",
        "SN": "Senegal", "SO": "Somalia", "SO-X": "Somaliland",
        "SR": "Suriname", "SS": "South Sudan", "SV": "El Salvador",
        "SY": "Syria", "SZ": "Swaziland", "TD": "Chad",
        "TF": "French Southern and Antarctic Lands", "TG": "Togo", "TH": "Thailand",
        "TJ": "Tajikistan", "TL": "East Timor", "TM": "Turkmenistan",
        "TN": "Tunisia", "TR": "Turkey", "TT": "Trinidad and Tobago",
        "TW": "Taiwan", "TZ": "United Republic of Tanzania", "UA": "Ukraine",
        "UG": "Uganda", "US": "USA", "UY": "Uruguay",
        "UZ": "Uzbekistan", "VE": "Venezuela", "VN": "Vietnam",
        "VU": "Vanuatu", "XK": "Kosovo", "YE": "Yemen",
        "ZA": "South Africa", "ZM": "Zambia", "ZW": "Zimbabwe"
    };

    const DISPLAY_NAMES = {
        "USA": "United States",
        "England": "United Kingdom",
        "Republic of Serbia": "Serbia",
        "Czech Republic": "Czechia",
        "Macedonia": "North Macedonia",
        "Swaziland": "Eswatini",
        "The Bahamas": "Bahamas",
        "United Republic of Tanzania": "Tanzania",
        "Guinea Bissau": "Guinea-Bissau",
        "East Timor": "Timor-Leste",
        "Ivory Coast": "Côte d'Ivoire",
        "West Bank": "Palestine",
        "French Southern and Antarctic Lands": "French Southern Territories"
    };

    const NAME_ALIASES = {
        "united states of america": "USA",
        "united states": "USA",
        "usa": "USA",
        "united kingdom": "England",
        "uk": "England",
        "great britain": "England",
        "scotland": "England",
        "wales": "England",
        "northern ireland": "England",
        "russian federation": "Russia",
        "korea": "South Korea",
        "republic of korea": "South Korea",
        "korea south": "South Korea",
        "korea north": "North Korea",
        "czechia": "Czech Republic",
        "turkiye": "Turkey",
        "viet nam": "Vietnam",
        "syrian arab republic": "Syria",
        "lao pdr": "Laos",
        "brunei darussalam": "Brunei",
        "hong kong": "China",
        "macao": "China",
        "serbia": "Republic of Serbia",
        "north macedonia": "Macedonia",
        "eswatini": "Swaziland",
        "timor leste": "East Timor",
        "cote divoire": "Ivory Coast",
        "cote d ivoire": "Ivory Coast",
        "ivory coast": "Ivory Coast",
        "palestine": "West Bank",
        "the gambia": "Gambia",
        "burma": "Myanmar",
        "republic of moldova": "Moldova",
        "dem rep congo": "Democratic Republic of the Congo",
        "congo kinshasa": "Democratic Republic of the Congo",
        "congo brazzaville": "Republic of the Congo",
        "uae": "United Arab Emirates"
    };

    // ---------------------------------------------------------------------
    // Small helpers
    // ---------------------------------------------------------------------
    function normalizeKey(value) {
        return String(value == null ? "" : value)
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function createId() {
        return "dl-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    }

    function withCacheBust(url) {
        return url + (url.indexOf("?") === -1 ? "?" : "&") + "_cb=" + Date.now();
    }

    let countryNames = [];      // resolved from the outline file
    let countryNameIndex = {};  // normalizeKey(name) -> name

    // Human-readable country name for tables, tooltips and the select.
    function label(country) {
        if (!country || country === "Unknown") return "Unknown";
        return DISPLAY_NAMES[country] || country;
    }

    // Map any country spelling/ISO code onto the outline-file name.
    function resolveCountry(value) {
        if (value == null) return null;
        const raw = String(value).trim();
        if (!raw) return null;
        const upper = raw.toUpperCase();
        if (ISO_TO_COUNTRY[upper]) return ISO_TO_COUNTRY[upper];
        const key = normalizeKey(raw);
        if (NAME_ALIASES[key]) return NAME_ALIASES[key];
        if (countryNameIndex[key]) return countryNameIndex[key];
        return null;
    }

    // ---------------------------------------------------------------------
    // Country outlines (shared with fracstat-worldmap.js)
    //
    // The outlines normally arrive as a plain <script> — data/world-countries.js
    // sets window.FRACSTAT_WORLD_GEOJSON — which index.html and admin.html
    // include before these modules. That is deliberate: a page opened straight
    // from disk (file://) cannot fetch a sibling JSON file at all, and the old
    // CDN fallback that covered for it drew the de-facto India boundary. The
    // fetch below now only serves pages that omit the script tag.
    // ---------------------------------------------------------------------
    let geoPromise = null;

    function inlineOutlines() {
        const data = window[CONFIG.geojsonGlobal || "FRACSTAT_WORLD_GEOJSON"];
        if (data && Array.isArray(data.features) && data.features.length) return data;
        return null;
    }

    function adoptOutlines(data) {
        countryNames = data.features
            .map(f => (f.properties && f.properties.name) || "")
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
        countryNameIndex = {};
        countryNames.forEach(function (name) { countryNameIndex[normalizeKey(name)] = name; });
        return data;
    }

    function loadGeoJSON() {
        if (geoPromise) return geoPromise;

        const inline = inlineOutlines();
        if (inline) {
            geoPromise = Promise.resolve(adoptOutlines(inline));
            return geoPromise;
        }

        const version = CONFIG.geojsonVersion ? String(CONFIG.geojsonVersion) : "";
        const sources = [CONFIG.geojsonUrl].concat(CONFIG.geojsonFallbackUrls || [])
            .filter(Boolean)
            .map(function (url) {
                if (!version) return url;
                return url + (url.indexOf("?") === -1 ? "?" : "&") + "v=" + encodeURIComponent(version);
            });

        geoPromise = (async function () {
            for (const url of sources) {
                try {
                    // "default", not "force-cache": the version in the URL above
                    // is what keeps the outlines fresh, so a stale cached entry
                    // can never be pinned here and outlive a boundary change.
                    const res = await fetch(url, { cache: "default" });
                    if (!res.ok) continue;
                    const data = await res.json();
                    const features = (data && data.features) || [];
                    if (!features.length) continue;

                    return adoptOutlines(data);
                } catch (err) {
                    // Try the next source; the failure propagates if none work.
                }
            }
            throw new Error("Country outline data could not be loaded.");
        }());

        return geoPromise;
    }

    // Sorted, display-ready country list for the registration form's select.
    function loadCountryNames() {
        return loadGeoJSON().then(function () {
            return countryNames.map(function (name) { return { value: name, label: label(name) }; });
        });
    }

    // ---------------------------------------------------------------------
    // The JSON store
    //
    // data/fracstat_downloads.json (written by admin.html) is the published
    // snapshot. Submissions that have not reached a backend yet are kept in
    // localStorage and merged into every read, so a visitor sees their own
    // upload immediately even without a server.
    // ---------------------------------------------------------------------
    function emptyStore() {
        return {
            schemaVersion: SCHEMA_VERSION,
            updatedAt: null,
            sample: false,
            download: {
                url: CONFIG.downloadUrl || "",
                version: CONFIG.downloadVersion || "",
                fileName: CONFIG.downloadFileName || ""
            },
            countryBaseline: {},
            countryOverrides: {},
            institutionRegistry: [],
            records: []
        };
    }

    function pickNumberMap(value) {
        const out = {};
        if (!value || typeof value !== "object") return out;
        Object.keys(value).forEach(function (key) {
            const num = Number(value[key]);
            if (isFinite(num) && num > 0) out[String(key)] = Math.round(num);
        });
        return out;
    }

    function normalizeRegistryEntry(entry) {
        entry = entry || {};
        const rawCountry = String(entry.country || "").trim();
        return {
            name: String(entry.name || "").trim(),
            country: resolveCountry(rawCountry) || rawCountry,
            type: String(entry.type || "").trim(),
            city: String(entry.city || "").trim(),
            website: String(entry.website || "").trim(),
            baseline: Number(entry.baseline) > 0 ? Math.round(Number(entry.baseline)) : 0,
            notes: String(entry.notes || "").trim()
        };
    }

    function normalizeRecordShape(record) {
        if (!record || typeof record !== "object") return null;
        return {
            id: String(record.id || createId()),
            receivedAt: record.receivedAt || new Date().toISOString(),
            name: String(record.name || "").trim(),
            email: String(record.email || "").trim(),
            institution: String(record.institution || "").trim(),
            position: String(record.position || "").trim(),
            country: String(record.country || "Unknown").trim() || "Unknown",
            countrySource: record.countrySource || "unknown",
            countryRaw: String(record.countryRaw || "").trim(),
            version: String(record.version || "").trim(),
            page: String(record.page || "").trim(),
            referrer: String(record.referrer || "").trim(),
            pending: !!record.pending
        };
    }

    function normalizeStore(raw) {
        const store = emptyStore();
        if (!raw || typeof raw !== "object") return store;

        store.schemaVersion = raw.schemaVersion || SCHEMA_VERSION;
        store.updatedAt = raw.updatedAt || null;
        store.sample = !!raw.sample;
        if (raw.download && typeof raw.download === "object") {
            store.download = Object.assign({}, store.download, raw.download);
        }
        store.countryBaseline = pickNumberMap(raw.countryBaseline);
        store.countryOverrides = pickNumberMap(raw.countryOverrides);
        store.institutionRegistry = Array.isArray(raw.institutionRegistry)
            ? raw.institutionRegistry.map(normalizeRegistryEntry).filter(e => e.name)
            : [];
        store.records = Array.isArray(raw.records)
            ? raw.records.map(normalizeRecordShape).filter(Boolean)
            : [];
        return store;
    }

    // ---- Submissions that have not reached a backend yet -----------------
    function readPending() {
        try {
            const raw = window.localStorage.getItem(CONFIG.storageKeys.pending);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list.map(normalizeRecordShape).filter(Boolean) : [];
        } catch (err) {
            return [];   // private browsing / disabled storage
        }
    }

    function writePending(list) {
        try {
            window.localStorage.setItem(CONFIG.storageKeys.pending, JSON.stringify(list));
        } catch (err) {
            // Storage unavailable: the record is still reported to the caller.
        }
    }

    function pendingRecords() {
        return readPending().map(function (rec) {
            return Object.assign({}, rec, { pending: true });
        });
    }

    function clearPending() {
        writePending([]);
        notify();
    }

    // ---- Loading ---------------------------------------------------------
    let storeCache = null;
    let lastLoadError = "";
    let usingSample = false;
    const listeners = new Set();

    // Re-render hook used by the map and the admin panel so both stay in sync
    // after a new registration.
    function subscribe(fn) {
        listeners.add(fn);
        return function () { listeners.delete(fn); };
    }

    function notify() {
        listeners.forEach(function (fn) {
            try { fn(); } catch (err) { /* one broken listener must not stop the rest */ }
        });
    }

    function sampleEnabled() {
        if (CONFIG.useSampleData) return true;
        try {
            return new URLSearchParams(window.location.search).get("statsdemo") === "1";
        } catch (err) {
            return false;
        }
    }

    // ---- Backend (Google Apps Script web app) ----------------------------
    // One public endpoint: no token, no second feed. The admin panel reads the
    // exact same numbers a visitor reads, and the names stay in the sheet.
    function backendReadUrl() {
        return CONFIG.backendUrl +
            (CONFIG.backendUrl.indexOf("?") === -1 ? "?" : "&") +
            "action=" + encodeURIComponent(CONFIG.backendStatsAction);
    }

    // One read of the statistics web app. "answered" means the script itself
    // replied — even a refusal is an answer, so only a request that never got
    // there is worth repeating.
    async function readBackendOnce() {
        try {
            const res = await fetch(backendReadUrl(), { cache: "no-store" });
            if (!res.ok) return { payload: null, answered: false };
            const data = await res.json();
            if (data && data.success === false) return { payload: null, answered: true };
            const payload = (data && (data.store || data.data)) || data;
            if (!payload || typeof payload !== "object") return { payload: null, answered: true };
            return { payload: normalizeStore(payload), answered: true };
        } catch (err) {
            return { payload: null, answered: false };
        }
    }

    async function fetchBackendStore() {
        let result = await readBackendOnce();
        if (!result.payload && !result.answered) {
            // Apps Script's edge occasionally answers a request with a 404 that
            // never reaches the script, and a cold start can take several
            // seconds. One repeat is worth it before the bundled snapshot is
            // used instead.
            await new Promise(function (resolve) { setTimeout(resolve, 1200); });
            result = await readBackendOnce();
        }
        return result.payload;
    }

    // ---- Settling this browser's queue against the sheet ------------------
    // A submission is queued in localStorage before it is POSTed, and removed
    // again only once the answer arrives. When the row lands but the answer does
    // not — Apps Script's edge answering with an HTML 404 that never reaches the
    // script, a reload interrupting the request, a blocked redirect — the SAME
    // registration is in the sheet *and* still in the queue. Counting both is
    // what made the map read higher than the sheet's own rows, and because the
    // queue lives in localStorage the phantom copy survived every refresh.
    //
    // So after a read that answered, every queued entry is settled against it:
    //
    //   * already in the snapshot in hand -> forget it, nothing to send
    //   * otherwise re-send it            -> the script matches Record ID first,
    //                                        so this appends the row that never
    //                                        arrived or answers duplicate:true
    //   * refused / unreachable           -> keep it queued for the next load
    //
    // The Record ID is the whole reason re-sending is safe: dlHandleRecordDownload_
    // scans every row of the sheet for it, not only the recent window, so a
    // registration that has already aged out of the feed is still recognised.
    // One queued entry therefore always means one row, however often it is sent.
    const PENDING_SYNC_LIMIT = 5;

    let pendingSyncPromise = null;

    function queuedEntryKnown(store, entry) {
        const records = (store && Array.isArray(store.records)) ? store.records : [];
        return records.some(function (rec) { return !!rec && rec.id === entry.id; });
    }

    async function settleQueue(queued, source) {
        const settled = [];
        let sent = 0;
        let confirmed = false;

        for (const entry of queued) {
            if (queuedEntryKnown(source, entry)) { settled.push(entry.id); continue; }
            // A cold Apps Script answer costs seconds and every POST re-writes
            // the sheet, so a long queue is drained a few entries per load
            // instead of in one burst.
            if (sent >= PENDING_SYNC_LIMIT) break;
            sent++;

            let answer;
            try {
                answer = await postRecord(entry);
            } catch (err) {
                answer = { ok: false };      // stays queued, tried again next load
            }
            if (answer.ok) {
                settled.push(entry.id);
                // Only an entry the script just accepted changes what the feed
                // reports, and that is the one worth re-reading for.
                if (!answer.duplicate) confirmed = true;
            }
        }

        if (!settled.length) return 0;

        const drop = new Set(settled);
        writePending(readPending().filter(function (rec) { return !drop.has(rec.id); }));
        // Repaint: the map, the chips and the admin tables were showing the
        // queued copy of a registration the sheet already counts.
        notify();

        if (confirmed) {
            // The row is in the sheet but the snapshot in hand predates it, so
            // read once more — otherwise the number would dip for the second
            // between dropping the queued copy and the next read.
            load(true).catch(function () { /* the previous snapshot stays */ });
        }

        return settled.length;
    }

    // Queued registrations this browser has not been able to hand over yet.
    // Returns how many were settled (forget about the number otherwise).
    function syncPending(store) {
        if (pendingSyncPromise) return pendingSyncPromise;
        if (!CONFIG.backendUrl) return Promise.resolve(0);

        const queued = readPending();
        if (!queued.length) return Promise.resolve(0);

        const source = store || getStore();
        pendingSyncPromise = settleQueue(queued, source).then(function (count) {
            pendingSyncPromise = null;
            return count;
        });
        return pendingSyncPromise;
    }

    async function load(force) {
        if (storeCache && !force) return storeCache;

        lastLoadError = "";
        usingSample = false;

        if (CONFIG.backendUrl) {
            const remote = await fetchBackendStore();
            if (remote) {
                storeCache = remote;
                notify();
                // The sheet has just answered, so this is the moment to settle
                // this browser's queue against it — in the background, so the
                // first paint never waits on a second round trip.
                syncPending(remote).catch(function () { /* the queue keeps its entries */ });
                return storeCache;
            }
        }

        if (sampleEnabled()) {
            usingSample = true;
            storeCache = normalizeStore(SAMPLE_STORE);
            notify();
            return storeCache;
        }

        try {
            const res = await fetch(withCacheBust(CONFIG.dataUrl), { cache: "no-store" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            storeCache = normalizeStore(await res.json());
        } catch (err) {
            lastLoadError = err.message;
            storeCache = emptyStore();
        }

        notify();
        return storeCache;
    }

    function getStore() {
        return storeCache || emptyStore();
    }

    // ---- Aggregation -----------------------------------------------------
    // Published records plus everything still queued in this browser.
    function mergeRecords(store) {
        const published = store.records.slice();
        const seen = new Set(published.map(r => r.id));
        const queued = readPending()
            .filter(r => !seen.has(r.id))
            .map(r => Object.assign({}, r, { pending: true }));
        return queued.concat(published);
    }

    function laterDate(a, b) {
        if (!a) return b;
        if (!b) return a;
        return Date.parse(a) >= Date.parse(b) ? a : b;
    }

    function getStats(store) {
        const source = store || getStore();
        const records = mergeRecords(source);
        const now = Date.now();
        const windowMs = Math.max(1, Number(CONFIG.recentWindowDays) || 30) * 86400000;

        const countryAgg = new Map();
        const institutionAgg = new Map();
        const positionAgg = new Map();
        const unresolvedAgg = new Map();
        let recent = 0;

        function countryEntry(country) {
            if (!countryAgg.has(country)) {
                countryAgg.set(country, { country: country, records: 0, last: null });
            }
            return countryAgg.get(country);
        }

        function institutionEntry(name, country) {
            const key = normalizeKey(name);
            if (!institutionAgg.has(key)) {
                institutionAgg.set(key, {
                    key: key, name: name, country: country || "Unknown",
                    records: 0, last: null, positions: new Set()
                });
            }
            const entry = institutionAgg.get(key);
            if (country && entry.country === "Unknown") entry.country = country;
            return entry;
        }

        records.forEach(function (rec) {
            const time = Date.parse(rec.receivedAt);
            if (!isNaN(time) && (now - time) <= windowMs) recent++;

            const cEntry = countryEntry(rec.country || "Unknown");
            cEntry.records++;
            cEntry.last = laterDate(cEntry.last, rec.receivedAt);

            if (rec.country === "Unknown" && rec.countryRaw) {
                if (!unresolvedAgg.has(rec.countryRaw)) {
                    unresolvedAgg.set(rec.countryRaw, { value: rec.countryRaw, records: 0 });
                }
                unresolvedAgg.get(rec.countryRaw).records++;
            }

            if (rec.institution) {
                const iEntry = institutionEntry(rec.institution, rec.country);
                iEntry.records++;
                iEntry.last = laterDate(iEntry.last, rec.receivedAt);
                if (rec.position) iEntry.positions.add(rec.position);
            }

            if (rec.position) {
                positionAgg.set(rec.position, (positionAgg.get(rec.position) || 0) + 1);
            }
        });

        // Institutions registered by hand in the admin panel — listed even
        // before they report a single download.
        source.institutionRegistry.forEach(function (item) {
            institutionEntry(item.name, item.country);
        });

        // Manual corrections: a per-country baseline, or a hard override of
        // the computed total (used when numbers arrive from outside the site).
        Object.keys(source.countryBaseline).forEach(function (country) { countryEntry(country); });
        Object.keys(source.countryOverrides).forEach(function (country) { countryEntry(country); });

        const countries = Array.from(countryAgg.values()).map(function (entry) {
            const baseline = source.countryBaseline[entry.country] || 0;
            const hasOverride = Object.prototype.hasOwnProperty.call(source.countryOverrides, entry.country);
            const override = hasOverride ? source.countryOverrides[entry.country] : null;
            return {
                country: entry.country,
                label: label(entry.country),
                records: entry.records,
                baseline: baseline,
                override: override,
                count: override != null ? override : entry.records + baseline,
                last: entry.last
            };
        }).filter(c => c.count > 0)
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

        const registryByName = new Map();
        source.institutionRegistry.forEach(function (item) {
            registryByName.set(normalizeKey(item.name), item);
        });

        const institutions = Array.from(institutionAgg.values()).map(function (entry) {
            const reg = registryByName.get(entry.key) || null;
            const baseline = reg ? Number(reg.baseline) || 0 : 0;
            const country = (entry.country && entry.country !== "Unknown")
                ? entry.country
                : ((reg && reg.country) || "Unknown");
            return {
                name: entry.name,
                country: country,
                countryLabel: label(country),
                type: reg ? reg.type : "",
                city: reg ? reg.city : "",
                website: reg ? reg.website : "",
                records: entry.records,
                baseline: baseline,
                count: entry.records + baseline,
                positions: Array.from(entry.positions).sort(),
                last: entry.last
            };
        }).filter(i => i.count > 0)
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        const positions = Array.from(positionAgg.entries())
            .map(function (pair) { return { position: pair[0], count: pair[1] }; })
            .sort((a, b) => b.count - a.count || a.position.localeCompare(b.position));

        const unresolved = Array.from(unresolvedAgg.values())
            .sort((a, b) => b.records - a.records);

        const lastRecord = records.reduce(function (acc, rec) {
            return laterDate(acc, rec.receivedAt);
        }, null);

        return {
            store: source,
            records: records,
            countries: countries,
            institutions: institutions,
            positions: positions,
            unresolved: unresolved,
            total: countries.reduce((sum, c) => sum + c.count, 0),
            recorded: records.length,
            countryCount: countries.length,
            institutionCount: institutions.length,
            recent: recent,
            recentWindowDays: Number(CONFIG.recentWindowDays) || 30,
            maxCount: countries.length ? countries[0].count : 0,
            lastUpdated: laterDate(source.updatedAt, lastRecord),
            pendingCount: records.filter(r => r.pending).length,
            sample: !!source.sample || usingSample,
            loadError: lastLoadError,
            configured: {
                downloadUrl: (source.download && source.download.url) || CONFIG.downloadUrl || "",
                dataUrl: CONFIG.dataUrl,
                backendUrl: CONFIG.backendUrl || ""
            }
        };
    }

    // Number of downloads attributed to one outline-file country name.
    function getCountryCount(country, stats) {
        const data = stats || getStats();
        const match = data.countries.find(c => c.country === country);
        return match ? match.count : 0;
    }

    // ---- Visitor country -------------------------------------------------
    // Only ever used to pre-select the registration form's country field; the
    // visitor can always change it and a failure never blocks the download.
    let detectedCountryPromise = null;

    function detectCountry() {
        if (!CONFIG.autoDetectCountry) return Promise.resolve(null);
        if (detectedCountryPromise) return detectedCountryPromise;

        detectedCountryPromise = (async function () {
            // Apps Script never sees the visitor's IP address, so the backend
            // cannot report a country: the public lookup below is the only
            // source. It is a pre-fill, and the visitor can always change it.
            try {
                const res = await fetch(CONFIG.geoIpEndpoint + "?fields=country_code,country_name", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    return resolveCountry(data.country_code) || resolveCountry(data.country_name) || null;
                }
            } catch (err) {
                // Offline or blocked: the visitor selects the country manually.
            }
            return null;
        }());

        return detectedCountryPromise;
    }

    // ---- Recording a download -------------------------------------------
    function currentPage() {
        const parts = String(window.location.pathname || "").split("/");
        return parts[parts.length - 1] || "index.html";
    }

    function stripPending(rec) {
        const copy = Object.assign({}, rec);
        delete copy.pending;
        return copy;
    }

    // One POST of one registration. The body of the answer is read as well as
    // its status, because the script says which of two things happened:
    //
    //   { success: true, id }                   -> the row is in the sheet now
    //   { success: true, duplicate: true, id }  -> that Record ID was already
    //                                              there, so nothing was added
    //
    // Both mean "the sheet counts this registration", which is what lets a
    // queued entry be re-sent without it ever being counted twice.
    async function postRecord(entry) {
        let res;
        try {
            res = await fetch(CONFIG.backendUrl, {
                method: "POST",
                // text/plain keeps the request "simple", so no CORS preflight is
                // needed — Apps Script web apps cannot answer preflight requests.
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: CONFIG.backendRecordAction, record: stripPending(entry) })
            });
        } catch (err) {
            return { ok: false, duplicate: false, message: (err && err.message) || "the statistics server could not be reached" };
        }
        if (!res.ok) return { ok: false, duplicate: false, message: "HTTP " + res.status };
        const data = await res.json().catch(function () { return null; });
        if (data && data.success === false) {
            return { ok: false, duplicate: false, message: String(data.error || "the registration was refused") };
        }
        return { ok: true, duplicate: !!(data && data.duplicate), message: "" };
    }

    async function record(input) {
        const data = input || {};
        const rawCountry = String(data.country || "").trim();
        const resolved = resolveCountry(rawCountry);

        const entry = normalizeRecordShape({
            id: createId(),
            receivedAt: new Date().toISOString(),
            name: data.name,
            email: data.email,
            institution: data.institution,
            position: data.position,
            country: resolved || "Unknown",
            countrySource: data.countrySource || (resolved ? "user" : "unknown"),
            countryRaw: resolved ? "" : rawCountry,
            version: data.version || CONFIG.downloadVersion || "",
            page: currentPage(),
            referrer: (typeof document !== "undefined" && document.referrer) || ""
        });

        // Always queue locally first: nothing is lost if the backend is down.
        const queued = readPending();
        queued.push(entry);
        writePending(queued);

        let synced = false;
        let message = "Saved in this browser — the statistics dashboard will show it immediately.";

        if (CONFIG.backendUrl) {
            let answer;
            try {
                answer = await postRecord(entry);
            } catch (err) {
                answer = { ok: false, duplicate: false, message: (err && err.message) || "" };
            }
            synced = answer.ok;
            if (synced) {
                writePending(readPending().filter(r => r.id !== entry.id));
                // The sheet is the source of the numbers now, and the snapshot
                // in hand predates this registration, so it is read back — in
                // the background: the file transfer must never wait for a
                // second round trip.
                load(true).catch(function () { /* the previous snapshot stays */ });
                message = "Registered on the FracSTAT statistics server.";
            } else {
                message = "Registered locally — the statistics server could not be reached.";
            }
        }

        notify();
        return { entry: stripPending(entry), synced: synced, message: message };
    }

    // ---- Export ----------------------------------------------------------
    // Builds the exact JSON the admin panel writes back to
    // data/fracstat_downloads.json. Baseline/override/registry values can be
    // passed in from the admin form; otherwise the loaded ones are reused.
    // While pre-registration is on, the exported snapshot keeps an empty
    // download URL: publishing a live link is a deliberate release step (see
    // FRACSTAT_CONFIG above), never something an export can do by accident.
    function buildStore(options) {
        const opts = options || {};
        const base = getStore();
        const stats = opts.stats || getStats();
        const records = opts.records || stats.records.map(stripPending);

        return {
            schemaVersion: SCHEMA_VERSION,
            updatedAt: new Date().toISOString(),
            download: {
                url: CONFIG.preRegistrationOnly ? "" : (CONFIG.downloadUrl || base.download.url || ""),
                version: CONFIG.downloadVersion || base.download.version || "",
                fileName: CONFIG.downloadFileName || base.download.fileName || ""
            },
            countryBaseline: opts.countryBaseline || base.countryBaseline,
            countryOverrides: opts.countryOverrides || base.countryOverrides,
            institutionRegistry: opts.institutionRegistry || base.institutionRegistry,
            records: records
        };
    }

    function exportJSON(options) {
        return JSON.stringify(buildStore(options), null, 2) + "\n";
    }

    // ---- Sample snapshot (preview only) ----------------------------------
    // Displayed only when CONFIG.useSampleData is true or the page is opened
    // with ?statsdemo=1, so the heatmap can be checked before launch. The flag
    // is never written to the exported JSON.
    const SAMPLE_STORE = {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: "2026-09-15T09:15:00.000Z",
        sample: true,
        download: { version: CONFIG.downloadVersion, url: CONFIG.downloadUrl, fileName: CONFIG.downloadFileName },
        countryBaseline: {
            "USA": 42, "China": 31, "India": 27, "Germany": 18, "England": 16,
            "Brazil": 12, "Japan": 11, "Australia": 9, "Canada": 9, "France": 8,
            "Netherlands": 7, "South Africa": 6, "Turkey": 5, "Mexico": 5,
            "Indonesia": 4, "Nigeria": 4, "Kenya": 3, "Pakistan": 3,
            "Poland": 3, "Spain": 3, "Italy": 3, "Sweden": 2, "Switzerland": 2,
            "Republic of Serbia": 2, "Colombia": 2, "Chile": 2, "Egypt": 2,
            "Vietnam": 2, "Thailand": 2, "Iran": 2, "Russia": 2, "Ukraine": 2,
            "Saudi Arabia": 2, "United Arab Emirates": 2, "Malaysia": 2,
            "Philippines": 2, "Bangladesh": 1, "Ethiopia": 1, "Ghana": 1,
            "Morocco": 1, "Peru": 1, "Argentina": 1, "New Zealand": 1,
            "Norway": 1, "Denmark": 1, "Belgium": 1, "Portugal": 1, "Greece": 1
        },
        countryOverrides: {},
        institutionRegistry: [
            { name: "University of KwaZulu-Natal", country: "South Africa", type: "University", city: "Durban", website: "", baseline: 3, notes: "Regional workshop" },
            { name: "Delft University of Technology", country: "Netherlands", type: "University", city: "Delft", website: "", baseline: 4, notes: "" },
            { name: "University of Sao Paulo", country: "Brazil", type: "University", city: "Sao Paulo", website: "", baseline: 2, notes: "" },
            { name: "IIT Bombay", country: "India", type: "University", city: "Mumbai", website: "", baseline: 5, notes: "" },
            { name: "Geological Survey of Japan", country: "Japan", type: "Government", city: "Tsukuba", website: "", baseline: 2, notes: "" },
            { name: "USGS Earthquake Science Center", country: "USA", type: "Government", city: "Menlo Park", website: "", baseline: 6, notes: "" },
            { name: "GFZ German Research Centre", country: "Germany", type: "Research Institute", city: "Potsdam", website: "", baseline: 5, notes: "" }
        ],
        records: [
            { id: "sample-01", receivedAt: "2026-09-15T08:40:00.000Z", name: "A. Mehta", email: "a.mehta@example.edu", institution: "IIT Bombay", position: "Student", country: "India", countrySource: "user", version: CONFIG.downloadVersion, page: "index.html" },
            { id: "sample-02", receivedAt: "2026-09-11T14:05:00.000Z", name: "L. Meyer", email: "l.meyer@example.de", institution: "GFZ German Research Centre", position: "Researcher", country: "Germany", countrySource: "user", version: CONFIG.downloadVersion, page: "index.html" },
            { id: "sample-03", receivedAt: "2026-09-06T19:22:00.000Z", name: "S. Ndlovu", email: "s.ndlovu@example.za", institution: "University of KwaZulu-Natal", position: "Professor", country: "South Africa", countrySource: "user", version: CONFIG.downloadVersion, page: "index.html" },
            { id: "sample-04", receivedAt: "2026-08-30T07:55:00.000Z", name: "R. Silva", email: "r.silva@example.br", institution: "University of Sao Paulo", position: "Industry Professional", country: "Brazil", countrySource: "user", version: CONFIG.downloadVersion, page: "index.html" },
            { id: "sample-05", receivedAt: "2026-08-24T11:30:00.000Z", name: "J. van Dijk", email: "j.vandijk@example.nl", institution: "Delft University of Technology", position: "Researcher", country: "Netherlands", countrySource: "user", version: CONFIG.downloadVersion, page: "index.html" }
        ]
    };

    // ---------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------
    window.FracSTATStats = {
        config: CONFIG,
        // Look-ups and naming
        label: label,
        resolveCountry: resolveCountry,
        normalizeKey: normalizeKey,
        isoToCountry: ISO_TO_COUNTRY,
        displayNames: DISPLAY_NAMES,
        // Country outlines
        loadGeoJSON: loadGeoJSON,
        loadCountryNames: loadCountryNames,
        // Data
        load: load,
        getStore: getStore,
        getStats: getStats,
        getCountryCount: getCountryCount,
        mergeRecords: mergeRecords,
        // Registration
        detectCountry: detectCountry,
        record: record,
        pendingRecords: pendingRecords,
        clearPending: clearPending,
        syncPending: syncPending,
        // Export / backend
        buildStore: buildStore,
        exportJSON: exportJSON,
        stripPending: stripPending,
        // Change notifications (map, tables, admin panel)
        subscribe: subscribe
    };
}());
