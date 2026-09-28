/* =========================================================================
   Serenio — pre-paint bootstrap. Resolves the language before first paint so
   CJK readers get their own type settings immediately. External (not inline)
   so the Content-Security-Policy can forbid inline scripts.
   ========================================================================= */
(function () {
  var KNOWN = { en: true, "zh-Hant": true, ja: true, ko: true };
  var saved = null;
  try {
    saved = localStorage.getItem("serenio.lang");
  } catch (storageBlocked) {
    // Private mode or blocked site data: fall through to the browser language.
    saved = null;
  }
  var lang = saved && KNOWN[saved] ? saved : null;
  if (!lang) {
    var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || "en").toLowerCase();
    lang = nav.indexOf("zh") === 0 ? "zh-Hant" : nav.indexOf("ja") === 0 ? "ja" : nav.indexOf("ko") === 0 ? "ko" : "en";
  }
  document.documentElement.classList.add("js");
  document.documentElement.lang = lang;
})();
