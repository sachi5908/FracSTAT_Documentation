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
    // 2. Accordion Sidebar Logic (Exclusive Open)
    // ---------------------------------------------------------
    const sidebarToggles = document.querySelectorAll(".sidebar-toggle");
    sidebarToggles.forEach(toggle => {
        toggle.addEventListener("click", () => {
            const parentSection = toggle.parentElement;
            
            // Close all other sections before toggling this one
            document.querySelectorAll(".sidebar-section").forEach(section => {
                if (section !== parentSection) {
                    section.classList.remove("open");
                }
            });

            parentSection.classList.toggle("open");
        });
    });

    // ---------------------------------------------------------
    // 3. Dynamic Functions (Needs to be re-run on page load)
    // ---------------------------------------------------------
    function initDynamicBehaviors() {
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

        // B. Update Sidebar Active State
        const currentPage = window.location.pathname.split("/").pop() || "docs_intro.html";
        
        // Force close all sections on page load/navigation
        document.querySelectorAll(".sidebar-section").forEach(section => {
            section.classList.remove("open");
        });

        document.querySelectorAll(".sidebar-links a").forEach(link => {
            const linkHref = link.getAttribute("href");
            if (linkHref === currentPage) {
                link.classList.add("active");
                // Open only the parent accordion of the active link
                const parentSection = link.closest(".sidebar-section");
                if (parentSection) parentSection.classList.add("open");
            } else {
                link.classList.remove("active");
            }
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

    // Intercept clicks on Sidebar Links and Pagination Buttons
    document.addEventListener("click", (e) => {
        const link = e.target.closest(".sidebar-links a, .nav-btn");
        
        if (link) {
            const url = link.getAttribute("href");
            
            // Ignore empty links or external links
            if (!url || url === "#" || url.startsWith("http")) return;

            e.preventDefault(); // Stop the browser from doing a hard reload
            
            // Change the URL in the browser address bar
            window.history.pushState({ path: url }, "", url);
            
            // Load the content smoothly
            loadPage(url);
            
            // On mobile, close the sidebar after clicking
            if (window.innerWidth <= 900 && docsSidebar.classList.contains("show")) {
                docsSidebar.classList.remove("show");
            }
        }
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
});