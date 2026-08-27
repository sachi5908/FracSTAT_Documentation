# FracSTAT Documentation

Source for the FracSTAT documentation website — the user manual, installation guide,
per-tab reference pages, and video tutorials for
[FracSTAT](https://github.com/sachi5908/FracSTAT), an open-source application for
quantitative fracture-network analysis.

**Live site:** https://sachi5908.github.io/FracSTAT_Documentation/

This repository contains **only the website**. The FracSTAT application itself (Python /
PySide6) lives in a separate repository: https://github.com/sachi5908/FracSTAT

---

## What this site documents

FracSTAT unifies fracture digitization, topological analysis, statistical
characterization, stress evaluation, and uncertainty quantification into a single
application, so a dataset never has to be transferred between tools. The docs are
organized to mirror the application's three analyzers:

| Section | Pages | Covers |
| --- | --- | --- |
| Getting Started | `introduction.html`, `installation.html`, `launcher.html` | Rationale and references, per-OS install steps, launcher/home-screen workflow |
| Static Analyzer | `docs_static_*.html` (9 pages) | Map, Histogram, CDF, Rose, Stereonet, Connectivity, Intensity, Profile, Results tabs |
| Dynamic Analyzer | `docs_dynamic_*.html` (6 pages) | Map, Rose, Mohr, Stereonet, Table, Method tabs |
| Uncertainty Analyzer | `docs_uncertainty_*.html` (2 pages) | Monte Carlo and Latin Hypercube Sampling tabs |
| Video Tutorials | `tutorial.html` | Filterable video gallery with a fullscreen lightbox |
| Legal | `privacy-policy.html`, `license.html`, `disclaimer.html`, `terms-of-use.html`, `contact.html` | MIT license text, third-party dependency licenses, policies, contact details |

Each documentation page corresponds to a tab module in the application source
(for example `docs_static_rose.html` documents `static_analyzer/tabs/static_rose_tab.py`).

---

## Technology

Deliberately dependency-free: hand-written HTML, one stylesheet, one script file. There
is no build step, no bundler, no static-site generator, and no `node_modules`. Any static
web server — or GitHub Pages — can serve the directory as-is.

- **HTML5** — one file per documentation page
- **`style.css`** — all site styling, including the docs layout, sidebar, and dark-code blocks
- **`script.js`** — sidebar generation, Previous/Next pagination, AJAX page routing, tutorial gallery, video lightbox
- **JSZip 3.10.1** (CDN, `admin.html` only) — builds the site-backup `.zip`
- **Cloudinary** — hosts the logo, favicon, and screenshot assets

---

## Repository layout

```
.
├── index.html                       # Marketing landing page (animated fracture-network hero)
├── animated_logo_loader.html        # Animated logo, embedded by the index.html preloader
│
├── introduction.html                # User Manual v1.0 — rationale, comparison, references
├── installation.html                # Windows / macOS / Linux install walkthrough
├── launcher.html                    # FracSTAT home screen and project workflow
│
├── docs_static_map.html             # ── Static Analyzer (9 tabs)
├── docs_static_histogram.html
├── docs_static_cdf.html
├── docs_static_rose.html
├── docs_static_stereonet.html
├── docs_static_connectivity.html
├── docs_static_intensity.html
├── docs_static_profile.html
├── docs_static_results.html
│
├── docs_dynamic_map.html            # ── Dynamic Analyzer (6 tabs)
├── docs_dynamic_rose.html
├── docs_dynamic_mohr.html
├── docs_dynamic_stereonet.html
├── docs_dynamic_table.html
├── docs_dynamic_method.html
│
├── docs_uncertainty_montecarlo.html # ── Uncertainty Analyzer (2 tabs)
├── docs_uncertainty_lhs.html
│
├── tutorial.html                    # Video tutorial gallery
├── contact.html                     # ── Legal / informational
├── disclaimer.html
├── license.html
├── privacy-policy.html
├── terms-of-use.html
│
├── admin.html                       # Browser-based content editor (auth-gated)
├── script.js                        # Site-wide behaviour + navigation source of truth
├── style.css                        # Site-wide styles
├── LICENSE                          # MIT
└── README.md
```

---

## Running locally

Because pages are fetched over `fetch()` for AJAX navigation, opening the files directly
via `file://` will break in-site navigation. Serve the folder over HTTP instead:

```bash
git clone https://github.com/sachi5908/FracSTAT_Documentation.git
cd FracSTAT_Documentation
python -m http.server 8000
```

Then open http://localhost:8000/ (landing page) or
http://localhost:8000/introduction.html (docs entry point).

---

## How the navigation works

Two ordered lists near the top of `script.js` are the single source of truth for site
navigation. **Do not hard-code sidebar links or Previous/Next buttons inside individual
HTML pages** — they are generated at runtime.

- **`SIDEBAR_SECTIONS`** — the grouped, collapsible sidebar. Every page ships an empty
  `<aside class="docs-sidebar" id="docsSidebar"></aside>`; `renderSidebar()` fills it and
  marks the current page active.
- **`PAGE_ORDER`** — the flat, linear reading order used by the Previous/Next buttons.
  `renderPaginationNav()` appends or updates a `.pagination-nav` block at the bottom of
  `.docs-content-inner`. A page absent from `PAGE_ORDER` (such as `admin.html`) is skipped
  rather than guessed at.
- **`SIDEBAR_FOOTER_LINKS`** — the small plain-text legal links below the sidebar
  accordion.

`loadPage()` implements the AJAX router: it fetches the target page, swaps only
`.docs-content-inner`, updates history via `pushState`, then re-runs
`initDynamicBehaviors()`. This is why page-specific JavaScript must live in `script.js`
and be invoked from `initDynamicBehaviors()` — an inline `<script>` inside a page body
runs only on a hard load and silently stops working after an AJAX navigation.

---

## Related repositories

| Repository | Contents |
| --- | --- |
| [FracSTAT](https://github.com/sachi5908/FracSTAT) | The application — `main.py`, `launcher.py`, `core/`, `static_analyzer/`, `dynamic_analyzer/`, `uncertainty_analyzer/`, `ui_common/`, `pages/` |
| [FracSTAT_Documentation](https://github.com/sachi5908/FracSTAT_Documentation) | This documentation website |
| [FracSTAT_Presentation](https://sachi5908.github.io/FracSTAT_Presentation/) | Project presentation slides |

The application requires Python 3.10 or newer and is built on PySide6, matplotlib, NumPy,
pandas, SciPy, PyKrige, powerlaw, OpenCV, Pillow, CairoSVG, svgpathtools, ReportLab,
python-docx, and openpyxl. See `requirements.txt` in the application repository for the
pinned floors and the versions each release was verified against.

---

## Authors

- **Sachida Nanda Mahanta** — Department of Applied Geology, Dr. Harisingh Gour Vishwavidyalaya, Sagar, India
- **Priyadarshi Chinmoy Kumar** — Wadia Institute of Himalayan Geology, Dehradun, India
- **Eshan Srivastava** — Department of Earth and Marine Sciences, University of Palermo, Italy
- **Jitender Kumar** — Wadia Institute of Himalayan Geology, Dehradun, India
- **Giuseppe Francesco Rizzo** — University of Palermo, Italy / Department of Earth Science and Geo-Environment, University of Bari, Italy
- **Maurizio Gasparo Morticelli** — University of Palermo, Italy / Istituto Nazionale di Geofisica e Vulcanologia, Rome, Italy
- **Attilio Sulli** — University of Palermo, Italy / Istituto Nazionale di Geofisica e Vulcanologia, Rome, Italy
- **Kalachand Sain** — CSIR-National Geophysical Research Institute, Hyderabad, India

Contact addresses are listed on [contact.html](contact.html).

---

## Citation

If FracSTAT or this documentation supports your research, please cite the corresponding
FracSTAT publication or software release. Citation details accompany the relevant release
in the [application repository](https://github.com/sachi5908/FracSTAT).

---

## License

Released under the MIT License — see [LICENSE](LICENSE) for the full text, and
[license.html](license.html) for the same terms alongside notes on third-party dependency
licenses.

© 2026 FracSTAT Project.
