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
      viewMode: locale === "zh" ? "zh" : "orig",
      translateWindow: 36,
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
    var elModeBtns = Array.prototype.slice.call(document.querySelectorAll("[data-mode]"));
    var elTranslateNote = document.querySelector("[data-translate-note]");
    var elTranslateMore = document.querySelector("[data-translate-more]");
    var elBranchBtns = Array.prototype.slice.call(document.querySelectorAll("[data-branch-btn]"));

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
    var translatedCache = {}; // docId -> { idx: translatedBlock }
    var translatingDoc = null;
    var translating = false;

    var glossaryMap = {
      "virtue": "德性",
      "justice": "正义",
      "soul": "灵魂",
      "reason": "理性",
      "happiness": "幸福",
      "good": "善",
      "form": "理念",
      "substance": "实体",
      "metaphysics": "形而上学",
      "epistemology": "认识论",
      "Plato": "柏拉图",
      "Aristotle": "亚里士多德",
      "Socrates": "苏格拉底",
      "Descartes": "笛卡尔"
    };

    function loadText(doc) {
      if (!doc) return Promise.resolve("");
      if (cache[doc.id]) return Promise.resolve(cache[doc.id]);
      return fetch(doc.text).then(function (r) { return r.text(); }).then(function (txt) {
        cache[doc.id] = txt;
        return txt;
      });
    }

    function splitForTranslation(text, maxLen) {
      if (text.length <= maxLen) return [text];
      var parts = [];
      var current = "";
      var segs = text.split(/([.?!;:。？！；：])/);
      for (var i = 0; i < segs.length; i++) {
        var token = segs[i];
        if (!token) continue;
        if ((current + token).length > maxLen && current) {
          parts.push(current);
          current = token;
        } else {
          current += token;
        }
      }
      if (current) parts.push(current);
      return parts;
    }

    function polishZh(text) {
      var output = String(text || "");
      Object.keys(glossaryMap).forEach(function (k) {
        var re = new RegExp("\\b" + escapeRegExp(k) + "\\b", "gi");
        output = output.replace(re, glossaryMap[k]);
      });
      output = output.replace(/哲学家王/g, "哲人王");
      output = output.replace(/德行/g, "德性");
      output = output.replace(/\s+([，。；：？！])/g, "$1");
      return output;
    }

    function translateChunkMyMemory(text) {
      var endpoint = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=en|zh-CN";
      return fetch(endpoint).then(function (r) { return r.json(); }).then(function (data) {
        var value = data && data.responseData ? data.responseData.translatedText : "";
        return value || text;
      });
    }

    function translateChunkLibre(text) {
      return fetch("https://www.libretranslate.com/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: "en",
          target: "zh",
          format: "text"
        })
      }).then(function (r) { return r.json(); }).then(function (data) {
        return (data && data.translatedText) ? data.translatedText : text;
      });
    }

    function translateChunk(text) {
      return translateChunkLibre(text).catch(function () {
        return translateChunkMyMemory(text);
      }).catch(function () {
        return text;
      });
    }

    function translateBlock(text) {
      var segments = splitForTranslation(text, 420);
      var chain = Promise.resolve([]);
      segments.forEach(function (seg) {
        chain = chain.then(function (acc) {
          return translateChunk(seg).then(function (out) {
            acc.push(out);
            return acc;
          });
        });
      });
      return chain.then(function (arr) {
        return polishZh(arr.join(""));
      });
    }

    function setModeUi() {
      elModeBtns.forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-mode") === st.viewMode);
      });
      if (elTranslateMore) elTranslateMore.style.display = st.viewMode === "zh" ? "inline-flex" : "none";
      if (elTranslateNote) {
        elTranslateNote.textContent = st.viewMode === "zh"
          ? (locale === "zh" ? "译文为“开放翻译 + 术语润色”模式，可能有少量偏差。" : "Translation uses open engine + glossary polishing.")
          : "";
      }
    }

    function renderBranchActive(branch) {
      elBranchBtns.forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-branch-btn") === branch);
      });
      var targetId = branch === "topic" ? "branch-topic" : (branch === "people" ? "branch-people" : "branch-toc");
      var target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
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
      setModeUi();
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
        var blocks = txt.split(/\n{2,}/).slice(0, 320);
        var docTranslations = translatedCache[doc.id] || {};
        blocks.forEach(function (blk, idx) {
          var cleaned = blk.replace(/\s+$/g, "");
          if (!cleaned.trim()) return;
          var content = cleaned;
          if (st.viewMode === "zh" && idx < st.translateWindow) {
            content = docTranslations[idx] || cleaned;
          }
          body += "<p class=\"viewer-text\">" + highlightHtml(content, terms) + "</p>";
        });
        body += "</article>";

        if (elViewer) elViewer.innerHTML = head + body;

        if (st.viewMode === "zh") {
          var needTranslate = [];
          for (var i = 0; i < blocks.length && i < st.translateWindow; i++) {
            var b = blocks[i].replace(/\s+$/g, "");
            if (!b.trim()) continue;
            if (!docTranslations[i]) needTranslate.push({ idx: i, text: b });
          }
          if (needTranslate.length) {
            translatingDoc = doc.id;
            if (!translatedCache[doc.id]) translatedCache[doc.id] = {};
            if (!translating) {
              translating = true;
              var queue = Promise.resolve();
              needTranslate.forEach(function (item) {
                queue = queue.then(function () {
                  return translateBlock(item.text).then(function (zhText) {
                    if (translatingDoc !== doc.id) return;
                    translatedCache[doc.id][item.idx] = zhText;
                  });
                });
              });
              queue.finally(function () {
                translating = false;
                if (translatingDoc === doc.id) loadAndRender();
              });
            }
          }
        }
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

    if (elTranslateMore) {
      elTranslateMore.addEventListener("click", function () {
        st.translateWindow += 30;
        loadAndRender();
      });
    }

    elModeBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        st.viewMode = btn.getAttribute("data-mode") || "orig";
        loadAndRender();
      });
    });

    elBranchBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        renderBranchActive(btn.getAttribute("data-branch-btn"));
      });
    });

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
