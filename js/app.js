/* =========================================================================
   Serenio — site engine: i18n, language switch, nav, reveals, contact form.
   Vanilla, no dependencies. Progressive: content is in the markup; JS only
   localizes, animates, and wires interaction.
   ========================================================================= */
(function () {
  "use strict";

  var I18N = window.SERENIO_I18N || {};
  var LANGS = [
    { code: "en", label: "English", short: "EN", html: "en" },
    { code: "zh-Hant", label: "繁體中文", short: "繁中", html: "zh-Hant" },
    { code: "ja", label: "日本語", short: "日本語", html: "ja" },
    { code: "ko", label: "한국어", short: "한국어", html: "ko" },
  ];
  var STORE_KEY = "serenio.lang";

  /* ---- language resolution ------------------------------------------- */
  function known(code) {
    return LANGS.some(function (l) {
      return l.code === code;
    });
  }
  function detectLang() {
    var saved;
    try {
      saved = localStorage.getItem(STORE_KEY);
    } catch (e) {
      saved = null;
    }
    if (saved && known(saved)) return saved;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    var l = nav.toLowerCase();
    if (l.indexOf("zh") === 0) return "zh-Hant";
    if (l.indexOf("ja") === 0) return "ja";
    if (l.indexOf("ko") === 0) return "ko";
    return "en";
  }
  function t(key, lang) {
    var d = I18N[lang];
    if (d && d[key] != null) return d[key];
    if (I18N.en && I18N.en[key] != null) return I18N.en[key];
    return key;
  }
  function meta(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i];
    return LANGS[0];
  }

  var currentLang = detectLang();

  /* ---- apply translations -------------------------------------------- */
  function applyLang(lang) {
    currentLang = lang;
    var m = meta(lang);
    document.documentElement.lang = m.html;

    each("[data-i18n]", function (el) {
      el.textContent = t(el.getAttribute("data-i18n"), lang);
    });
    each("[data-i18n-html]", function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"), lang);
    });
    each("[data-i18n-ph]", function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"), lang));
    });
    each("[data-i18n-aria]", function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"), lang));
    });

    var pageTitleKey = document.documentElement.getAttribute("data-page-title");
    if (pageTitleKey) document.title = t(pageTitleKey, lang);
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("meta.desc", lang));

    applyRichBlocks(lang);
    updateSwitcher(lang);

    try {
      localStorage.setItem(STORE_KEY, lang);
    } catch (e) {}
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
    var btnShort = root.querySelector(".lang__short");
    var menu = root.querySelector(".lang__menu");
    if (!menu) return;

    menu.innerHTML = "";
    LANGS.forEach(function (l) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lang__opt";
      b.setAttribute("lang", l.html);
      b.textContent = l.label;
      b.addEventListener("click", function () {
        applyLang(l.code);
        setOpen(root, false);
        var trigger = root.querySelector(".lang__btn");
        if (trigger) trigger.focus();
      });
      li.appendChild(b);
      menu.appendChild(li);
    });

    var trigger = root.querySelector(".lang__btn");
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(root, root.getAttribute("data-open") !== "true");
    });
    document.addEventListener("click", function (e) {
      if (!root.contains(e.target)) setOpen(root, false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(root, false);
    });

    if (btnShort) root.__short = btnShort;
  }
  function setOpen(root, open) {
    root.setAttribute("data-open", open ? "true" : "false");
    var trigger = root.querySelector(".lang__btn");
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function updateSwitcher(lang) {
    var root = document.querySelector("[data-lang-switch]");
    if (!root) return;
    var m = meta(lang);
    var short = root.querySelector(".lang__short");
    if (short) short.textContent = m.short;
    forEach(root.querySelectorAll(".lang__opt"), function (opt) {
      var on = opt.getAttribute("lang") === m.html;
      opt.setAttribute("aria-current", on ? "true" : "false");
    });
  }

  /* ---- mobile nav ----------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var open = document.body.getAttribute("data-nav-open") === "true";
      document.body.setAttribute("data-nav-open", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
    });
    each(".nav__drawer a", function (a) {
      a.addEventListener("click", function () {
        document.body.setAttribute("data-nav-open", "false");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- active nav link ------------------------------------------------ */
  function markActiveNav() {
    var path = location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
    each("[data-route]", function (a) {
      var route = a.getAttribute("data-route");
      if (route === path) a.setAttribute("aria-current", "page");
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
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
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
      var body =
        message.value.trim() +
        "\n\n— " +
        name.value.trim() +
        "\n" +
        email.value.trim();
      window.location.href =
        "mailto:support@serenio.ai?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      if (status) {
        status.textContent = t("form.ok", currentLang);
        status.className = "form__status form__status--ok";
      }
      form.reset();
    });

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
  function each(sel, fn) {
    forEach(document.querySelectorAll(sel), fn);
  }
  function forEach(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  /* ---- boot ----------------------------------------------------------- */
  function boot() {
    buildSwitcher();
    initNav();
    markActiveNav();
    applyLang(currentLang);
    initReveal();
    initForm();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
