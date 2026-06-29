/* Mobile map boot — Safari cache bust + strip legacy HUD on phones */
(function () {
  "use strict";
  var BUILD = "20260705b";
  var STORE_KEY = "mi-map-build";

  function needsBuild() {
    return location.search.indexOf("v=" + BUILD) < 0;
  }

  if (needsBuild()) {
    try { sessionStorage.setItem(STORE_KEY, BUILD); } catch (_) {}
    location.replace(location.pathname + "?v=" + BUILD + location.hash);
    return;
  }

  try {
    if (sessionStorage.getItem(STORE_KEY) !== BUILD) {
      sessionStorage.setItem(STORE_KEY, BUILD);
    }
  } catch (_) {}

  function applyMobileBoot() {
    if (!window.matchMedia("(max-width: 768px)").matches) return;

    document.querySelector(".map-hud")?.remove();

    var style = document.getElementById("map-mobile-runtime");
    if (!style) {
      style = document.createElement("style");
      style.id = "map-mobile-runtime";
      style.textContent = [
        ".map-hud{display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important}",
        ".tile-toggle,.map-mob-actions,.map-chrome-stack,.chrome-map-actions,.map-topbar-kicker{display:none!important}",
        ".map-mob-toolbar{display:flex!important}",
        ".map-topbar{flex-wrap:nowrap!important;height:calc(env(safe-area-inset-top,0px) + 50px)!important;min-height:calc(env(safe-area-inset-top,0px) + 50px)!important;padding:calc(6px + env(safe-area-inset-top,0px)) 10px 6px!important}",
        ".map-topbar-brand{flex:1 1 auto!important;max-width:62%!important}",
        ".map-topbar-actions{flex:0 0 auto!important}",
        "#map{top:calc(env(safe-area-inset-top,0px) + 50px)!important;bottom:calc(44px + env(safe-area-inset-bottom,0px))!important}",
        ".map-panel{position:fixed!important;bottom:0!important;left:0!important;right:0!important;width:100%!important;top:auto!important;-webkit-transform:translateZ(0);transform:translateZ(0)}"
      ].join("");
      document.head.appendChild(style);
    }

    var toolbar = document.querySelector(".map-mob-toolbar");
    if (toolbar) toolbar.style.display = "flex";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyMobileBoot);
  } else {
    applyMobileBoot();
  }

  /* Safari back-forward cache */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) applyMobileBoot();
  });
})();