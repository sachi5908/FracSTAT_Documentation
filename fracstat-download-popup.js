window.FracSTATDownloadPopup = (function () {
    "use strict";

    const CONFIG = window.FRACSTAT_CONFIG || {};
    const REG = CONFIG.registration || {};
    const MODAL_ID = "fracstatDownloadModal";
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PRE_REGISTERING = CONFIG.preRegistrationOnly !== false;

    const DEFAULTS = {
        title: REG.title || (PRE_REGISTERING ? "Pre-register for FracSTAT" : "Register to download FracSTAT"),
        subtitle: REG.subtitle || (PRE_REGISTERING
            ? "FracSTAT v1.0.0 is in final preparation and the download link is coming soon. " +
              "Pre-register now and we will email you the link as soon as it is available."
            : "Tell us who is using FracSTAT. This helps the project report " +
              "where the software is being applied — it takes ten seconds."),
        badge: REG.badge || ("FracSTAT " + (CONFIG.downloadVersion || "v1.0.0")),
        submitLabel: REG.submitLabel || (PRE_REGISTERING ? "Pre-register" : "Register & download"),
        note: REG.note || "Your details are used only for download statistics and to send you the " +
            "download link. They are never sold or shared.",
        successTitle: REG.successTitle || (PRE_REGISTERING
            ? "Thank you — you are pre-registered"
            : "Thank you — your download is starting"),
        emptyLinkText: REG.emptyLinkText || "The download link is coming soon — it has not been " +
            "published yet. Your pre-registration is saved and the link will be emailed to {email} " +
            "as soon as FracSTAT v1.0.0 is released.",
        requireInstitution: CONFIG.requireInstitution !== false,
        requireConsent: REG.requireConsent !== false,
        consentText: REG.consentText ||
            'I agree that these details may be stored to produce anonymous download statistics ' +
            'and used to email me the download link, as described in the ' +
            '<a href="privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a>.',
        privacyUrl: REG.privacyUrl || "privacy-policy.html",
        closeOnBackdrop: REG.closeOnBackdrop !== false,
        onOpen: null,
        onClose: null,
        onSuccess: null,
        onError: null
    };

    const FIELD_ORDER = ["name", "email", "institution", "position", "country"];

    const FIELD_LABELS = {
        name: "Full name",
        email: "Email address",
        institution: "Institution / Organisation",
        position: "Position",
        country: "Country"
    };

    const FIELD_HINTS = {
        email: PRE_REGISTERING
            ? "The download link will be emailed here as soon as the release is available."
            : "Used only if the project needs to contact you about the release.",
        institution: "University, research institute, company or department.",
        country: "Pre-filled from your connection — please correct it if needed."
    };

    const FIELD_PLACEHOLDERS = {
        name: "e.g. A. Mehta",
        email: "name@example.edu",
        institution: "e.g. Sagar University",
        country: "Select your country"
    };

    const state = {
        options: null,
        modal: null,
        dialog: null,
        form: null,
        success: null,
        status: null,
        submitBtn: null,
        fields: {},
        errors: {},
        lastFocused: null,
        open: false,
        submitting: false,
        countriesLoaded: false,
        detectedCountry: "",
        lastEntry: null,
        bound: false,
        keyHandler: null
    };

    function options() {
        if (!state.options) state.options = Object.assign({}, DEFAULTS);
        return state.options;
    }

    function stats() {
        return window.FracSTATStats || null;
    }

    function resolveElement(target) {
        if (!target) return null;
        if (typeof target === "string") return document.querySelector(target);
        return target.nodeType === 1 ? target : null;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
        });
    }

    function downloadUrl() {
        // Pre-registration only: nothing is published yet, so no link is ever
        // handed out — checked before both fallbacks, because the statistics
        // sheet and the published snapshot may still carry an old URL and a
        // visitor must never be sent to a file that does not exist.
        if (CONFIG.preRegistrationOnly) return "";

        const configured = String(CONFIG.downloadUrl || "").trim();
        if (configured) return configured;
        // A link published by the admin panel inside the statistics JSON.
        const api = stats();
        if (api && typeof api.getStore === "function") {
            const store = api.getStore();
            return String((store.download && store.download.url) || "").trim();
        }
        return "";
    }

    function isSameOrigin(url) {
        try {
            return new URL(url, window.location.href).origin === window.location.origin;
        } catch (err) {
            return true;
        }
    }

    // ---------------------------------------------------------------------
    // Modal markup (built once, lazily, on first open)
    // ---------------------------------------------------------------------
    function makeInput(key, type, autocomplete) {
        const input = document.createElement("input");
        input.type = type;
        input.id = "fracstatField" + key.charAt(0).toUpperCase() + key.slice(1);
        input.name = key;
        input.className = "fs-input";
        if (autocomplete) input.autocomplete = autocomplete;
        if (type === "email") input.inputMode = "email";
        if (FIELD_PLACEHOLDERS[key]) input.placeholder = FIELD_PLACEHOLDERS[key];
        return input;
    }

    function makeSelect(key) {
        const select = document.createElement("select");
        select.id = "fracstatField" + key.charAt(0).toUpperCase() + key.slice(1);
        select.name = key;
        select.className = "fs-input";
        return select;
    }

    function createField(key, control, required) {
        const wrap = document.createElement("div");
        wrap.className = "fs-field";
        wrap.setAttribute("data-field", key);

        const describedBy = [];

        const label = document.createElement("label");
        label.className = "fs-field-label";
        label.setAttribute("for", control.id);
        label.innerHTML = escapeHtml(FIELD_LABELS[key]) +
            (required ? ' <span class="fs-req" aria-hidden="true">*</span>'
                      : ' <span class="fs-optional">optional</span>');

        wrap.appendChild(label);
        wrap.appendChild(control);

        if (FIELD_HINTS[key]) {
            const hint = document.createElement("p");
            hint.className = "fs-field-hint";
            hint.id = control.id + "Hint";
            hint.textContent = FIELD_HINTS[key];
            wrap.appendChild(hint);
            describedBy.push(hint.id);
        }

        const error = document.createElement("p");
        error.className = "fs-field-error";
        error.id = control.id + "Error";
        error.setAttribute("role", "alert");
        wrap.appendChild(error);
        describedBy.push(error.id);

        control.setAttribute("aria-describedby", describedBy.join(" "));
        control.required = required;

        state.fields[key] = control;
        state.errors[key] = error;
        return wrap;
    }

    function buildFields(fieldsRoot) {
        const opts = options();

        fieldsRoot.appendChild(createField("name", makeInput("name", "text", "name"), true));
        fieldsRoot.appendChild(createField("email", makeInput("email", "email", "email"), true));

        // Institution — mandatory unless the project turns it off.
        const institution = makeInput("institution", "text", "organization");
        fieldsRoot.appendChild(createField("institution", institution, opts.requireInstitution));

        // Position — a fixed list keeps the statistics comparable.
        const position = makeSelect("position");
        const positionPlaceholder = document.createElement("option");
        positionPlaceholder.value = "";
        positionPlaceholder.textContent = "Select your position";
        position.appendChild(positionPlaceholder);
        (CONFIG.positions || ["Student", "Researcher", "Professor", "Industry Professional", "Other"])
            .forEach(function (item) {
                const option = document.createElement("option");
                option.value = item;
                option.textContent = item;
                position.appendChild(option);
            });
        fieldsRoot.appendChild(createField("position", position, true));

        // Country — filled from the outline file's country list.
        const country = makeSelect("country");
        const countryPlaceholder = document.createElement("option");
        countryPlaceholder.value = "";
        countryPlaceholder.textContent = "Detecting your country…";
        country.appendChild(countryPlaceholder);
        fieldsRoot.appendChild(createField("country", country, true));

        // Consent.
        const consentWrap = document.createElement("div");
        consentWrap.className = "fs-field fs-field-consent";

        const consentLabel = document.createElement("label");
        consentLabel.className = "fs-consent";
        consentLabel.setAttribute("for", "fracstatFieldConsent");

        const consent = document.createElement("input");
        consent.type = "checkbox";
        consent.id = "fracstatFieldConsent";
        consent.name = "consent";

        const consentCopy = document.createElement("span");
        consentCopy.innerHTML = opts.consentText;

        consentLabel.appendChild(consent);
        consentLabel.appendChild(consentCopy);
        consentWrap.appendChild(consentLabel);

        const consentError = document.createElement("p");
        consentError.className = "fs-field-error";
        consentError.setAttribute("role", "alert");
        consentWrap.appendChild(consentError);

        fieldsRoot.appendChild(consentWrap);
        state.fields.consent = consent;
        state.errors.consent = consentError;
    }

    function setStatus(message, tone) {
        if (!state.status) return;
        state.status.textContent = message || "";
        state.status.className = "fs-form-status" + (tone ? " is-" + tone : "");
        state.status.hidden = !message;
    }

    function buildSuccessPanel(dialog) {
        const success = document.createElement("div");
        success.className = "fs-success";
        success.hidden = true;

        const mark = document.createElement("div");
        mark.className = "fs-success-mark";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = "✓";

        const title = document.createElement("h4");
        title.className = "fs-success-title";

        const message = document.createElement("p");
        message.className = "fs-success-message";

        const summary = document.createElement("dl");
        summary.className = "fs-success-summary";

        const actions = document.createElement("div");
        actions.className = "fs-success-actions";

        [mark, title, message, summary, actions].forEach(function (node) {
            success.appendChild(node);
        });

        dialog.appendChild(success);

        state.success = success;
        state.successTitle = title;
        state.successMessage = message;
        state.successSummary = summary;
        state.successActions = actions;
        return success;
    }

    function buildModal() {
        if (state.modal) return state.modal;
        const opts = options();

        const modal = document.createElement("div");
        modal.className = "fs-modal";
        modal.id = MODAL_ID;
        modal.hidden = true;

        const backdrop = document.createElement("div");
        backdrop.className = "fs-modal-backdrop";
        backdrop.setAttribute("data-fs-close", "");
        modal.appendChild(backdrop);

        const dialog = document.createElement("div");
        dialog.className = "fs-modal-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "fracstatModalTitle");
        modal.appendChild(dialog);

        // Named closeBtn, never "close": a local called `close` shadows the
        // close() function below, and the delegated handler underneath then
        // calls the button element instead of closing the modal.
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "fs-modal-close";
        closeBtn.setAttribute("data-fs-close", "");
        closeBtn.setAttribute("aria-label", "Close the registration form");
        closeBtn.innerHTML = "&times;";
        dialog.appendChild(closeBtn);

        const form = document.createElement("form");
        form.className = "fs-form";
        form.noValidate = true;

        const head = document.createElement("div");
        head.className = "fs-form-head";
        head.innerHTML =
            '<span class="fs-form-badge">' + escapeHtml(opts.badge) + "</span>" +
            '<h3 id="fracstatModalTitle">' + escapeHtml(opts.title) + "</h3>" +
            "<p>" + escapeHtml(opts.subtitle) + "</p>";
        form.appendChild(head);

        const fieldsRoot = document.createElement("div");
        fieldsRoot.className = "fs-fields";
        buildFields(fieldsRoot);
        form.appendChild(fieldsRoot);

        state.status = document.createElement("p");
        state.status.className = "fs-form-status";
        state.status.setAttribute("role", "status");
        state.status.setAttribute("aria-live", "polite");
        state.status.hidden = true;
        form.appendChild(state.status);

        const foot = document.createElement("div");
        foot.className = "fs-form-foot";

        const note = document.createElement("p");
        note.className = "fs-form-note";
        note.innerHTML = escapeHtml(opts.note) + ' <a href="' + escapeHtml(opts.privacyUrl) +
            '" target="_blank" rel="noopener">Privacy Policy</a>';

        const submit = document.createElement("button");
        submit.type = "submit";
        submit.className = "fs-submit";
        submit.textContent = opts.submitLabel;

        foot.appendChild(note);
        foot.appendChild(submit);
        form.appendChild(foot);

        form.addEventListener("submit", handleSubmit);

        // Clear a field's error as soon as the visitor starts fixing it.
        form.addEventListener("input", function (evt) {
            const field = evt.target;
            if (!field || !field.name) return;
            if (state.errors[field.name] && !state.errors[field.name].textContent) return;
            if (state.errors[field.name]) {
                state.errors[field.name].textContent = "";
                field.setAttribute("aria-invalid", "false");
                const wrap = field.closest(".fs-field");
                if (wrap) wrap.classList.remove("has-error");
            }
        });

        dialog.appendChild(form);
        dialog.appendChild(buildSuccessPanel(dialog));

        modal.addEventListener("click", function (evt) {
            if (evt.target.closest("[data-fs-close]")) {
                if (evt.target.classList.contains("fs-modal-backdrop") && !options().closeOnBackdrop) return;
                evt.preventDefault();
                close();
            }
        });

        document.body.appendChild(modal);

        state.modal = modal;
        state.dialog = dialog;
        state.form = form;
        state.submitBtn = submit;
        return modal;
    }

    // ---------------------------------------------------------------------
    // Country field: options from the outline file, pre-filled by IP lookup
    // ---------------------------------------------------------------------
    let countriesPromise = null;

    function currentCountryValue() {
        const field = state.fields.country;
        return field ? String(field.value || "").trim() : "";
    }

    function fillCountryOptions(preferred) {
        const select = state.fields.country;
        if (!select || select.tagName !== "SELECT") return;

        const names = state.countryNames || [];
        select.innerHTML = "";

        const blank = document.createElement("option");
        blank.value = "";
        blank.textContent = "Select your country";
        select.appendChild(blank);

        names.forEach(function (item) {
            const option = document.createElement("option");
            option.value = item.value;
            option.textContent = item.label;
            select.appendChild(option);
        });

        if (preferred) {
            const known = names.some(function (item) { return item.value === preferred; });
            if (!known) {
                // Never lose a detected country that has no outline on the map.
                const extra = document.createElement("option");
                extra.value = preferred;
                extra.textContent = preferred;
                select.insertBefore(extra, select.options[1] || null);
            }
            select.value = preferred;
        }
    }

    // Used when the outline file (and therefore the country list) cannot load:
    // the visitor types a country instead of choosing one.
    function fallbackCountryInput(reason) {
        const select = state.fields.country;
        if (!select || select.tagName !== "SELECT") return;

        const input = makeInput("country", "text", "country-name");
        input.placeholder = "Type your country";

        const errorNode = state.errors.country;
        errorNode.id = input.id + "Error";

        const describedBy = [];
        const hint = document.getElementById(select.id + "Hint");
        if (hint) describedBy.push(hint.id);
        describedBy.push(errorNode.id);
        input.setAttribute("aria-describedby", describedBy.join(" "));

        if (select.parentNode) select.parentNode.replaceChild(input, select);
        state.fields.country = input;
        if (reason) setStatus(reason);
    }

    function ensureCountries() {
        if (countriesPromise) return countriesPromise;
        const api = stats();
        if (!api || typeof api.loadCountryNames !== "function") {
            fallbackCountryInput();
            countriesPromise = Promise.resolve(false);
            return countriesPromise;
        }

        countriesPromise = api.loadCountryNames().then(function (names) {
            state.countryNames = names || [];
            state.countriesLoaded = true;
            fillCountryOptions(state.detectedCountry || currentCountryValue());
            return true;
        }, function () {
            fallbackCountryInput("The country list could not be loaded — please type your country.");
            return false;
        });
        return countriesPromise;
    }

    function detectVisitorCountry() {
        const api = stats();
        if (!api || typeof api.detectCountry !== "function") return Promise.resolve("");
        return api.detectCountry().then(function (name) {
            if (!name) return "";
            state.detectedCountry = name;
            if (!currentCountryValue()) fillCountryOptions(name);
            return name;
        }, function () {
            return "";
        });
    }

    // ---------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------
    function readForm() {
        const values = {};
        FIELD_ORDER.forEach(function (key) {
            const field = state.fields[key];
            values[key] = field ? String(field.value || "").trim() : "";
        });
        values.consent = !!(state.fields.consent && state.fields.consent.checked);
        return values;
    }

    function validate(values) {
        const opts = options();
        const errors = {};

        if (values.name.length < 2) errors.name = "Please enter your name.";
        if (!values.email) errors.email = "Please enter your email address.";
        else if (!EMAIL_RE.test(values.email)) errors.email = "That email address does not look complete.";
        if (opts.requireInstitution && !values.institution) {
            errors.institution = "Please enter your institution or organisation.";
        }
        if (!values.position) errors.position = "Please choose your position.";
        if (!values.country) errors.country = "Please choose your country.";
        if (opts.requireConsent && !values.consent) errors.consent = "Please confirm the statistics note to continue.";

        return errors;
    }

    function renderErrors(errors) {
        const keys = FIELD_ORDER.concat(["consent"]);
        keys.forEach(function (key) {
            const field = state.fields[key];
            const node = state.errors[key];
            const message = errors[key] || "";
            if (node) node.textContent = message;
            if (!field) return;
            field.setAttribute("aria-invalid", message ? "true" : "false");
            const wrap = field.closest(".fs-field");
            if (wrap) wrap.classList.toggle("has-error", !!message);
        });

        const firstKey = keys.find(function (key) { return errors[key]; });
        const firstField = firstKey && state.fields[firstKey];
        if (firstField && typeof firstField.focus === "function") firstField.focus();
    }

    // ---------------------------------------------------------------------
    // Submitting, success panel and the download itself
    // ---------------------------------------------------------------------
    function setBusy(busy) {
        if (state.submitBtn) {
            state.submitBtn.disabled = !!busy;
            state.submitBtn.classList.toggle("is-busy", !!busy);
            state.submitBtn.textContent = busy ? "Saving…" : options().submitLabel;
        }
        if (state.form) state.form.setAttribute("aria-busy", busy ? "true" : "false");
    }

    // The "link coming soon" copy names the address the download link will be sent
    // to, so the placeholder in FRACSTAT_CONFIG is filled in here. The message is
    // written with textContent, and a typed address is never treated as markup.
    function withEmail(text, email) {
        const address = String(email || "").trim();
        return String(text == null ? "" : text)
            .replace(/\{email\}/g, address || "the email address you gave us");
    }

    function summaryList(rows) {
        state.successSummary.innerHTML = "";
        rows.forEach(function (row) {
            if (!row[1]) return;
            const dt = document.createElement("dt");
            dt.textContent = row[0];
            const dd = document.createElement("dd");
            dd.textContent = row[1];
            state.successSummary.appendChild(dt);
            state.successSummary.appendChild(dd);
        });
        state.successSummary.hidden = !state.successSummary.childNodes.length;
    }

    function showSuccess(result, values) {
        const opts = options();
        const api = stats();
        const entry = (result && result.entry) || {};
        const link = downloadUrl();

        state.successTitle.textContent = opts.successTitle;

        let message = (result && result.message) || "";
        if (!link) {
            message = (message ? message + " " : "") +
                withEmail(opts.emptyLinkText, entry.email || values.email);
        }
        state.successMessage.textContent = message;

        const country = entry.country || values.country;
        summaryList([
            ["Name", entry.name || values.name],
            ["Institution", entry.institution || values.institution],
            ["Country", api && typeof api.label === "function" ? api.label(country) : country]
        ]);

        state.successActions.innerHTML = "";
        if (link) {
            const retry = document.createElement("a");
            retry.className = "fs-success-download";
            retry.href = link;
            retry.rel = "noopener";
            retry.target = "_blank";
            if (isSameOrigin(link) && CONFIG.downloadFileName) retry.download = CONFIG.downloadFileName;
            retry.textContent = "Download did not start? Click here";
            state.successActions.appendChild(retry);
        }

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "fs-success-close";
        closeBtn.textContent = "Close";
        closeBtn.addEventListener("click", function () { close(); });
        state.successActions.appendChild(closeBtn);

        if (state.form) state.form.hidden = true;
        state.success.hidden = false;
        setStatus("");
    }

    // Opens the installer without ever navigating away from the page. During
    // pre-registration this always returns false: there is no link to open.
    function triggerDownload() {
        const url = downloadUrl();
        if (!url) return false;

        const link = document.createElement("a");
        link.href = url;
        link.rel = "noopener";
        link.target = "_blank";
        link.style.display = "none";
        if (isSameOrigin(url) && CONFIG.downloadFileName) link.download = CONFIG.downloadFileName;

        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    }

    async function handleSubmit(evt) {
        evt.preventDefault();
        if (state.submitting) return;

        const opts = options();
        const values = readForm();
        const errors = validate(values);
        renderErrors(errors);

        if (Object.keys(errors).length) {
            setStatus("Please complete the highlighted fields.", "error");
            return;
        }

        state.submitting = true;
        setBusy(true);
        setStatus("Saving your registration…");

        const api = stats();
        let result = null;

        if (!api || typeof api.record !== "function") {
            // The statistics module is optional: a missing script must never
            // stop somebody from registering.
            result = {
                entry: values,
                synced: false,
                message: "Your registration has been saved."
            };
            if (typeof opts.onError === "function") opts.onError(new Error("FracSTATStats is not loaded"));
        } else {
            try {
                result = await api.record({
                    name: values.name,
                    email: values.email,
                    institution: values.institution,
                    position: values.position,
                    country: values.country,
                    countrySource: state.detectedCountry && state.detectedCountry === values.country
                        ? "detected" : "user"
                });
            } catch (err) {
                result = {
                    entry: values,
                    synced: false,
                    message: "Registered in this browser — the statistics server could not be reached."
                };
                if (typeof opts.onError === "function") opts.onError(err);
            }
        }

        state.submitting = false;
        setBusy(false);
        state.lastEntry = result;

        showSuccess(result, values);
        triggerDownload();
        if (typeof opts.onSuccess === "function") {
            try { opts.onSuccess(result); } catch (err) { /* never break the download */ }
        }
        return result;
    }

    // ---------------------------------------------------------------------
    // Opening, closing, focus handling
    // ---------------------------------------------------------------------
    function focusable() {
        if (!state.dialog) return [];
        const selector = 'a[href], button:not([disabled]), input:not([disabled]), ' +
            'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return Array.prototype.filter.call(state.dialog.querySelectorAll(selector), function (node) {
            return node.getClientRects().length > 0;
        });
    }

    function onKeydown(evt) {
        if (!state.open) return;

        if (evt.key === "Escape" || evt.keyCode === 27) {
            evt.preventDefault();
            close();
            return;
        }

        if (evt.key !== "Tab") return;

        const items = focusable();
        if (!items.length) return;

        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        const inside = state.dialog.contains(active);

        if (evt.shiftKey && (active === first || !inside)) {
            evt.preventDefault();
            last.focus();
        } else if (!evt.shiftKey && (active === last || !inside)) {
            evt.preventDefault();
            first.focus();
        }
    }

    function showFormView() {
        if (state.form) state.form.hidden = false;
        if (state.success) state.success.hidden = true;
        setStatus("");
    }

    function open(overrides) {
        if (overrides) Object.assign(options(), overrides);
        buildModal();

        // Re-opening after a registration asks again, keeping what was typed.
        showFormView();

        if (state.open) return state.modal;

        state.open = true;
        state.lastFocused = document.activeElement;
        state.modal.hidden = false;
        document.documentElement.classList.add("fs-modal-open");

        ensureCountries();
        detectVisitorCountry();

        if (!state.keyHandler) {
            state.keyHandler = onKeydown;
            document.addEventListener("keydown", state.keyHandler, true);
        }

        const target = state.fields.name || state.dialog;
        window.setTimeout(function () {
            if (state.open && target && typeof target.focus === "function" && target.getClientRects().length) {
                target.focus();
            }
        }, 30);

        if (typeof options().onOpen === "function") {
            try { options().onOpen(state.modal); } catch (err) { /* non-fatal */ }
        }
        return state.modal;
    }

    function close() {
        if (!state.open || !state.modal) return false;

        state.open = false;
        state.modal.hidden = true;
        document.documentElement.classList.remove("fs-modal-open");

        if (state.keyHandler) {
            document.removeEventListener("keydown", state.keyHandler, true);
            state.keyHandler = null;
        }

        const previous = state.lastFocused;
        state.lastFocused = null;
        if (previous && document.contains(previous) && typeof previous.focus === "function") {
            previous.focus();
        }

        if (typeof options().onClose === "function") {
            try { options().onClose(); } catch (err) { /* non-fatal */ }
        }
        return true;
    }

    function isOpen() {
        return state.open;
    }

    // Clears the form (used by the admin preview and by any page that wants a
    // fresh registration form).
    function reset() {
        FIELD_ORDER.forEach(function (key) {
            const field = state.fields[key];
            if (field) field.value = "";
        });
        if (state.fields.consent) state.fields.consent.checked = false;
        renderErrors({});
        showFormView();
        state.lastEntry = null;
        if (state.countryNames) fillCountryOptions(state.detectedCountry);
        return state.modal;
    }

    function openFromTrigger(el) {
        const opts = {};
        if (el && typeof el.getAttribute === "function") {
            const institution = el.getAttribute("data-fracstat-require-institution");
            if (institution != null) opts.requireInstitution = institution !== "false";

            const label = el.getAttribute("data-fracstat-submit-label");
            if (label) opts.submitLabel = label;
        }
        return open(opts);
    }

    // One delegated listener: any element carrying data-fracstat-download (or
    // the existing #downloadBtn) opens the popup, including elements added to
    // the page later.
    function bindTriggers(root) {
        const container = root && root.nodeType === 1 ? root : document;
        container.addEventListener("click", function (evt) {
            const target = evt.target;
            if (!target || typeof target.closest !== "function") return;

            const el = target.closest("[data-fracstat-download], #downloadBtn");
            if (!el) return;

            evt.preventDefault();
            openFromTrigger(el);
        });
    }

    function init(overrides) {
        if (overrides) Object.assign(options(), overrides);
        if (!state.bound) {
            state.bound = true;
            bindTriggers(document);
        }
        return api;
    }

    const api = {
        init: init,
        open: open,
        close: close,
        reset: reset,
        isOpen: isOpen,
        bindTrigger: bindTriggers,
        triggerDownload: triggerDownload,
        getDownloadUrl: downloadUrl,
        lastEntry: function () { return state.lastEntry; },
        options: options,
        defaults: DEFAULTS,
        fieldNames: FIELD_ORDER.slice()
    };

    // Self-setup: no markup is created on page load — the modal only appears
    // the first time a download is requested. Set
    // FRACSTAT_CONFIG.autoInitPopup = false to wire it up by hand instead.
    if (CONFIG.autoInitPopup !== false && typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () { init(); });
        } else {
            init();
        }
    }

    return api;
}());
