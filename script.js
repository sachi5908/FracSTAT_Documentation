// Mobile browsers (iOS Safari, Chrome for Android) automatically try to
// restore the scroll position associated with a history entry whenever
// history.pushState/replaceState/popstate fires. Since this site swaps
// page content via JS instead of doing a real navigation, that automatic
// restoration fights with our own "scroll to top on page change" logic
// below and silently wins on mobile (desktop browsers are far less
// aggressive about this, which is why the bug was mobile-only). Turning
// it off hands scroll position entirely back to our own code.
if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

// Home page preloader. It lives only in index.html, so the docs are never
// delayed. Let the animated mark finish its opening sequence, but always
// release the page if a slow asset prevents the normal load event.
(function initHomePreloader() {
    const preloader = document.getElementById("preloader");
    if (!preloader) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumVisibleMs = reduceMotion ? 0 : 2500;
    const startedAt = performance.now();
    let dismissed = false;

    function dismissPreloader() {
        if (dismissed) return;
        dismissed = true;

        const remaining = Math.max(0, minimumVisibleMs - (performance.now() - startedAt));
        window.setTimeout(function () {
            preloader.classList.add("pl-hide");
            preloader.addEventListener("transitionend", function () {
                preloader.remove();
            }, { once: true });
        }, remaining);
    }

    window.addEventListener("load", dismissPreloader, { once: true });
    window.setTimeout(dismissPreloader, 5500);
}());

// ---------------------------------------------------------
// Single source of truth for the sidebar — edit this array only.
// Every page's <aside id="docsSidebar"></aside> gets its contents
// generated from here, so adding/renaming/reordering a page in the
// docs only requires one edit instead of touching every HTML file.
// ---------------------------------------------------------
const SIDEBAR_SECTIONS = [
    {
        title: "Getting Started",
        links: [
            { href: "introduction.html", label: "Introduction" },
            { href: "installation.html", label: "Installation Guide" },
            { href: "launcher.html", label: "FracSTAT Home Page" }
        ]
    },
    {
        title: "Static Analyzer",
        links: [
            { href: "docs_static_map.html", label: "Map Tab" },
            { href: "docs_static_histogram.html", label: "Histogram Tab" },
            { href: "docs_static_cdf.html", label: "CDF Tab" },
            { href: "docs_static_rose.html", label: "Rose Tab" },
            { href: "docs_static_stereonet.html", label: "Stereonet Tab" },
            { href: "docs_static_connectivity.html", label: "Connectivity Tab" },
            { href: "docs_static_intensity.html", label: "Intensity Tab" },
            { href: "docs_static_profile.html", label: "Profile Tab" },
            { href: "docs_static_results.html", label: "Results Tab" }
        ]
    },
    {
        title: "Dynamic Analyzer",
        links: [
            { href: "docs_dynamic_map.html", label: "Map Tab" },
            { href: "docs_dynamic_rose.html", label: "Rose Tab" },
            { href: "docs_dynamic_mohr.html", label: "Mohr Tab" },
            { href: "docs_dynamic_stereonet.html", label: "Stereonet Tab" },
            { href: "docs_dynamic_table.html", label: "Table Tab" },
            { href: "docs_dynamic_method.html", label: "Method Tab" }
        ]
    },
    {
        title: "Uncertainty Analyzer",
        links: [
            { href: "docs_uncertainty_montecarlo.html", label: "Monte Carlo Tab" },
            { href: "docs_uncertainty_lhs.html", label: "LHS Tab" }
        ]
    },
    {
        title: "Video Tutorials",
        href: "tutorial.html",
        isButton: true
    }
];

// ---------------------------------------------------------
// Small-text footer links shown at the very bottom of the sidebar,
// below every collapsible section — Privacy Policy, License,
// Disclaimer, Contact. These are deliberately NOT an accordion
// section: they're rendered as a single row of small, plain-text
// links (see renderSidebar()'s footer block below and the
// .sidebar-footer-links rules in style.css).
// ---------------------------------------------------------
const SIDEBAR_FOOTER_LINKS = [
    { href: "privacy-policy.html", label: "Privacy Policy" },
    { href: "license.html", label: "License" },
    { href: "disclaimer.html", label: "Disclaimer" },
    { href: "contact.html", label: "Contact" },
    { href: "terms-of-use.html", label: "Terms of Use" }
];

const CHEVRON_SVG = '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';

function renderSidebar() {
    const sidebar = document.getElementById("docsSidebar");
    if (!sidebar) return;

    const currentPage = window.location.pathname.split("/").pop() || "introduction.html";

    const sectionsHtml = SIDEBAR_SECTIONS.map(section => {
        // Standalone button-style entry — no dropdown, no sub-links,
        // just a direct link styled as a button (e.g. Video Tutorials).
        if (section.isButton) {
            const activeCls = section.href === currentPage ? " active" : "";
            return `
                <div class="sidebar-section sidebar-section--button">
                    <a href="${section.href}" class="sidebar-button-link${activeCls}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                        ${section.title}
                    </a>
                </div>`;
        }

        const containsActive = section.links.some(l => l.href === currentPage);
        const linksHtml = section.links.map(l => {
            const activeCls = l.href === currentPage ? ' class="active"' : "";
            return `<li><a href="${l.href}"${activeCls}>${l.label}</a></li>`;
        }).join("");

        return `
            <div class="sidebar-section${containsActive ? " open" : ""}">
                <button class="sidebar-toggle">
                    ${section.title}
                    ${CHEVRON_SVG}
                </button>
                <ul class="sidebar-links">${linksHtml}</ul>
            </div>`;
    }).join("");

    // Small plain-text row (Privacy Policy · License · Disclaimer ·
    // Contact) pinned to the bottom of the sidebar, below every
    // collapsible section — not a section of its own.
    const footerLinksHtml = SIDEBAR_FOOTER_LINKS.map(l => {
        const activeCls = l.href === currentPage ? ' class="active"' : "";
        return `<a href="${l.href}"${activeCls}>${l.label}</a>`;
    }).join('<span class="sidebar-footer-sep" aria-hidden="true">&middot;</span>');

    sidebar.innerHTML = sectionsHtml + `
        <div class="sidebar-footer-links">${footerLinksHtml}</div>`;
}

// ---------------------------------------------------------
// Auto-generated Previous/Next pagination — bottom of the reading
// content only. This is deliberately its OWN ordered list, kept
// separate from SIDEBAR_SECTIONS above: the sidebar groups pages by
// section/category for navigation, while pagination cares only about
// linear reading order, and the two don't have to be edited together.
// PAGE_ORDER is the single place to add, remove, or reorder a page's
// position in the Previous/Next chain.
//
// Every docs page previously hand-coded its own
// <div class="pagination-nav">...</div> at the bottom of the content
// with hard-wired hrefs/labels — meaning inserting a page required
// manually re-editing the links inside two *other* files too. Now
// that div only ever needs to exist (even empty); renderPaginationNav()
// finds it inside .docs-content-inner (i.e. below the reading content,
// never touching the sidebar) and fills in whichever buttons belong
// there for the current page, rebuilding it on every navigation.
// ---------------------------------------------------------
const PAGE_ORDER = [
    { href: "introduction.html", label: "Introduction" },
    { href: "installation.html", label: "Installation Guide" },
    { href: "launcher.html", label: "FracSTAT Home Page" },

    { href: "docs_static_map.html", label: "Static Map Tab" },
    { href: "docs_static_histogram.html", label: "Static Histogram Tab" },
    { href: "docs_static_cdf.html", label: "Static CDF Tab" },
    { href: "docs_static_rose.html", label: "Static Rose Tab" },
    { href: "docs_static_stereonet.html", label: "Static Stereonet Tab" },
    { href: "docs_static_connectivity.html", label: "Static Connectivity Tab" },
    { href: "docs_static_intensity.html", label: "Static Intensity Tab" },
    { href: "docs_static_profile.html", label: "Static Profile Tab" },
    { href: "docs_static_results.html", label: "Static Results Tab" },

    { href: "docs_dynamic_map.html", label: "Dynamic Map Tab" },
    { href: "docs_dynamic_rose.html", label: "Dynamic Rose Tab" },
    { href: "docs_dynamic_mohr.html", label: "Dynamic Mohr Tab" },
    { href: "docs_dynamic_stereonet.html", label: "Dynamic Stereonet Tab" },
    { href: "docs_dynamic_table.html", label: "Dynamic Table Tab" },
    { href: "docs_dynamic_method.html", label: "Dynamic Method Tab" },

    { href: "docs_uncertainty_montecarlo.html", label: "Uncertainty Monte Carlo Tab" },
    { href: "docs_uncertainty_lhs.html", label: "Uncertainty LHS Tab" },

    { href: "tutorial.html", label: "Video Tutorials" },
    
    { href: "privacy-policy.html", label: "Privacy Policy" },
    { href: "license.html", label: "License" },
    { href: "disclaimer.html", label: "Disclaimer" },
    { href: "contact.html", label: "Contact" },
    { href: "terms-of-use.html", label: "Terms of Use" }
];

function renderPaginationNav() {
    // Look only inside the reading content, never the sidebar.
    const container = document.querySelector(".docs-content-inner");
    if (!container) return; // not a docs page (e.g. index.html)

    const currentPage = window.location.pathname.split("/").pop() || "introduction.html";
    const idx = PAGE_ORDER.findIndex(function (p) { return p.href === currentPage; });

    // Page isn't part of the documented reading order (admin.html, a
    // brand-new unregistered draft page, etc.) — leave any existing
    // markup untouched rather than guessing.
    if (idx === -1) return;

    const prev = idx > 0 ? PAGE_ORDER[idx - 1] : null;
    const next = idx < PAGE_ORDER.length - 1 ? PAGE_ORDER[idx + 1] : null;

    const prevHtml = prev
        ? '<a href="' + prev.href + '" class="nav-btn">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
            "Previous: " + prev.label +
            "</a>"
        : "<div></div>";

    const nextHtml = next
        ? '<a href="' + next.href + '" class="nav-btn">' +
            "Next: " + next.label +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
            "</a>"
        : "<div></div>";

    // Only ever inserted below the reading content (appended to
    // .docs-content-inner), and only if the page doesn't already have
    // a pagination-nav div — this function never touches #docsSidebar.
    let nav = container.querySelector(".pagination-nav");
    if (!nav) {
        nav = document.createElement("div");
        nav.className = "pagination-nav";
        container.appendChild(nav);
    }
    nav.innerHTML = prevHtml + nextHtml;
}
// ============================================================
//  Video Tutorials page (tutorial.html) — interactivity
//  Extracted from tutorial.html's own inline <script> and moved here
//  because the AJAX docs router (loadPage() below) only swaps
//  .docs-content-inner's HTML between navigations; a page-specific
//  <script> block sitting in tutorial.html's own body never re-runs
//  after that kind of navigation, only on a hard page load/refresh.
//  This function is called from initDynamicBehaviors() on every page
//  load AND every AJAX-routed navigation, and guards itself so it is
//  a harmless no-op on every other (non-tutorial) page.
// ============================================================
function initTutorialVideoPage() {
    "use strict";

    var videoGrid = document.getElementById("videoGrid");
    if (!videoGrid) return; // not the tutorial page — nothing to do


        // ---- 1. Generate a coloured placeholder thumbnail for cards
        //         that don't supply a real thumb URL.
        //         Draws a dark gradient + centred play icon on a canvas
        //         and uses the result as the img src. ----
        const PLACEHOLDER_PALETTES = [
            ["#0f172a", "#1e3a8a"],
            ["#0f172a", "#14532d"],
            ["#0f172a", "#4c1d95"],
            ["#1a1a2e", "#0d3b66"],
            ["#1a0a0a", "#7f1d1d"],
        ];

        function makePlaceholder(index) {
            const [c1, c2] = PLACEHOLDER_PALETTES[index % PLACEHOLDER_PALETTES.length];
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 360;
            const ctx = canvas.getContext("2d");
            const grad = ctx.createLinearGradient(0, 0, 640, 360);
            grad.addColorStop(0, c1);
            grad.addColorStop(1, c2);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 640, 360);
            // Subtle grid
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            ctx.lineWidth = 1;
            for (let x = 0; x < 640; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 360); ctx.stroke();
            }
            for (let y = 0; y < 360; y += 40) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke();
            }
            return canvas.toDataURL("image/png");
        }

        // ---- 2. Initialise each embed card ----
        let cardIndex = 0;
        document.querySelectorAll(".tut-embed-wrap").forEach(function (wrap) {
            const thumbEl = wrap.querySelector(".tut-thumb");
            let thumbSrc = wrap.dataset.thumb;
            const videoSrc = wrap.dataset.src;
            const dataSource = wrap.dataset.source;

            // Auto-fetch YouTube thumbnail
            if (!thumbSrc && dataSource === "youtube" && videoSrc) {
                const match = videoSrc.match(/\/embed\/([^?]+)/);
                if (match && match[1]) {
                    const videoId = match[1];
                    thumbSrc = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                }
            }
            
            // Auto-fetch Google Drive thumbnail
            if (!thumbSrc && dataSource === "drive" && videoSrc) {
                const match = videoSrc.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    const driveId = match[1];
                    thumbSrc = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1280`;
                }
            }

            // Supply a generated placeholder when no real thumbnail is given
            if (!thumbSrc) {
                thumbEl.src = makePlaceholder(cardIndex);
                wrap.classList.add("img-loaded");
            } else {
                thumbEl.src = thumbSrc;
                
                thumbEl.addEventListener("load", function () {
                    wrap.classList.add("img-loaded");
                }, { once: true });
                
                thumbEl.addEventListener("error", function () {
                    // Fallbacks
                    if (dataSource === "youtube" && thumbEl.src.includes("maxresdefault.jpg")) {
                        thumbEl.src = thumbEl.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                    } else {
                        thumbEl.src = makePlaceholder(cardIndex);
                        wrap.classList.add("img-loaded");
                    }
                }, { once: true });
            }
            cardIndex++;

            // ---- Expand-to-fullscreen button (only visible once playing) ----
            const expandBtn = document.createElement("button");
            expandBtn.type = "button";
            expandBtn.className = "tut-expand-btn";
            expandBtn.setAttribute("aria-label", "Expand video");
            expandBtn.title = "Expand";
            expandBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
            expandBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                const src = wrap.dataset.src;
                if (!src || src.includes("REPLACE_WITH_FILE_ID")) return;
                openVideoLightbox(src);
            });
            wrap.appendChild(expandBtn);

            // ---- Click to play ----
            wrap.addEventListener("click", function () {
                if (wrap.classList.contains("playing")) return;

                // Pause any other active player first
                document.querySelectorAll(".tut-embed-wrap.playing").forEach(function (other) {
                    other.classList.remove("playing");
                    const oldIframe = other.querySelector("iframe");
                    if (oldIframe) oldIframe.remove();
                });

                // Build and inject the iframe
                const src = wrap.dataset.src;
                if (!src || src.includes("REPLACE_WITH_FILE_ID")) {
                    alert("No video source has been set for this card yet.\nReplace the data-src attribute with a real embed URL.");
                    return;
                }
                const iframe = document.createElement("iframe");
                iframe.src = src;
                iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
                iframe.allowFullscreen = true;
                wrap.appendChild(iframe);
                wrap.classList.add("playing");
            });
        });

        // ---- 2b. Fullscreen video lightbox ----
        function ensureVideoLightbox() {
            let overlay = document.getElementById("tutVideoLightboxOverlay");
            if (overlay) return overlay;

            overlay = document.createElement("div");
            overlay.className = "tut-video-lightbox-overlay";
            overlay.id = "tutVideoLightboxOverlay";
            overlay.innerHTML =
                '<button type="button" class="tut-video-lightbox-close" aria-label="Close video">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
                '</button>' +
                '<div class="tut-video-lightbox-frame" id="tutVideoLightboxFrame"></div>';
            document.body.appendChild(overlay);

            overlay.addEventListener("click", function (e) {
                if (e.target === overlay || e.target.closest(".tut-video-lightbox-close")) {
                    closeVideoLightbox();
                }
            });

            return overlay;
        }

        function openVideoLightbox(src) {
            const overlay = ensureVideoLightbox();
            const frameHolder = document.getElementById("tutVideoLightboxFrame");
            frameHolder.innerHTML = "";
            const iframe = document.createElement("iframe");
            iframe.src = src;
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
            iframe.allowFullscreen = true;
            frameHolder.appendChild(iframe);
            overlay.classList.add("active");
            document.body.classList.add("tut-video-lightbox-open");
        }

        function closeVideoLightbox() {
            const overlay = document.getElementById("tutVideoLightboxOverlay");
            if (!overlay) return;
            overlay.classList.remove("active");
            document.body.classList.remove("tut-video-lightbox-open");
            // Stop playback by clearing the iframe rather than just hiding it
            const frameHolder = document.getElementById("tutVideoLightboxFrame");
            if (frameHolder) frameHolder.innerHTML = "";
        }

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeVideoLightbox();
        });

        // ---- 3. Filter bar ----
        const filterBtns = document.querySelectorAll(".tut-filter-btn");
        const cards = document.querySelectorAll(".tut-card");
        const sectionHeadings = document.querySelectorAll(".tut-section-heading");
        const emptyState = document.getElementById("emptyState");

        function applyFilter(filter) {
            // Stop any playing video when switching filter
            document.querySelectorAll(".tut-embed-wrap.playing").forEach(function (w) {
                w.classList.remove("playing");
                const iframe = w.querySelector("iframe");
                if (iframe) iframe.remove();
            });

            let visibleCount = 0;

            // Show/hide cards
            cards.forEach(function (card) {
                const match = filter === "all" || card.dataset.category === filter;
                card.style.display = match ? "" : "none";
                if (match) visibleCount++;
            });

            // Show/hide section headings.
            // "All Videos" merges every category into one continuous grid
            // with no dividing headings; a specific category filter still
            // shows just its own single heading above the matching cards.
            sectionHeadings.forEach(function (heading) {
                if (filter === "all") {
                    heading.style.display = "none";
                } else {
                    const section = heading.dataset.section;
                    heading.style.display = section === filter ? "" : "none";
                }
            });

            // Empty state
            emptyState.style.display = visibleCount === 0 ? "block" : "none";
        }

        filterBtns.forEach(function (btn) {
            btn.addEventListener("click", function () {
                // Update active state
                filterBtns.forEach(function (b) { b.classList.remove("active"); });
                btn.classList.add("active");
                applyFilter(btn.dataset.filter);
            });
        });

        // Apply once immediately: "All Videos" is the default active button
        // in the markup, so headings must start hidden rather than waiting
        // for the first click.
        applyFilter("all");

}

document.addEventListener("DOMContentLoaded", () => {
    // ---------------------------------------------------------
    // 1. Basic Setup & Mobile Toggle
    // ---------------------------------------------------------
    const downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn) downloadBtn.addEventListener("click", () => alert("Starting download..."));

    const mobileToggle = document.getElementById("mobileToggle");
    const docsSidebar = document.getElementById("docsSidebar");
    if (mobileToggle && docsSidebar) {
        mobileToggle.addEventListener("click", () => docsSidebar.classList.toggle("show"));
    }


    // ---------------------------------------------------------
    // 3. Dynamic Functions (Needs to be re-run on page load)
    // ---------------------------------------------------------
    function initDynamicBehaviors() {
    // Rebuild the sidebar for whichever page is now current
    renderSidebar();

    // Rebuild the Previous/Next buttons for whichever page is now
    // current, from the same SIDEBAR_SECTIONS order used above.
    renderPaginationNav();

    // Re-initialise the Video Tutorials page's cards/filters/lightbox.
    // Safe to call on every page: it no-ops immediately unless the
    // current .docs-content-inner actually contains #videoGrid (i.e.
    // we're on tutorial.html), which covers both a hard page load and
    // an AJAX-routed navigation into/within that page.
    initTutorialVideoPage();

    // A. Bind Copy Buttons
    document.querySelectorAll(".copy-btn").forEach(button => {
            // Remove old listener to prevent duplicates
            const newBtn = button.cloneNode(true);
            button.parentNode.replaceChild(newBtn, button);
            
            newBtn.addEventListener("click", () => {
                const codeText = newBtn.closest(".code-window").querySelector("code").innerText;
                navigator.clipboard.writeText(codeText).then(() => {
                    const originalHTML = newBtn.innerHTML;
                    newBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
                    newBtn.classList.add("copied");
                    setTimeout(() => {
                        newBtn.innerHTML = originalHTML;
                        newBtn.classList.remove("copied");
                    }, 2000);
                });
            });
        });


        // C. Skeleton-loading shimmer for figure images.
        // Each .figure-img-wrap starts with a shimmering placeholder (CSS);
        // this reveals the real <img> underneath once it has actually
        // loaded, so lazy-loaded/off-screen images don't show a blank gap.
        document.querySelectorAll(".figure-img-wrap img").forEach(img => {
            const wrap = img.closest(".figure-img-wrap");
            if (!wrap || wrap.classList.contains("img-loaded")) return;

            const reveal = () => wrap.classList.add("img-loaded");

            if (img.complete && img.naturalWidth > 0) {
                // Already cached/decoded by the time we got here
                reveal();
            } else {
                img.addEventListener("load", reveal, { once: true });
                // Reveal on error too, so a broken image link doesn't
                // shimmer forever — the browser's broken-image icon
                // will show instead.
                img.addEventListener("error", reveal, { once: true });
            }
        });
    }

    // Initialize on first load
    initDynamicBehaviors();

    // ---------------------------------------------------------
    // 3b. Shimmer reveal for standalone lazy images (index.html
    //     mockup screenshot, card banners, institute logos) that use
    //     the .lazy-wrap wrapper instead of .figure-img-wrap.
    //     Runs once — these images aren't swapped by the docs router.
    //     A minimum visible duration is enforced so a fast/cached load
    //     doesn't finish before the shimmer has a chance to paint.
    // ---------------------------------------------------------
    const MIN_SHIMMER_MS = 400;
    document.querySelectorAll(".lazy-wrap img").forEach(img => {
        const wrap = img.closest(".lazy-wrap");
        if (!wrap || wrap.classList.contains("img-loaded")) return;

        const startedAt = performance.now();
        const reveal = () => {
            const elapsed = performance.now() - startedAt;
            const remaining = Math.max(0, MIN_SHIMMER_MS - elapsed);
            setTimeout(() => wrap.classList.add("img-loaded"), remaining);
        };

        if (img.complete && img.naturalWidth > 0) {
            reveal();
        } else {
            img.addEventListener("load", reveal, { once: true });
            img.addEventListener("error", reveal, { once: true });
        }
    });

    // ---------------------------------------------------------
    // 4. Smooth Page Routing (No-Flicker Navigation)
    // ---------------------------------------------------------
    const contentContainer = document.querySelector(".docs-content");

    // ---- YouTube-style top progress bar ----
    let ytBar = null;
    let ytProgressTimer = null;
    let ytHideTimer = null;

    function ensureYtBar() {
        if (ytBar) return ytBar;
        ytBar = document.createElement("div");
        ytBar.id = "ytProgressBar";
        ytBar.className = "yt-progress-bar";
        document.body.appendChild(ytBar);
        return ytBar;
    }

    function startYtProgress() {
        const bar = ensureYtBar();
        clearTimeout(ytHideTimer);
        clearInterval(ytProgressTimer);

        // Reset instantly with no transition, then animate forward
        bar.style.transition = "none";
        bar.style.opacity = "1";
        bar.style.width = "0%";
        // Force reflow so the reset actually applies before we animate
        void bar.offsetWidth;
        bar.style.transition = "width 0.3s ease-out, opacity 0.25s ease";

        let progress = 0;
        ytProgressTimer = setInterval(() => {
            // Ease toward ~90% but never quite reach it, like YouTube's bar
            const remaining = 90 - progress;
            progress += Math.max(remaining * 0.08, 0.3);
            if (progress >= 90) progress = 90;
            bar.style.width = progress + "%";
        }, 150);
    }

    function finishYtProgress(success) {
        clearInterval(ytProgressTimer);
        const bar = ensureYtBar();
        bar.style.width = "100%";
        ytHideTimer = setTimeout(() => {
            bar.style.opacity = "0";
            setTimeout(() => { bar.style.width = "0%"; }, 250);
        }, success ? 200 : 400);
    }

    async function loadPage(url) {
        startYtProgress();
        let succeeded = false;
        try {
            // Fetch the new HTML file
            const response = await fetch(url);
            if (!response.ok) throw new Error("Page not found: " + response.status);
            const htmlText = await response.text();

            // Parse the HTML and extract just the content area
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");
            const newContent = doc.querySelector(".docs-content-inner");

            if (!newContent) {
                throw new Error("Could not find .docs-content-inner in fetched page");
            }

            // Fade out current content, then swap it in
            contentContainer.style.opacity = '0';

            await new Promise(resolve => setTimeout(resolve, 200));

            // Replace the content
            document.querySelector(".docs-content-inner").innerHTML = newContent.innerHTML;

            // Scroll back to top.
            // On desktop, .docs-content is its own scrolling box, so
            // resetting its scrollTop is what matters. On mobile
            // (<=900px), a media query makes .docs-content non-scrolling
            // and the page/window scrolls instead — so we also reset the
            // window/document scroll position, or the mobile view stays
            // wherever it was on the previous page.
            //
            // Using .scrollTop = 0 (rather than .scrollTo(0, 0)) is
            // deliberate: .docs-content has `scroll-behavior: smooth` in
            // CSS, so scrollTo() would animate the reset instead of
            // jumping instantly, and that animation can be cut short by
            // the layout shifting underneath it (see below) — leaving
            // the page stopped partway instead of at the very top.
            const resetScrollToTop = () => {
                contentContainer.scrollTop = 0;
                (document.scrollingElement || document.documentElement).scrollTop = 0;
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
            };
            resetScrollToTop();
            // Re-apply after layout settles: lazy-loaded figure images
            // (and the CSS shimmer placeholders they replace) change
            // height as they resolve, which can nudge mobile browsers'
            // scroll position away from 0 a moment after our first reset.
            requestAnimationFrame(resetScrollToTop);
            setTimeout(resetScrollToTop, 60);
            setTimeout(resetScrollToTop, 350);

            // Fade back in
            contentContainer.style.opacity = '1';

            // Re-bind buttons and update sidebar for the new content
            initDynamicBehaviors();

            succeeded = true;
        } catch (error) {
            console.error("Routing error:", error);
            // Make sure the page is never left blank, even on failure
            contentContainer.style.opacity = '1';
            // Fallback: do a normal hard redirect so the user still gets the page
            window.location.href = url;
        } finally {
            finishYtProgress(succeeded);
        }
    }

    // ---------------------------------------------------------
    // 2. Accordion Sidebar Logic (Exclusive Open) — delegated so it
    //    keeps working after renderSidebar() rebuilds the sidebar's
    //    innerHTML on every page load/navigation.
    // ---------------------------------------------------------
    document.addEventListener("click", (e) => {
        const toggle = e.target.closest(".sidebar-toggle");
        if (!toggle) return;

        const parentSection = toggle.parentElement;
        document.querySelectorAll(".sidebar-section").forEach(section => {
            if (section !== parentSection) section.classList.remove("open");
        });
        parentSection.classList.toggle("open");
    });

    // Handle Browser Back/Forward buttons
    window.addEventListener("popstate", () => {
        const url = window.location.pathname.split("/").pop() || "docs_intro.html";
        loadPage(url);
    });

    // ---------------------------------------------------------
    // 5. In-page Table of Contents / Anchor Smooth-Scroll
    // ---------------------------------------------------------
    // .docs-body has overflow:hidden and .docs-content scrolls internally,
    // so a plain <a href="#section-id"> can't rely on the browser's
    // default hash-jump (that only reliably scrolls the window itself).
    // Intercept any in-page hash link and scroll the matching heading
    // into view inside the nested .docs-content container instead.
    document.addEventListener("click", (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;

        const hash = anchor.getAttribute("href");
        if (!hash || hash.length < 2) return; // ignore bare "#"

        const targetEl = document.getElementById(hash.slice(1));
        if (!targetEl) return;

        e.preventDefault();
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });

        // Keep the URL shareable/bookmarkable without adding a history entry
        history.replaceState(null, "", hash);
    });

    // ---------------------------------------------------------
    // 6. Image Lightbox — click a figure screenshot (or its
    //    zoom icon) to view it enlarged
    // ---------------------------------------------------------
    function ensureLightbox() {
        let overlay = document.getElementById("imgLightboxOverlay");
        if (overlay) return overlay;

        overlay = document.createElement("div");
        overlay.className = "lightbox-overlay";
        overlay.id = "imgLightboxOverlay";
        overlay.innerHTML = `
            <button type="button" class="lightbox-close" aria-label="Close enlarged image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <img class="lightbox-img" id="imgLightboxImg" src="" alt="">
            <p class="lightbox-caption" id="imgLightboxCaption"></p>
        `;
        document.body.appendChild(overlay);

        // Click backdrop or the close button to dismiss (not the image/caption itself)
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay || e.target.closest(".lightbox-close")) {
                closeLightbox();
            }
        });

        return overlay;
    }

    function openLightbox(src, alt, captionText) {
        const overlay = ensureLightbox();
        document.getElementById("imgLightboxImg").src = src;
        document.getElementById("imgLightboxImg").alt = alt || "";
        document.getElementById("imgLightboxCaption").textContent = captionText || "";
        overlay.classList.add("active");
        document.body.classList.add("lightbox-open");
    }

    function closeLightbox() {
        const overlay = document.getElementById("imgLightboxOverlay");
        if (!overlay) return;
        overlay.classList.remove("active");
        document.body.classList.remove("lightbox-open");
    }

    // Escape key closes the lightbox from anywhere
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeLightbox();
    });

    // Delegated so it keeps working after AJAX-routed content swaps
    document.addEventListener("click", (e) => {
        const trigger = e.target.closest(".figure-img-wrap img, .figure-zoom-btn");
        if (!trigger) return;

        const wrap = trigger.closest(".figure-img-wrap");
        if (!wrap) return;

        const img = wrap.querySelector("img");
        const figure = wrap.closest("figure");
        const captionEl = figure ? figure.querySelector(".ph-caption") : null;

        openLightbox(img.src, img.alt, captionEl ? captionEl.textContent.trim() : "");
    });

    // ---------------------------------------------------------
    // 7. Intercept internal <a> clicks and route them through the
    //    SPA loader instead of letting the browser hard-reload.
    //    This is what actually eliminates the sidebar flicker and
    //    makes the top progress bar show up for normal navigation,
    //    not just Back/Forward.
    // ---------------------------------------------------------
    document.addEventListener("click", (e) => {
        // Only docs pages have the AJAX-swappable content area; on
        // marketing pages like index.html, fall back to normal navigation.
        if (!contentContainer) return;

        // Let modifier-clicks (new tab, etc.) behave normally
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const anchor = e.target.closest("a");
        if (!anchor) return;

        const href = anchor.getAttribute("href");
        if (!href) return;

        // Skip hash links (handled by the TOC smooth-scroll listener),
        // external links, mail links, new-tab links, and downloads
        if (href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;
        if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
        if (!href.endsWith(".html")) return;

        const currentPage = window.location.pathname.split("/").pop() || "introduction.html";
        if (href === currentPage) { e.preventDefault(); return; }

        e.preventDefault();
        history.pushState({}, "", href);
        loadPage(href);

        // Close the mobile sidebar drawer after navigating
        if (docsSidebar) docsSidebar.classList.remove("show");
    });

});

// -------------------------------------------------------------------------
// Landing-page fracture background
// Uses the same deterministic branching-network method as the Presentation
// page. It only runs when index.html's #heroFracture SVG is present.
// -------------------------------------------------------------------------
(function renderLandingFractures() {
    const svg = document.getElementById("heroFracture");
    if (!svg || svg.dataset.rendered === "true") return;

    const NS = "http://www.w3.org/2000/svg";
    const W = 1200;
    const H = 800;

    function mulberry32(seed) {
        return function () {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function growCrack(x, y, angle, depth, maxDepth, random, segments, generation) {
        if (depth >= maxDepth || x < -40 || x > W + 40 || y < -40 || y > H + 40) return;

        const steps = 3 + Math.floor(random() * 3);
        const segmentLength = (maxDepth - depth) * 15 + random() * 16;
        const points = [[x, y]];
        let currentX = x;
        let currentY = y;
        let currentAngle = angle;

        for (let i = 0; i < steps; i += 1) {
            currentAngle += (random() - 0.5) * 0.85;
            currentX += Math.cos(currentAngle) * (segmentLength / steps);
            currentY += Math.sin(currentAngle) * (segmentLength / steps);
            points.push([currentX, currentY]);
        }

        segments.push({ points, generation });

        if (depth < maxDepth - 2 && random() < 0.5) {
            growCrack(currentX, currentY, currentAngle + (random() < 0.5 ? 1 : -1) * (0.5 + random() * 0.7), depth + 1, maxDepth, random, segments, generation + 1);
        }
        if (random() < 0.28) {
            growCrack(currentX, currentY, currentAngle + (random() - 0.5) * 1.1, depth + 1, maxDepth, random, segments, generation + 1);
        }
        growCrack(currentX, currentY, currentAngle, depth + 1, maxDepth, random, segments, generation);
    }

    function buildNetwork(seed, seeds, maxDepth) {
        const random = mulberry32(seed);
        const segments = [];

        for (let i = 0; i < seeds; i += 1) {
            const edge = Math.floor(random() * 4);
            let x;
            let y;

            if (edge === 0) { x = random() * W; y = -10; }
            else if (edge === 1) { x = W + 10; y = random() * H; }
            else if (edge === 2) { x = random() * W; y = H + 10; }
            else { x = -10; y = random() * H; }

            growCrack(x, y, random() * Math.PI * 2, 0, maxDepth, random, segments, 0);
        }

        return segments;
    }

    function toPath(points) {
        return points.map((point, index) => (index === 0 ? "M" : "L") + point[0].toFixed(1) + "," + point[1].toFixed(1)).join(" ");
    }

    const colors = ["#C1642F", "#1F8577", "#8A9A57", "rgba(193,100,47,0.5)"];
    const network = document.createElementNS(NS, "g");
    network.setAttribute("class", "fracture-network");

    buildNetwork(11, 12, 6).forEach((segment, index) => {
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", toPath(segment.points));
        path.setAttribute("pathLength", "1");
        path.setAttribute("class", "fracture-path");
        path.style.stroke = colors[index % colors.length];
        path.style.strokeWidth = String(Math.max(0.5, 2.2 - segment.generation * 0.45));
        path.style.setProperty("--delay", Math.min(index * 0.07, 3.8).toFixed(2) + "s");
        network.appendChild(path);

        // First-generation endpoints become the small active nodes seen in
        // the presentation network. The formula keeps their placement stable.
        if (segment.generation <= 1 && index % 3 === 0) {
            const endpoint = segment.points[segment.points.length - 1];
            const node = document.createElementNS(NS, "circle");
            node.setAttribute("cx", endpoint[0].toFixed(1));
            node.setAttribute("cy", endpoint[1].toFixed(1));
            node.setAttribute("r", "2.6");
            node.setAttribute("class", "fracture-node");
            node.style.fill = "#C1642F";
            node.style.setProperty("--delay", Math.min(index * 0.07 + 0.3, 4.1).toFixed(2) + "s");
            network.appendChild(node);
        }
    });

    svg.appendChild(network);
    svg.dataset.rendered = "true";
}());
