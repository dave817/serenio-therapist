/* =========================================================================
   Serenio — site engine: i18n, language switch, nav, reveals, contact form.
   Vanilla, no dependencies. Progressive: every page is complete English HTML;
   JS only localizes, animates and wires interaction.

   i18n model: the English in the markup IS the English source. Translation
   files (js/i18n/*.js) push { "zh-Hant": {...}, ja: {...}, ko: {...} } parts
   onto window.SERENIO_I18N_PARTS; `en` entries exist only for strings that
   are created by script (form errors, the iPhone CTA label).
   ========================================================================= */
(function () {
  "use strict";

  // `store` is an App Store storefront where Serenio is listed: the
  // region-less URL falls back to the US store, which does not carry it.
  var LANGS = [
    { code: "en", label: "English", short: "EN", badge: "en-us", store: "au" },
    { code: "zh-Hant", label: "繁體中文", short: "繁", badge: "zh-hk", store: "hk" },
    { code: "ja", label: "日本語", short: "日", badge: "ja-jp", store: "jp" },
    { code: "ko", label: "한국어", short: "한", badge: "ko-kr", store: "kr" },
  ];
  var STORE_KEY = "serenio.lang";
  function appStoreUrl(lang) {
    return "https://apps.apple.com/" + meta(lang).store + "/app/serenio/id6786770984";
  }
  var I18N = mergeParts(window.SERENIO_I18N_PARTS || []);
  var SOURCES = new WeakMap();

  /* ---- dictionary ------------------------------------------------------ */
  function mergeParts(parts) {
    return parts.reduce(function (acc, part) {
      var next = Object.assign({}, acc);
      Object.keys(part).forEach(function (lang) {
        next[lang] = Object.assign({}, acc[lang], part[lang]);
      });
      return next;
    }, {});
  }
  function known(code) {
    return LANGS.some(function (l) {
      return l.code === code;
    });
  }
  function meta(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i];
    return LANGS[0];
  }
  function detectLang() {
    var saved = null;
    try {
      saved = localStorage.getItem(STORE_KEY);
    } catch (storageBlocked) {
      saved = null; // blocked site data: use the browser language instead
    }
    if (saved && known(saved)) return saved;
    var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || "en").toLowerCase();
    if (nav.indexOf("zh") === 0) return "zh-Hant";
    if (nav.indexOf("ja") === 0) return "ja";
    if (nav.indexOf("ko") === 0) return "ko";
    return "en";
  }

  /** Script-created strings: the language's entry, else the English entry. */
  function t(key, lang) {
    var d = I18N[lang];
    if (d && d[key] != null) return d[key];
    if (I18N.en && I18N.en[key] != null) return I18N.en[key];
    return key;
  }

  /** Markup strings: the translation, else the English written in the page. */
  function localized(key, lang, source) {
    if (lang !== "en") {
      var d = I18N[lang];
      if (d && d[key] != null) return d[key];
    }
    if (source != null) return source;
    return t(key, lang);
  }

  /** Remember an element's original (English) value once, per kind. */
  function sourceOf(el, kind, current) {
    var record = SOURCES.get(el) || {};
    if (Object.prototype.hasOwnProperty.call(record, kind)) return record[kind];
    var next = Object.assign({}, record);
    next[kind] = current;
    SOURCES.set(el, next);
    return current;
  }

  var currentLang = detectLang();

  /* ---- apply translations -------------------------------------------- */
  function applyLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;

    each("[data-i18n]", function (el) {
      var src = sourceOf(el, "text", el.textContent);
      el.textContent = localized(el.getAttribute("data-i18n"), lang, src);
    });
    each("[data-i18n-html]", function (el) {
      var src = sourceOf(el, "html", el.innerHTML);
      el.innerHTML = localized(el.getAttribute("data-i18n-html"), lang, src);
    });
    each("[data-i18n-ph]", function (el) {
      var src = sourceOf(el, "ph", el.getAttribute("placeholder"));
      el.setAttribute("placeholder", localized(el.getAttribute("data-i18n-ph"), lang, src));
    });
    each("[data-i18n-aria]", function (el) {
      var src = sourceOf(el, "aria", el.getAttribute("aria-label"));
      el.setAttribute("aria-label", localized(el.getAttribute("data-i18n-aria"), lang, src));
    });
    each("[data-i18n-alt]", function (el) {
      var src = sourceOf(el, "alt", el.getAttribute("alt"));
      el.setAttribute("alt", localized(el.getAttribute("data-i18n-alt"), lang, src));
    });

    var root = document.documentElement;
    var titleKey = root.getAttribute("data-page-title");
    if (titleKey) document.title = localized(titleKey, lang, sourceOf(root, "title", document.title));
    var desc = document.querySelector('meta[name="description"]');
    var descKey = root.getAttribute("data-page-desc");
    if (desc && descKey) {
      desc.setAttribute("content", localized(descKey, lang, sourceOf(desc, "content", desc.getAttribute("content"))));
    }

    applyStore(lang);
    applyFilmTracks(lang);
    applyRichBlocks(lang);
    updateSwitcher(lang);
    syncNavLabel();
  }

  // Only an explicit choice is remembered, so a visitor whose browser
  // language changes later still gets the new default.
  function rememberLang(lang) {
    try {
      localStorage.setItem(STORE_KEY, lang);
    } catch (storageBlocked) {
      // Nothing to persist to; the choice still applies for this page view.
    }
  }

  // Apple's official badge artwork and a storefront that lists the app,
  // both matched to the language.
  function applyStore(lang) {
    var file = "/images/badges/app-store-" + meta(lang).badge + ".svg";
    each("[data-store-badge]", function (img) {
      if (img.getAttribute("src") !== file) img.setAttribute("src", file);
    });
    var url = appStoreUrl(lang);
    each("[data-store-link]", function (a) {
      a.setAttribute("href", url);
    });
  }

  // The film is narrated in English: show subtitles in the page language,
  // and leave English captions available (off by default) in the player.
  function applyFilmTracks(lang) {
    each("video[data-film]", function (video) {
      forEach(video.textTracks, function (track) {
        track.mode = lang !== "en" && track.language === lang ? "showing" : "disabled";
      });
    });
  }

  // Legal prose: groups of [data-lang] blocks. Show the active language, or
  // fall back to the English block when that language is not authored.
  function applyRichBlocks(lang) {
    each("[data-i18n-rich]", function (group) {
      var kids = group.querySelectorAll("[data-lang]");
      var shown = false;
      forEach(kids, function (k) {
        var match = k.getAttribute("data-lang") === lang;
        k.hidden = !match;
        if (match) shown = true;
      });
      if (!shown)
        forEach(kids, function (k) {
          k.hidden = k.getAttribute("data-lang") !== "en";
        });
    });
  }

  /* ---- language switcher --------------------------------------------- */
  function buildSwitcher() {
    var root = document.querySelector("[data-lang-switch]");
    if (!root) return;
    var menu = root.querySelector(".lang__menu");
    var trigger = root.querySelector(".lang__btn");
    if (!menu || !trigger) return;

    menu.innerHTML = "";
    LANGS.forEach(function (l) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lang__opt";
      b.setAttribute("lang", l.code);
      b.setAttribute("data-lang-code", l.code);
      b.textContent = l.label;
      b.addEventListener("click", function () {
        applyLang(l.code);
        rememberLang(l.code);
        setOpen(root, false);
        trigger.focus();
      });
      li.appendChild(b);
      menu.appendChild(li);
    });

    setOpen(root, false);
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(root, root.getAttribute("data-open") !== "true");
    });
    document.addEventListener("click", function (e) {
      if (!root.contains(e.target)) setOpen(root, false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.getAttribute("data-open") === "true") {
        setOpen(root, false);
        trigger.focus();
      }
    });
  }
  function setOpen(root, open) {
    root.setAttribute("data-open", open ? "true" : "false");
    var trigger = root.querySelector(".lang__btn");
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
    // Unfocusable as soon as it closes, even while it fades out.
    var menu = root.querySelector(".lang__menu");
    if (menu) menu.inert = !open;
  }
  function updateSwitcher(lang) {
    var root = document.querySelector("[data-lang-switch]");
    if (!root) return;
    var short = root.querySelector(".lang__short");
    if (short) short.textContent = meta(lang).short;
    forEach(root.querySelectorAll(".lang__opt"), function (opt) {
      opt.setAttribute("aria-current", opt.getAttribute("data-lang-code") === lang ? "true" : "false");
    });
  }

  /* ---- mobile nav ----------------------------------------------------- */
  function navIsOpen() {
    return document.body.getAttribute("data-nav-open") === "true";
  }
  // The toggle's label follows its state ("Menu" / "Close menu").
  function syncNavLabel() {
    var toggle = document.querySelector("[data-nav-toggle]");
    if (toggle) toggle.setAttribute("aria-label", t(navIsOpen() ? "nav.close" : "nav.menu", currentLang));
  }
  function initNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    if (!toggle) return;
    function setNav(open) {
      document.body.setAttribute("data-nav-open", open ? "true" : "false");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      // While the drawer covers the page, keep keyboard focus out of it.
      each("main, footer", function (region) {
        if (open) region.setAttribute("inert", "");
        else region.removeAttribute("inert");
      });
      syncNavLabel();
      if (open) {
        var first = document.querySelector(".nav__drawer a");
        if (first) first.focus();
      }
    }
    toggle.addEventListener("click", function () {
      setNav(!navIsOpen());
    });
    // The skip link must reach <main>, which is inert while the drawer is open.
    each(".skip-link", function (a) {
      a.addEventListener("click", function () {
        if (navIsOpen()) setNav(false);
      });
    });
    each(".nav__drawer a", function (a) {
      a.addEventListener("click", function () {
        setNav(false);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navIsOpen()) {
        setNav(false);
        toggle.focus();
      }
    });
    // Growing past the mobile breakpoint closes the drawer (and un-inerts).
    var wide = window.matchMedia("(min-width: 961px)");
    var onWide = function (mq) {
      if (mq.matches && navIsOpen()) setNav(false);
    };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
  }

  /* ---- active nav link ------------------------------------------------ */
  function markActiveNav() {
    var path = location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
    each("[data-route]", function (a) {
      if (a.getAttribute("data-route") === path) a.setAttribute("aria-current", "page");
    });
  }

  /* ---- iPhone visitors: the primary CTA becomes the App Store --------- */
  function isAppleMobile() {
    var ua = navigator.userAgent || "";
    var iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return /iPhone|iPad|iPod/.test(ua) || iPadOS;
  }
  function initSmartCta() {
    if (!isAppleMobile()) return;
    each("[data-smart-cta]", function (a) {
      a.setAttribute("href", appStoreUrl(currentLang));
      a.setAttribute("data-store-link", "");
      a.setAttribute("data-i18n", "cta.getApp");
      a.setAttribute("data-track", "app_store");
      a.textContent = t("cta.getApp", "en"); // becomes the English source
    });
  }

  /* ---- outbound CTA analytics (only when analytics loaded) ------------ */
  function initTracking() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest("[data-track]") : null;
      if (!link || typeof window.gtag !== "function") return;
      window.gtag("event", "cta_click", {
        cta: link.getAttribute("data-track"),
        page: location.pathname,
      });
    });
  }

  /* ---- footer year ----------------------------------------------------- */
  function initYear() {
    var year = String(new Date().getFullYear());
    each("[data-year]", function (el) {
      el.textContent = year;
    });
  }

  /* ---- scroll reveal -------------------------------------------------- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      forEach(els, function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    forEach(els, function (el) {
      io.observe(el);
    });
  }

  /* ---- contact form --------------------------------------------------- */
  function initForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;
    var status = form.querySelector(".form__status");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements["name"];
      var email = form.elements["email"];
      var message = form.elements["message"];
      var ok = true;

      ok = validate(name, name.value.trim().length > 0, "form.err.name") && ok;
      ok = validate(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()), "form.err.email") && ok;
      ok = validate(message, message.value.trim().length > 1, "form.err.msg") && ok;

      if (!ok) {
        var firstErr = form.querySelector(".field--error input, .field--error textarea");
        if (firstErr) firstErr.focus();
        return;
      }

      var subject = "Serenio enquiry from " + name.value.trim();
      var body = message.value.trim() + "\n\n— " + name.value.trim() + "\n" + email.value.trim();
      window.location.href =
        "mailto:support@serenio.ai?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

      // Keep what they wrote: if no email app opens, they can copy it instead.
      if (status) showSent(status, subject + "\n\n" + body);
    });

    function showSent(status, text) {
      status.textContent = t("form.ok", currentLang);
      status.className = "form__status form__status--ok";
      var copy = document.createElement("button");
      copy.type = "button";
      copy.className = "btn btn--secondary btn--sm form__copy";
      copy.textContent = t("form.copy", currentLang);
      copy.addEventListener("click", function () {
        copyText(text).then(
          function () {
            copy.textContent = t("form.copied", currentLang);
          },
          function () {
            // Clipboard refused (permissions/insecure context): select the text instead.
            var field = form.elements["message"];
            field.focus();
            field.select();
          }
        );
      });
      status.appendChild(document.createTextNode(" "));
      status.appendChild(copy);
    }

    function validate(input, condition, errKey) {
      var field = input.closest(".field");
      var errEl = field ? field.querySelector(".field__error") : null;
      if (condition) {
        if (field) field.classList.remove("field--error");
        if (errEl) errEl.textContent = "";
        input.removeAttribute("aria-invalid");
        return true;
      }
      if (field) field.classList.add("field--error");
      if (errEl) errEl.textContent = t(errKey, currentLang);
      input.setAttribute("aria-invalid", "true");
      return false;
    }
  }

  /* ---- small helpers -------------------------------------------------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return Promise.reject(new Error("Clipboard API unavailable"));
  }
  function each(sel, fn) {
    forEach(document.querySelectorAll(sel), fn);
  }
  function forEach(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  /* ---- boot ----------------------------------------------------------- */
  function boot() {
    initSmartCta();
    buildSwitcher();
    initNav();
    markActiveNav();
    initYear();
    applyLang(currentLang);
    initReveal();
    initForm();
    initTracking();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
