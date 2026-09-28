/* =========================================================================
   Serenio — website analytics (Google Analytics 4), marketing site only.
   Not loaded at all when the browser sends Do Not Track or Global Privacy
   Control, which is what the Privacy Policy promises. The apps have none.
   ========================================================================= */
(function () {
  "use strict";
  var GA_ID = "G-G69RR3LCQG";
  var dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.msDoNotTrack === "1";
  var gpc = navigator.globalPrivacyControl === true;
  if (dnt || gpc) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  // Consent mode: advertising storage and signals are always off. In the EEA,
  // the UK and Switzerland analytics runs cookieless (no consent banner here),
  // so visits are counted without setting identifiers.
  var CONSENT_REGIONS = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT",
    "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "GB", "CH"];
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  window.gtag("consent", "default", { analytics_storage: "denied", region: CONSENT_REGIONS });
  window.gtag("set", "ads_data_redaction", true);
  window.gtag("js", new Date());
  // No Google Signals or ad personalisation: visits are counted, nothing more.
  window.gtag("config", GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(script);
})();
