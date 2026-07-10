/**
 * Shared site chrome — active nav, footer date, path matching.
 */
(function () {
  const page = document.body.dataset.page || "";
  if (!page) return;

  const navMap = {
    home: ["index.html", "", "/", "/index.html"],
    map: ["map.html", "map/", "map/index.html"],
    stories: ["stories.html"],
    meetings: ["meetings.html"],
    learn: ["learn.html", "methodology.html", "privacy.html"],
    voice: ["your-voice-2026.html"],
    sponsor: ["sponsorship.html"]
  };

  const stripBase = (path) => {
    const base = document.querySelector("base")?.getAttribute("href") || "";
    if (base && path.startsWith(base)) path = path.slice(base.length);
    return path.replace(/\/index\.html$/, "").replace(/\/$/, "") || "/";
  };

  const hrefPath = (href) => {
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return null;
    try {
      return stripBase(new URL(href, window.location.href).pathname);
    } catch {
      return stripBase(href.split("#")[0].split("?")[0]);
    }
  };

  const current = stripBase(window.location.pathname);
  const repoPrefix = current.includes("/mi-data-center-tracker")
    ? "/mi-data-center-tracker"
    : "";

  const targetsFor = (key) => {
    const paths = navMap[key] || [];
    return paths.flatMap((p) => {
      const clean = p.replace(/^\//, "");
      if (!repoPrefix) return [stripBase("/" + clean), clean === "index.html" ? "/" : stripBase("/" + clean.replace(/index\.html$/, ""))];
      const prefixed = repoPrefix + (clean ? "/" + clean : "");
      return [
        stripBase(prefixed),
        stripBase(prefixed.replace(/index\.html$/, "")),
        stripBase("/" + clean),
        clean === "index.html" ? "/" : stripBase("/" + clean.replace(/index\.html$/, ""))
      ];
    });
  };

  const isActive = (href) => {
    const path = hrefPath(href);
    if (!path) return false;
    const allowed = targetsFor(page);
    if (allowed.some((p) => path === p || path.endsWith(p))) return true;
    if (page === "home" && (path === "/" || path.endsWith("/index.html") || path === repoPrefix || path === repoPrefix + "/")) return true;
    return false;
  };

  document.querySelectorAll(".nav-links a, .drawer nav a, .live-map-link").forEach((link) => {
    if (isActive(link.getAttribute("href") || "")) link.classList.add("is-active");
  });

  if (page === "map") {
    document.querySelectorAll('.live-map-link[href*="map"]').forEach((el) => el.classList.add("is-active"));
  }
})();