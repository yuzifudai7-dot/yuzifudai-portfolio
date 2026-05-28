(function () {
  function getLocaleFromPath() {
    var parts = location.pathname.split("/").filter(Boolean);
    var first = parts[0] || "";
    return first === "zh" ? "zh" : "en";
  }

  function savePreferredLocale(locale) {
    try {
      localStorage.setItem("preferred_locale", locale);
    } catch (_) {}
  }

  function textByLocale(value, locale) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[locale] || value.en || value.zh || "";
  }

  function renderProjects(locale) {
    var target = document.querySelector("[data-projects]");
    if (!target) return;
    var items = (window.PORTFOLIO_PROJECTS || []).slice();
    target.innerHTML = "";

    items.forEach(function (p) {
      var card = document.createElement("article");
      card.className = "project";
      card.setAttribute("aria-label", textByLocale(p.title, locale));

      var h3 = document.createElement("h3");
      h3.textContent = textByLocale(p.title, locale);
      card.appendChild(h3);

      var desc = document.createElement("p");
      desc.className = "desc";
      desc.textContent = textByLocale(p.description, locale);
      card.appendChild(desc);

      if (Array.isArray(p.tags) && p.tags.length) {
        var tags = document.createElement("div");
        tags.className = "tags";
        p.tags.forEach(function (t) {
          var tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = t;
          tags.appendChild(tag);
        });
        card.appendChild(tags);
      }

      if (Array.isArray(p.links) && p.links.length) {
        var links = document.createElement("div");
        links.className = "proj-links";
        p.links.forEach(function (l) {
          var a = document.createElement("a");
          a.href = l.href;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = textByLocale(l.label, locale);
          links.appendChild(a);
        });
        card.appendChild(links);
      }

      target.appendChild(card);
    });
  }

  var locale = getLocaleFromPath();
  savePreferredLocale(locale);
  renderProjects(locale);
})();

