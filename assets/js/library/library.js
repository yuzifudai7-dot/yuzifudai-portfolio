(function () {
  var ACCESS_STORAGE_KEY = "access_granted_v1";

  function getLocaleFromPath() {
    var parts = location.pathname.split("/").filter(Boolean);
    var first = parts[0] || "";
    return first === "zh" ? "zh" : "en";
  }

  function t(locale) {
    if (locale === "zh") {
      return {
        title: "书架",
        filters: "筛选",
        eras: "年代",
        themes: "主题",
        people: "人物",
        docs: "文献",
        search: "文内搜索",
        searchPlaceholder: "输入关键词（在当前文献内）",
        openPdf: "打开原 PDF",
        lockedTitle: "🔒 注册 / 登录后可查看完整内容",
        lockedHint: "公开预览仅展示部分页；解锁后可阅读全部内容与链接。",
        unlock: "去解锁",
        prev: "上一页",
        next: "下一页",
        page: "页",
        noText: "本页主要为图片/手写，无法提取文字。点击查看原 PDF。",
      };
    }
    return {
      title: "Library",
      filters: "Filters",
      eras: "Era",
      themes: "Themes",
      people: "People",
      docs: "Documents",
      search: "Search in document",
      searchPlaceholder: "Type keywords (within current document)",
      openPdf: "Open original PDF",
      lockedTitle: "🔒 Register / sign in to view full content",
      lockedHint: "Public preview shows only a few pages; unlock to read everything.",
      unlock: "Unlock",
      prev: "Prev",
      next: "Next",
      page: "Page",
      noText: "This page is mostly images/handwriting; text extraction is unavailable. Open the original PDF.",
    };
  }

  function textByLocale(value, locale) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[locale] || value.en || value.zh || "";
  }

  function isUnlocked() {
    try {
      return localStorage.getItem(ACCESS_STORAGE_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function getAccessConfig() {
    var cfg = window.ACCESS || {};
    return {
      previewCount: typeof cfg.previewCount === "number" ? cfg.previewCount : 2,
    };
  }

  function ensurePdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    // Vendor PDF.js into the repo to avoid CDN failures.
    // We use the legacy ESM build and load it via dynamic import.
    return import("/assets/vendor/pdfjs/pdf.min.mjs").then(function (mod) {
      if (!mod) throw new Error("pdfjsLib missing");
      window.pdfjsLib = mod;
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.mjs";
      return window.pdfjsLib;
    });
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

  function matchesFilters(doc, st) {
    if (st.era && doc.era !== st.era) return false;
    if (st.theme && !(doc.themes || []).includes(st.theme)) return false;
    if (st.person && !(doc.people || []).includes(st.person)) return false;
    return true;
  }

  function formatTextItems(items) {
    // Heuristic: group by baseline (y), then join by x order.
    // Works well enough for notes PDFs; falls back gracefully.
    var lines = [];
    var lastY = null;
    var line = [];
    var threshold = 2.2;
    items.forEach(function (it) {
      if (!it || !it.str) return;
      var y = it.transform ? it.transform[5] : 0;
      if (lastY === null) lastY = y;
      if (Math.abs(y - lastY) > threshold) {
        if (line.length) lines.push(line.join("").replace(/\s+$/g, ""));
        line = [];
        lastY = y;
      }
      line.push(it.str);
    });
    if (line.length) lines.push(line.join("").replace(/\s+$/g, ""));
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (typeof text === "string") n.textContent = text;
    return n;
  }

  function renderChips(target, values, current, onPick) {
    target.innerHTML = "";
    var none = document.createElement("button");
    none.type = "button";
    none.className = "chip-btn" + (!current ? " active" : "");
    none.textContent = getLocaleFromPath() === "zh" ? "全部" : "All";
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

  function main() {
    var locale = getLocaleFromPath();
    var tx = t(locale);
    var docs = (window.LIBRARY_DOCS || []).slice();

    var st = {
      era: "",
      theme: "",
      person: "",
      docId: docs[0] ? docs[0].id : "",
      page: 1,
      q: "",
    };

    var eraValues = uniq(docs.map(function (d) { return d.era; }));
    var themeValues = uniq(
      docs.flatMap(function (d) {
        return d.themes || [];
      })
    );
    var peopleValues = uniq(
      docs.flatMap(function (d) {
        return d.people || [];
      })
    );

    var elEras = document.querySelector("[data-eras]");
    var elThemes = document.querySelector("[data-themes]");
    var elPeople = document.querySelector("[data-people]");
    var elDocs = document.querySelector("[data-docs]");
    var elViewer = document.querySelector("[data-viewer]");
    var elDocTitle = document.querySelector("[data-doc-title]");
    var elPage = document.querySelector("[data-page]");
    var elPrev = document.querySelector("[data-prev]");
    var elNext = document.querySelector("[data-next]");
    var elOpenPdf = document.querySelector("[data-open-pdf]");
    var elSearch = document.querySelector("[data-search]");
    var elSearchBtn = document.querySelector("[data-search-btn]");
    var elSearchHits = document.querySelector("[data-search-hits]");
    var elPageTotal = document.querySelector("[data-page-total]");

    function setHash() {
      var params = new URLSearchParams();
      if (st.docId) params.set("doc", st.docId);
      if (st.page) params.set("p", String(st.page));
      if (st.era) params.set("era", st.era);
      if (st.theme) params.set("theme", st.theme);
      if (st.person) params.set("person", st.person);
      location.hash = params.toString();
    }

    function loadHash() {
      var raw = (location.hash || "").replace(/^#/, "");
      if (!raw) return;
      var params = new URLSearchParams(raw);
      st.docId = params.get("doc") || st.docId;
      st.page = parseInt(params.get("p") || String(st.page), 10) || 1;
      st.era = params.get("era") || "";
      st.theme = params.get("theme") || "";
      st.person = params.get("person") || "";
    }

    function renderFilters() {
      if (elEras) renderChips(elEras, eraValues, st.era, function (v) { st.era = v; st.page = 1; renderDocList(); setHash(); });
      if (elThemes) renderChips(elThemes, themeValues, st.theme, function (v) { st.theme = v; st.page = 1; renderDocList(); setHash(); });
      if (elPeople) renderChips(elPeople, peopleValues, st.person, function (v) { st.person = v; st.page = 1; renderDocList(); setHash(); });
    }

    function renderDocList() {
      if (!elDocs) return;
      elDocs.innerHTML = "";
      var filtered = docs.filter(function (d) { return matchesFilters(d, st); });
      filtered.forEach(function (d) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "doc-btn" + (st.docId === d.id ? " active" : "");
        btn.innerHTML =
          "<b>" +
          escapeHtml(textByLocale(d.title, locale)) +
          "</b><span>" +
          escapeHtml(d.era || "") +
          "</span>";
        btn.addEventListener("click", function () {
          st.docId = d.id;
          st.page = 1;
          if (elSearch) elSearch.value = "";
          if (elSearchHits) elSearchHits.textContent = "";
          renderDocList();
          renderPage();
          setHash();
        });
        elDocs.appendChild(btn);
      });
      // If current doc no longer visible due to filters, pick the first.
      if (filtered.length && !filtered.some(function (d) { return d.id === st.docId; })) {
        st.docId = filtered[0].id;
        st.page = 1;
        renderDocList();
      }
    }

    function getCurrentDoc() {
      return docs.find(function (d) { return d.id === st.docId; }) || docs[0] || null;
    }

    var cache = {
      pdf: null,
      docId: "",
      numPages: 0,
      pageText: {}, // key: pageNumber -> { text, hasText }
    };

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function showLockedOverlay() {
      if (!elViewer) return;
      elViewer.innerHTML = "";
      var wrap = el("div", "viewer-locked");
      var box = el("div", "lock-box");
      box.appendChild(el("b", "", tx.lockedTitle));
      box.appendChild(el("p", "", tx.lockedHint));
      var actions = el("div", "lock-actions");
      var btn = el("button", "btn primary", tx.unlock);
      btn.type = "button";
      btn.addEventListener("click", function () {
        var open = document.getElementById("open-access") || document.getElementById("open-access-mobile") || document.getElementById("open-access-cta");
        if (open) open.click();
      });
      actions.appendChild(btn);
      box.appendChild(actions);
      wrap.appendChild(box);
      elViewer.appendChild(wrap);
    }

    function renderPage() {
      var doc = getCurrentDoc();
      if (!doc) return;
      if (elDocTitle) elDocTitle.textContent = textByLocale(doc.title, locale);

      var cfg = getAccessConfig();
      var unlocked = isUnlocked();
      var isPreviewAllowed = unlocked || st.page <= cfg.previewCount;

      if (elPage) elPage.textContent = String(st.page);
      if (elOpenPdf) {
        elOpenPdf.textContent = tx.openPdf;
        elOpenPdf.href = doc.pdf + "#page=" + String(st.page);
      }
      if (!isPreviewAllowed) {
        showLockedOverlay();
        return;
      }

      ensurePdfJs()
        .then(function (pdfjsLib) {
          if (cache.docId !== doc.id) {
            cache.docId = doc.id;
            cache.pdf = null;
            cache.numPages = 0;
            cache.pageText = {};
          }
          if (cache.pdf) return cache.pdf;
          return pdfjsLib.getDocument({ url: doc.pdf }).promise.then(function (pdf) {
            cache.pdf = pdf;
            cache.numPages = pdf.numPages || 0;
            if (elPageTotal) elPageTotal.textContent = cache.numPages ? String(cache.numPages) : "—";
            return pdf;
          });
        })
        .then(function (pdf) {
          if (!pdf) return;
          var pageNumber = Math.min(Math.max(1, st.page), pdf.numPages || st.page);
          st.page = pageNumber;
          if (elPage) elPage.textContent = String(st.page);
          if (elPageTotal) elPageTotal.textContent = cache.numPages ? String(cache.numPages) : "—";

          if (elPrev) elPrev.disabled = st.page <= 1;
          if (elNext) elNext.disabled = cache.numPages ? st.page >= cache.numPages : false;

          if (cache.pageText[pageNumber]) {
            renderViewerText(cache.pageText[pageNumber], doc, locale, tx);
            return;
          }

          return pdf.getPage(pageNumber).then(function (page) {
            return page.getTextContent().then(function (tc) {
              var items = (tc && tc.items) || [];
              var text = formatTextItems(items);
              var payload = { text: text, hasText: Boolean(text && text.trim().length) };
              cache.pageText[pageNumber] = payload;
              renderViewerText(payload, doc, locale, tx);
            });
          });
        })
        .catch(function (err) {
          if (!elViewer) return;
          elViewer.textContent = String(err && err.message ? err.message : err);
        });
    }

    function renderViewerText(payload, doc, locale, tx) {
      if (!elViewer) return;
      elViewer.innerHTML = "";

      if (payload && payload.hasText) {
        var pre = el("pre", "viewer-text");
        pre.textContent = payload.text;
        elViewer.appendChild(pre);
        return;
      }

      var hint = el("div", "viewer-hint");
      hint.appendChild(el("p", "", tx.noText));
      var a = document.createElement("a");
      a.className = "btn";
      a.href = doc.pdf + "#page=" + String(st.page);
      a.target = "_blank";
      a.rel = "noreferrer";
      a.textContent = tx.openPdf;
      hint.appendChild(a);
      elViewer.appendChild(hint);
    }

    function searchInDoc() {
      var q = (elSearch && elSearch.value ? String(elSearch.value) : "").trim();
      st.q = q;
      if (!q) {
        if (elSearchHits) elSearchHits.textContent = "";
        return;
      }
      var doc = getCurrentDoc();
      if (!doc) return;
      ensurePdfJs()
        .then(function () {
          // Search only among already-extracted pages to keep it fast.
          // Users can page through; the cache grows and search becomes richer.
          var hits = [];
          Object.keys(cache.pageText).forEach(function (k) {
            var pn = parseInt(k, 10);
            var txt = cache.pageText[k] && cache.pageText[k].text ? cache.pageText[k].text : "";
            if (txt && txt.indexOf(q) !== -1) hits.push(pn);
          });
          if (elSearchHits) {
            elSearchHits.textContent =
              hits.length ? ("Hits: " + hits.join(", ")) : "No hits yet (try paging to load more).";
          }
        })
        .catch(function () {});
    }

    if (elPrev) {
      elPrev.addEventListener("click", function () {
        st.page = Math.max(1, st.page - 1);
        renderPage();
        setHash();
      });
    }
    if (elNext) {
      elNext.addEventListener("click", function () {
        st.page = st.page + 1;
        renderPage();
        setHash();
      });
    }
    if (elSearchBtn) elSearchBtn.addEventListener("click", searchInDoc);
    if (elSearch) {
      elSearch.placeholder = tx.searchPlaceholder;
      elSearch.addEventListener("keydown", function (e) {
        if (e.key === "Enter") searchInDoc();
      });
    }

    // Reuse the existing access modal wiring from site.js if present on the page.
    // But also refresh the viewer when unlock status changes.
    window.addEventListener("storage", function () {
      renderPage();
    });

    loadHash();
    renderFilters();
    renderDocList();
    renderPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
