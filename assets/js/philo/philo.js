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

  function detectLang(text) {
    var s = String(text || "");
    var cjkCount = (s.match(/[\u3400-\u9fff]/g) || []).length;
    var latinCount = (s.match(/[A-Za-z]/g) || []).length;
    if (cjkCount > 30 && cjkCount > latinCount * 0.08) return "zh";
    return "en";
  }

  function main() {
    var locale = getLocaleFromPath();
    var docs = (window.PHILO_DOCS || []).slice();
    if (!docs.length) return;

    var st = {
      era: "",
      school: "",
      topic: "",
      person: "",
      docId: docs[0].id,
      q: "",
      viewMode: "orig",
      translateWindow: 28,
      lastJumpTerm: "",
      translationWarn: "",
    };

    var eraValues = uniq(
      docs.map(function (d) {
        return textByLocale(d.era, locale);
      })
    );
    var schoolValues = uniq(
      docs.map(function (d) {
        return textByLocale(d.school, locale);
      })
    );
    var topicValues = uniq(
      docs.flatMap(function (d) {
        return d.topics || [];
      })
    );
    var peopleValues = uniq(
      docs.flatMap(function (d) {
        return d.people || [];
      })
    );

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

    function filteredDocs() {
      return docs.filter(matches);
    }

    function getDoc() {
      return docs.find(function (d) {
        return d.id === st.docId;
      }) || filteredDocs()[0] || docs[0] || null;
    }

    function selectBestDocFromFiltered() {
      var list = filteredDocs();
      if (!list.length) {
        st.docId = "";
        return;
      }
      var q = String(st.q || "").toLowerCase();
      var ranked = list
        .map(function (d, idx) {
          var score = 0;
          if (st.topic && (d.topics || []).includes(st.topic)) score += 12;
          if (st.person && (d.people || []).includes(st.person)) score += 12;
          if (st.era && textByLocale(d.era, locale) === st.era) score += 6;
          if (st.school && textByLocale(d.school, locale) === st.school) score += 6;
          var title = textByLocale(d.title, locale);
          if (q && title.toLowerCase().indexOf(q) >= 0) score += 3;
          if (q && (d.topics || []).join(" ").toLowerCase().indexOf(q) >= 0) score += 2;
          if (q && (d.people || []).join(" ").toLowerCase().indexOf(q) >= 0) score += 2;
          return { d: d, idx: idx, score: score };
        })
        .sort(function (a, b) {
          if (b.score !== a.score) return b.score - a.score;
          return a.idx - b.idx;
        });
      st.docId = ranked[0].d.id;
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

    function applyFilter(key, value) {
      st[key] = value || "";
      st.q = value || "";
      st.lastJumpTerm = value || "";
      if (elSearch) elSearch.value = st.q;
      selectBestDocFromFiltered();
      renderFilters();
      renderDocList();
      loadAndRender({
        jumpToKeyword: Boolean(value),
        scrollToTop: true,
      });
    }

    function renderFilters() {
      renderChips(elEras, eraValues, st.era, function (v) {
        applyFilter("era", v);
      });
      renderChips(elSchools, schoolValues, st.school, function (v) {
        applyFilter("school", v);
      });
      renderChips(elTopics, topicValues, st.topic, function (v) {
        applyFilter("topic", v);
      });
      renderChips(elPeople, peopleValues, st.person, function (v) {
        applyFilter("person", v);
      });
    }

    function renderDocList() {
      if (!elDocs) return;
      elDocs.innerHTML = "";
      var list = filteredDocs();
      if (!list.length) {
        var empty = document.createElement("div");
        empty.className = "search-hits";
        empty.textContent = locale === "zh" ? "当前筛选下暂无文献。" : "No documents match current filters.";
        elDocs.appendChild(empty);
        return;
      }
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
          loadAndRender({
            jumpToKeyword: Boolean(st.q),
            scrollToTop: true,
          });
        });
        elDocs.appendChild(btn);
      });
      if (!list.some(function (d) { return d.id === st.docId; })) {
        st.docId = list[0].id;
      }
    }

    var rawCache = {};
    var translatedCache = {};
    var translatingDoc = "";
    var translatingDir = "";
    var translating = false;

    function loadText(doc) {
      if (!doc) return Promise.resolve("");
      if (rawCache[doc.id]) return Promise.resolve(rawCache[doc.id]);
      return fetch(doc.text)
        .then(function (r) {
          return r.text();
        })
        .then(function (txt) {
          rawCache[doc.id] = txt;
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

    function polishTranslation(text, sourceLang, targetLang) {
      var output = String(text || "");
      if (sourceLang === "en" && targetLang === "zh") {
        output = output
          .replace(/德行/g, "德性")
          .replace(/哲学家王/g, "哲人王")
          .replace(/\s+([，。；：？！])/g, "$1");
      }
      return output;
    }

    function translateChunkMyMemory(text, sourceLang, targetLang) {
      var pair = encodeURIComponent(sourceLang + "|" + (targetLang === "zh" ? "zh-CN" : "en"));
      var endpoint =
        "https://api.mymemory.translated.net/get?q=" +
        encodeURIComponent(text) +
        "&langpair=" +
        pair;
      return fetch(endpoint)
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          var value = data && data.responseData ? data.responseData.translatedText : "";
          return value || text;
        });
    }

    function translateChunkLibre(text, sourceLang, targetLang) {
      return fetch("https://www.libretranslate.com/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text",
        }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          return data && data.translatedText ? data.translatedText : text;
        });
    }

    function translateChunk(text, sourceLang, targetLang) {
      return translateChunkLibre(text, sourceLang, targetLang)
        .then(function (translated) {
          return { text: translated, ok: true };
        })
        .catch(function () {
          return translateChunkMyMemory(text, sourceLang, targetLang).then(function (translated) {
            return { text: translated, ok: true };
          });
        })
        .catch(function () {
          return { text: text, ok: false };
        });
    }

    function translateBlock(text, sourceLang, targetLang) {
      var segments = splitForTranslation(text, 420);
      var chain = Promise.resolve({ parts: [], okCount: 0, total: 0 });
      segments.forEach(function (seg) {
        chain = chain.then(function (accState) {
          return translateChunk(seg, sourceLang, targetLang).then(function (out) {
            accState.parts.push(out.text);
            accState.total += 1;
            if (out.ok) accState.okCount += 1;
            return accState;
          });
        });
      });
      return chain.then(function (state) {
        return {
          text: polishTranslation(state.parts.join(""), sourceLang, targetLang),
          allOk: state.total > 0 ? state.okCount === state.total : false,
        };
      });
    }

    function getLanguagePair(text) {
      var source = detectLang(text);
      var target = source === "zh" ? "en" : "zh";
      return { source: source, target: target };
    }

    function setModeUi(sourceLang, targetLang) {
      elModeBtns.forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-mode") === st.viewMode);
      });

      if (elTranslateMore) {
        elTranslateMore.style.display = st.viewMode === "trans" ? "inline-flex" : "none";
        if (locale === "zh") {
          elTranslateMore.textContent = "继续翻译";
        } else {
          elTranslateMore.textContent = "Translate More";
        }
      }

      if (elTranslateNote) {
        if (st.viewMode !== "trans") {
          elTranslateNote.textContent = "";
        } else {
          var pairText = sourceLang === "zh" ? "中 → 英" : "EN → 中";
          var baseNote =
            locale === "zh"
              ? "当前译读方向：" + pairText + "（分批加载，若网络波动会保留原文）"
              : "Current translation: " + pairText + " (loaded in batches; falls back to original when network is unavailable).";
          elTranslateNote.textContent = st.translationWarn ? baseNote + " " + st.translationWarn : baseNote;
        }
      }
    }

    function renderBranchActive(branch) {
      elBranchBtns.forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-branch-btn") === branch);
      });
      var targetId = branch === "topic" ? "branch-topic" : branch === "people" ? "branch-people" : "branch-toc";
      var target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function extractTocLines(text) {
      var lines = String(text || "").split(/\r?\n/);
      var toc = [];
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i].trim();
        if (!l) continue;
        if (/^第[一二三四五六七八九十百]+章/.test(l) || /^CHAPTER\s+\d+/i.test(l) || /^PART\s+\w+/i.test(l)) {
          toc.push(l);
        }
        if (toc.length >= 16) break;
      }
      return toc;
    }

    function scrollToFirstHighlightOrTop() {
      var firstHit = elViewer ? elViewer.querySelector(".term-hl") : null;
      if (firstHit) {
        firstHit.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (elViewer) {
        elViewer.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function loadAndRender(opts) {
      opts = opts || {};
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
        var pair = getLanguagePair(txt);
        st.translationWarn = "";
        setModeUi(pair.source, pair.target);

        var q = (elSearch && elSearch.value ? String(elSearch.value) : "").trim();
        st.q = q;
        var terms = uniq([q, st.topic, st.person, st.school, st.era]).filter(Boolean).slice(0, 8);
        var toc = extractTocLines(txt);

        var head = "<div class=\"philo-toc\">";
        if (toc.length) {
          head += "<b>" + (locale === "zh" ? "目录提示" : "TOC hints") + ":</b> ";
          head += toc
            .map(function (l) {
              return "<span class=\"toc-chip\">" + escapeHtml(l) + "</span>";
            })
            .join(" ");
        }
        head += "</div>";

        var blocks = txt.split(/\n{2,}/).slice(0, 420);
        var directionKey = pair.source + "->" + pair.target;
        if (!translatedCache[doc.id]) translatedCache[doc.id] = {};
        if (!translatedCache[doc.id][directionKey]) translatedCache[doc.id][directionKey] = {};
        var docTranslations = translatedCache[doc.id][directionKey];

        var body = "<article class=\"reader-article\">";
        blocks.forEach(function (blk, idx) {
          var cleaned = blk.replace(/\s+$/g, "");
          if (!cleaned.trim()) return;
          var content = cleaned;
          if (st.viewMode === "trans" && idx < st.translateWindow) {
            content = docTranslations[idx] || cleaned;
          }
          body += "<p class=\"viewer-text\">" + highlightHtml(content, terms) + "</p>";
        });
        body += "</article>";

        if (elViewer) elViewer.innerHTML = head + body;

        if (opts.scrollToTop && elViewer) {
          elViewer.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (opts.jumpToKeyword || opts.jumpToFirstContent) {
          setTimeout(function () {
            if (opts.jumpToKeyword) {
              scrollToFirstHighlightOrTop();
              return;
            }
            var firstP = elViewer ? elViewer.querySelector(".viewer-text") : null;
            if (firstP) firstP.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 40);
        }

        if (st.viewMode !== "trans") return;

        var needTranslate = [];
        for (var i = 0; i < blocks.length && i < st.translateWindow; i++) {
          var b = blocks[i].replace(/\s+$/g, "");
          if (!b.trim()) continue;
          if (!docTranslations[i]) needTranslate.push({ idx: i, text: b });
        }
        if (!needTranslate.length) return;

        translatingDoc = doc.id;
        translatingDir = directionKey;
        if (!translating) {
          translating = true;
          var queue = Promise.resolve();
          needTranslate.forEach(function (item) {
            queue = queue.then(function () {
              return translateBlock(item.text, pair.source, pair.target).then(function (translatedText) {
                if (translatingDoc !== doc.id || translatingDir !== directionKey) return;
                translatedCache[doc.id][directionKey][item.idx] = translatedText.text;
                if (!translatedText.allOk) {
                  st.translationWarn =
                    locale === "zh"
                      ? "（部分段落因网络不可用，暂时显示原文）"
                      : "(Some paragraphs stay in original text because translation service is temporarily unavailable.)";
                }
              });
            });
          });
          queue.finally(function () {
            translating = false;
            if (translatingDoc === doc.id && translatingDir === directionKey) {
              loadAndRender({
                jumpToKeyword: Boolean(st.q || st.lastJumpTerm),
              });
            }
          });
        }
      });
    }

    if (elSearchBtn) {
      elSearchBtn.addEventListener("click", function () {
        st.lastJumpTerm = (elSearch && elSearch.value ? elSearch.value.trim() : "") || "";
        loadAndRender({
          jumpToKeyword: true,
          jumpToFirstContent: true,
        });
      });
    }

    if (elSearch) {
      elSearch.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          st.lastJumpTerm = elSearch.value.trim();
          loadAndRender({
            jumpToKeyword: true,
            jumpToFirstContent: true,
          });
        }
      });
    }

    if (elTranslateMore) {
      elTranslateMore.addEventListener("click", function () {
        st.translateWindow += 30;
        loadAndRender({
          jumpToKeyword: Boolean(st.q),
          jumpToFirstContent: true,
        });
      });
    }

    elModeBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        st.viewMode = btn.getAttribute("data-mode") || "orig";
        loadAndRender({
          jumpToKeyword: Boolean(st.q),
          jumpToFirstContent: true,
        });
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
