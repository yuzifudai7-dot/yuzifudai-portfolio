(function () {
  function getLocaleFromPath() {
    var parts = location.pathname.split("/").filter(Boolean);
    var first = parts[0] || "";
    return first === "zh" ? "zh" : "en";
  }

  function textByLocale(value, locale) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[locale] || value.en || value.zh || "";
  }

  function uniq(arr) {
    var seen = new Set();
    var out = [];
    arr.forEach(function (x) {
      if (!x) return;
      var k = String(x).trim();
      if (!k || seen.has(k)) return;
      seen.add(k);
      out.push(k);
    });
    return out;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightHtml(text, terms) {
    var html = escapeHtml(text || "");
    (terms || []).forEach(function (term) {
      if (!term) return;
      var re = new RegExp(escapeRegExp(term), "gi");
      html = html.replace(re, function (m) {
        return "<mark class=\"term-hl\">" + m + "</mark>";
      });
    });
    return html;
  }

  function main() {
    var locale = getLocaleFromPath();
    var docs = (window.PHILO_DOCS || []).slice();

    var st = {
      era: "",
      school: "",
      topic: "",
      person: "",
      docId: docs[0] ? docs[0].id : "",
      q: "",
    };

    var eraValues = uniq(docs.map(function (d) { return textByLocale(d.era, locale); }));
    var schoolValues = uniq(docs.map(function (d) { return textByLocale(d.school, locale); }));
    var topicValues = uniq(docs.flatMap(function (d) { return d.topics || []; }));
    var peopleValues = uniq(docs.flatMap(function (d) { return d.people || []; }));

    var elEras = document.querySelector("[data-eras]");
    var elSchools = document.querySelector("[data-schools]");
    var elTopics = document.querySelector("[data-topics]");
    var elPeople = document.querySelector("[data-people]");
    var elDocs = document.querySelector("[data-docs]");
    var elDocTitle = document.querySelector("[data-doc-title]");
    var elDocMeta = document.querySelector("[data-doc-meta]");
    var elSource = document.querySelector("[data-doc-source]");
    var elViewer = document.querySelector("[data-viewer]");
    var elSearch = document.querySelector("[data-search]");
    var elSearchBtn = document.querySelector("[data-search-btn]");

    function matches(doc) {
      var era = textByLocale(doc.era, locale);
      var school = textByLocale(doc.school, locale);
      if (st.era && era !== st.era) return false;
      if (st.school && school !== st.school) return false;
      if (st.topic && !(doc.topics || []).includes(st.topic)) return false;
      if (st.person && !(doc.people || []).includes(st.person)) return false;
      return true;
    }

    function renderChips(target, values, current, onPick) {
      if (!target) return;
      target.innerHTML = "";
      var none = document.createElement("button");
      none.type = "button";
      none.className = "chip-btn" + (!current ? " active" : "");
      none.textContent = locale === "zh" ? "全部" : "All";
      none.addEventListener("click", function () {
        onPick("");
      });
      target.appendChild(none);
      values.forEach(function (v) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip-btn" + (current === v ? " active" : "");
        b.textContent = v;
        b.addEventListener("click", function () {
          onPick(v);
        });
        target.appendChild(b);
      });
    }

    function renderFilters() {
      renderChips(elEras, eraValues, st.era, function (v) { st.era = v; renderDocList(); });
      renderChips(elSchools, schoolValues, st.school, function (v) { st.school = v; renderDocList(); });
      renderChips(elTopics, topicValues, st.topic, function (v) { st.topic = v; renderDocList(); });
      renderChips(elPeople, peopleValues, st.person, function (v) { st.person = v; renderDocList(); });
    }

    function filteredDocs() {
      return docs.filter(matches);
    }

    function getDoc() {
      return docs.find(function (d) { return d.id === st.docId; }) || filteredDocs()[0] || docs[0] || null;
    }

    function renderDocList() {
      if (!elDocs) return;
      elDocs.innerHTML = "";
      var list = filteredDocs();
      list.forEach(function (d) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "doc-btn" + (st.docId === d.id ? " active" : "");
        btn.innerHTML =
          "<b>" +
          escapeHtml(textByLocale(d.title, locale)) +
          "</b><span>" +
          escapeHtml(textByLocale(d.author, locale)) +
          "</span>";
        btn.addEventListener("click", function () {
          st.docId = d.id;
          renderDocList();
          loadAndRender();
        });
        elDocs.appendChild(btn);
      });
      if (list.length && !list.some(function (d) { return d.id === st.docId; })) st.docId = list[0].id;
    }

    var cache = {}; // docId -> text

    function loadText(doc) {
      if (!doc) return Promise.resolve("");
      if (cache[doc.id]) return Promise.resolve(cache[doc.id]);
      return fetch(doc.text).then(function (r) { return r.text(); }).then(function (txt) {
        cache[doc.id] = txt;
        return txt;
      });
    }

    function extractTocLines(text) {
      var lines = String(text || "").split(/\r?\n/);
      var toc = [];
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i].trim();
        if (!l) continue;
        if (/^BOOK\\s+[IVXLC]+\\b/i.test(l) || /^MEDITATION\\s+[IVXLC]+\\b/i.test(l) || /^PART\\s+\\w+/i.test(l)) {
          toc.push(l);
        }
        if (toc.length >= 18) break;
      }
      return toc;
    }

    function loadAndRender() {
      var doc = getDoc();
      if (!doc) return;
      if (elDocTitle) elDocTitle.textContent = textByLocale(doc.title, locale);
      if (elDocMeta) {
        var meta = [textByLocale(doc.author, locale)];
        if (doc.translator) meta.push(doc.translator);
        meta.push(textByLocale(doc.era, locale));
        meta.push(textByLocale(doc.school, locale));
        elDocMeta.textContent = meta.filter(Boolean).join(" · ");
      }
      if (elSource) {
        elSource.innerHTML =
          "<b>Source:</b> " +
          escapeHtml(doc.source.site) +
          " · <a href=\"" +
          escapeHtml(doc.source.url) +
          "\" target=\"_blank\" rel=\"noreferrer\">" +
          escapeHtml(doc.source.url) +
          "</a> · " +
          escapeHtml(doc.source.license);
      }

      loadText(doc).then(function (txt) {
        var q = (elSearch && elSearch.value ? String(elSearch.value) : "").trim();
        var terms = uniq([q, st.topic, st.person]).filter(Boolean).slice(0, 6);
        var toc = extractTocLines(txt);

        var head = "<div class=\"philo-toc\">";
        if (toc.length) {
          head += "<b>" + (locale === "zh" ? "目录提示" : "TOC hints") + ":</b> ";
          head += toc.map(function (l) { return "<span class=\"toc-chip\">" + escapeHtml(l) + "</span>"; }).join(" ");
        }
        head += "</div>";

        var body = "<article class=\"reader-article\">";
        var blocks = txt.split(/\n{2,}/).slice(0, 1200); // prevent extreme render cost
        blocks.forEach(function (blk) {
          var cleaned = blk.replace(/\s+$/g, "");
          if (!cleaned.trim()) return;
          body += "<p class=\"viewer-text\">" + highlightHtml(cleaned, terms) + "</p>";
        });
        body += "</article>";

        if (elViewer) elViewer.innerHTML = head + body;
      });
    }

    if (elSearchBtn) {
      elSearchBtn.addEventListener("click", function () {
        loadAndRender();
      });
    }
    if (elSearch) {
      elSearch.addEventListener("keydown", function (e) {
        if (e.key === "Enter") loadAndRender();
      });
    }

    renderFilters();
    renderDocList();
    loadAndRender();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();

