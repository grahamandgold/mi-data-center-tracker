/* Mobile map boot — cache-bust redirect + strip legacy HUD on phones */
(function () {
  "use strict";
  var BUILD = "20260705a";

  if (!/\bv=/.test(location.search)) {
    var q = location.search ? location.search + "&" : "?";
    location.replace(location.pathname + q + "v=" + BUILD + location.hash);
    return;
  }

  function applyMobileBoot() {
    if (!window.matchMedia("(max-width: 768px)").matches) return;

    document.querySelector(".map-hud")?.remove();

    var style = document.getElementById("map-mobile-runtime");
    if (!style) {
      style = document.createElement("style");
      style.id = "map-mobile-runtime";
      style.textContent = [
        ".map-hud{display:none!important;visibility:hidden!important}",
        ".tile-toggle,.map-mob-actions,.map-chrome-stack,.chrome-map-actions,.map-topbar-kicker{display:none!important}",
        ".map-mob-toolbar{display:flex!important}",
        ".map-topbar{flex-wrap:nowrap!important;height:calc(env(safe-area-inset-top,0px) + 50px)!important;padding:calc(6px + env(safe-area-inset-top,0px)) 10px 6px!important}",
        ".map-topbar-brand{flex:1 1 auto!important;max-width:62%!important}",
        ".map-topbar-actions{flex:0 0 auto!important}",
        "#map{top:calc(env(safe-area-inset-top,0px) + 50px)!important;bottom:calc(44px + env(safe-area-inset-bottom,0px))!important}",
        ".map-panel{position:fixed!important;bottom:0!important;left:0!important;right:0!important;width:100%!important;top:auto!important}"
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
})();