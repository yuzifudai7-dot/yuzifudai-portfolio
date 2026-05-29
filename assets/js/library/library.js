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
        openPdf: "打开原 PDF",
        lockedTitle: "注册 / 登录后可查看完整内容",
        lockedHint: "公开预览仅展示部分页；解锁后可阅读全部内容与链接。",
        unlock: "去解锁",
        noText: "本页主要为图片/手写，无法提取文字。点击查看原 PDF。",
        all: "全部",
        searching: "正在搜索全文，请稍候...",
        noSearchHit: "当前文献里未找到该关键词。",
        hitPages: "命中页",
        noDataForQA: "当前筛选范围内暂未找到可用内容，请尝试更换关键词或文献。",
        qaThinking: "正在阅读站内内容并组织回答...",
        qaTitle: "基于站内内容的回答（Beta）",
        qaRefs: "参考位置",
        qaPageUnit: "第",
        qaPageSuffix: "页",
        qaEmpty: "请输入问题。",
        qaNoEnough: "站内相关证据不足，先不做武断结论。你可以换一个更具体的问题或先切换到相关人物/主题。",
        qaSummary: "简要回答",
        qaSimilarity: "共同点",
        qaDifference: "差异点",
        qaEvidence: "证据摘录",
        qaPromptHint: "你也可以问：A和B的相似性？A和B的区别？",
        illusDefault: "文献场景线稿",
        illusEra: "年代线索场景",
        illusTheme: "主题相关场景",
        illusPerson: "人物相关线稿",
      };
    }
    return {
      openPdf: "Open original PDF",
      lockedTitle: "Register / sign in to view full content",
      lockedHint: "Public preview shows only a few pages; unlock to read everything.",
      unlock: "Unlock",
      noText: "This page is mostly images/handwriting; text extraction is unavailable. Open the original PDF.",
      all: "All",
      searching: "Searching full text...",
      noSearchHit: "No matches in this document.",
      hitPages: "Hit pages",
      noDataForQA: "No usable content found in the current filter range. Try another question or document.",
      qaThinking: "Reading site content and composing an answer...",
      qaTitle: "Answer based on site content (Beta)",
      qaRefs: "References",
      qaPageUnit: "p.",
      qaPageSuffix: "",
      qaEmpty: "Please enter a question.",
      qaNoEnough: "Not enough evidence in the current site content to answer confidently.",
      qaSummary: "Short answer",
      qaSimilarity: "Similarities",
      qaDifference: "Differences",
      qaEvidence: "Evidence snippets",
      qaPromptHint: "You can ask: similarities between A and B, or differences between A and B.",
      illusDefault: "Literary scene line art",
      illusEra: "Era scene line art",
      illusTheme: "Theme scene line art",
      illusPerson: "Character portrait line art",
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

  function sanitizeExtractedText(raw) {
    if (!raw) return "";
    var txt = String(raw);
    txt = txt.replace(/免费分享请勿商用/g, "");
    txt = txt.replace(/整理[:：]\s*微博@?辞琛/g, "来源：微博@辞琛");
    txt = txt.replace(/北大古代文学考研基础笔记/g, "北大古代文学基础笔记");
    txt = txt.replace(/考研基础笔记/g, "基础笔记");
    txt = txt.replace(/\n{3,}/g, "\n\n");
    return txt;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (typeof text === "string") n.textContent = text;
    return n;
  }

  function countOccurrences(text, term) {
    if (!text || !term) return 0;
    var t = text.toLowerCase();
    var q = term.toLowerCase();
    var count = 0;
    var idx = 0;
    while (true) {
      idx = t.indexOf(q, idx);
      if (idx === -1) break;
      count += 1;
      idx += q.length;
    }
    return count;
  }

  function buildTerms(q, anchors) {
    var question = String(q || "").trim();
    var stopWords = [
      "如何", "怎么", "怎样", "什么", "哪些", "为什么", "对比", "比较", "区别", "差异", "异同", "相似", "相同", "共同", "看待", "关于",
      "可以", "能否", "请问", "一下", "这个", "那个", "还有", "以及", "对于",
      "what", "how", "why", "compare", "comparison", "difference", "differences", "similar", "similarity", "between", "about",
    ];
    var terms = [];
    String(question)
      .replace(/[“”"‘’'()（）【】\[\]<>《》]/g, " ")
      .split(/[\s,，。；;、!?？！:+\-\\/|]+/)
      .map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length >= 2; })
      .forEach(function (x) {
        if (stopWords.indexOf(x.toLowerCase()) !== -1) return;
        terms.push(x);
      });

    (anchors || []).forEach(function (x) {
      if (x && String(question).indexOf(x) !== -1) terms.push(x);
    });

    // keep the whole question as a low-priority fuzzy term only when short
    if (question.length >= 2 && question.length <= 16) terms.push(question);
    return uniq(terms);
  }

  function scoreText(text, q, anchors) {
    var terms = buildTerms(q, anchors);
    var score = 0;
    terms.forEach(function (term) {
      var base = term.length >= 3 ? 2 : 1;
      score += countOccurrences(text, term) * base;
    });
    (anchors || []).forEach(function (anchor) {
      score += countOccurrences(text, anchor) * 4;
    });
    return score;
  }

  function snippetAround(text, q, anchors) {
    if (!text) return "";
    var idx = text.indexOf(q);
    if (idx === -1 && anchors && anchors.length) {
      idx = text.indexOf(anchors[0]);
    }
    if (idx === -1) idx = 0;
    var start = Math.max(0, idx - 70);
    var end = Math.min(text.length, idx + 170);
    var snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
    return snippet;
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
      activeKeywordType: "",
      activeKeywordValue: "",
    };

    var eraValues = uniq(docs.map(function (d) { return d.era; }));
    var themeValues = uniq(docs.flatMap(function (d) { return d.themes || []; }));
    var peopleValues = uniq(docs.flatMap(function (d) { return d.people || []; }));
    var qaVocab = uniq([].concat(peopleValues, themeValues, eraValues));

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

    var elIllus = document.querySelector("[data-illus]");
    var elIllusCaption = document.querySelector("[data-illus-caption]");

    var elQaInput = document.querySelector("[data-qa-input]");
    var elQaAsk = document.querySelector("[data-qa-ask]");
    var elQaAnswer = document.querySelector("[data-qa-answer]");

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

    function docsInFilter() {
      return docs.filter(function (d) {
        return matchesFilters(d, st);
      });
    }

    function getCurrentDoc() {
      return docs.find(function (d) { return d.id === st.docId; }) || docs[0] || null;
    }

    function getDocCache(docId) {
      if (!docCaches[docId]) {
        docCaches[docId] = { pdf: null, numPages: 0, pageText: {} };
      }
      return docCaches[docId];
    }

    function resetOtherFilters(type) {
      if (type !== "era") st.era = "";
      if (type !== "theme") st.theme = "";
      if (type !== "person") st.person = "";
    }

    function updateIllustration() {
      if (!elIllus || !elIllusCaption) return;
      var src = "../assets/img/ink/scroll.svg";
      var cap = tx.illusDefault;

      if (st.activeKeywordType === "person" && st.activeKeywordValue) {
        src = "../assets/img/ink/portrait.svg";
        cap = tx.illusPerson + " · " + st.activeKeywordValue;
      } else if (st.activeKeywordType === "era" && st.activeKeywordValue) {
        src = "../assets/img/ink/mountain.svg";
        cap = tx.illusEra + " · " + st.activeKeywordValue;
      } else if (st.activeKeywordType === "theme" && st.activeKeywordValue) {
        src = "../assets/img/ink/scroll.svg";
        cap = tx.illusTheme + " · " + st.activeKeywordValue;
      }

      elIllus.src = src;
      elIllusCaption.textContent = cap;
    }

    function renderChips(target, values, current, type) {
      target.innerHTML = "";
      var none = document.createElement("button");
      none.type = "button";
      none.className = "chip-btn" + (!current ? " active" : "");
      none.textContent = tx.all;
      none.addEventListener("click", function () {
        st[type] = "";
        if (!st.era && !st.theme && !st.person) {
          st.activeKeywordType = "";
          st.activeKeywordValue = "";
        }
        st.page = 1;
        renderDocList();
        renderPage();
        updateIllustration();
        setHash();
      });
      target.appendChild(none);

      values.forEach(function (v) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip-btn" + (current === v ? " active" : "");
        b.textContent = v;
        b.addEventListener("click", function () {
          jumpToKeyword(type, v);
        });
        target.appendChild(b);
      });
    }

    function renderFilters() {
      if (elEras) renderChips(elEras, eraValues, st.era, "era");
      if (elThemes) renderChips(elThemes, themeValues, st.theme, "theme");
      if (elPeople) renderChips(elPeople, peopleValues, st.person, "person");
    }

    function renderDocList() {
      if (!elDocs) return;
      elDocs.innerHTML = "";
      var filtered = docsInFilter();

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

      if (filtered.length && !filtered.some(function (d) { return d.id === st.docId; })) {
        st.docId = filtered[0].id;
        st.page = 1;
      }
    }

    var docCaches = {};

    function previewLimit() {
      var unlocked = isUnlocked();
      var cfg = getAccessConfig();
      return unlocked ? Infinity : cfg.previewCount;
    }

    function loadPdf(doc) {
      var c = getDocCache(doc.id);
      if (c.pdf) return Promise.resolve(c.pdf);
      return ensurePdfJs().then(function (pdfjsLib) {
        return pdfjsLib.getDocument({ url: doc.pdf }).promise.then(function (pdf) {
          c.pdf = pdf;
          c.numPages = pdf.numPages || 0;
          return pdf;
        });
      });
    }

    function extractPageText(doc, pageNumber) {
      var c = getDocCache(doc.id);
      if (c.pageText[pageNumber]) return Promise.resolve(c.pageText[pageNumber]);
      return loadPdf(doc).then(function (pdf) {
        return pdf.getPage(pageNumber).then(function (page) {
          return page.getTextContent().then(function (tc) {
            var items = (tc && tc.items) || [];
            var text = sanitizeExtractedText(formatTextItems(items));
            var payload = { text: text, hasText: Boolean(text && text.trim().length) };
            c.pageText[pageNumber] = payload;
            return payload;
          });
        });
      });
    }

    function findFirstPageWithKeyword(doc, keyword) {
      var limit = previewLimit();
      return loadPdf(doc).then(function (pdf) {
        var max = Math.min(pdf.numPages || 0, limit);
        if (!max) return 1;
        var p = Promise.resolve(1);
        var found = 1;
        for (var i = 1; i <= max; i++) {
          (function (pageNo) {
            p = p.then(function () {
              return extractPageText(doc, pageNo).then(function (payload) {
                if (found !== 1) return;
                var text = payload && payload.text ? payload.text : "";
                if (text.indexOf(keyword) !== -1) {
                  found = pageNo;
                }
              });
            });
          })(i);
        }
        return p.then(function () {
          return found;
        });
      });
    }

    function jumpToKeyword(type, value) {
      resetOtherFilters(type);
      st[type] = value;
      st.activeKeywordType = value ? type : "";
      st.activeKeywordValue = value || "";
      st.page = 1;

      renderFilters();
      renderDocList();

      var filtered = docsInFilter();
      if (!filtered.length) {
        renderPage();
        updateIllustration();
        setHash();
        return;
      }

      st.docId = filtered[0].id;
      updateIllustration();

      // For theme/person, jump to the first matching page inside the selected document.
      if (value && (type === "theme" || type === "person")) {
        findFirstPageWithKeyword(filtered[0], value)
          .then(function (pageNo) {
            st.page = pageNo || 1;
            renderDocList();
            renderPage();
            setHash();
          })
          .catch(function () {
            st.page = 1;
            renderDocList();
            renderPage();
            setHash();
          });
        return;
      }

      renderDocList();
      renderPage();
      setHash();
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
        var open =
          document.getElementById("open-access") ||
          document.getElementById("open-access-mobile") ||
          document.getElementById("open-access-cta");
        if (open) open.click();
      });
      actions.appendChild(btn);
      box.appendChild(actions);
      wrap.appendChild(box);
      elViewer.appendChild(wrap);
    }

    function renderViewerText(payload, doc) {
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

    function renderPage() {
      var doc = getCurrentDoc();
      if (!doc) return;
      var c = getDocCache(doc.id);

      if (elDocTitle) elDocTitle.textContent = textByLocale(doc.title, locale);
      if (elPage) elPage.textContent = String(st.page);
      if (elPageTotal) elPageTotal.textContent = c.numPages ? String(c.numPages) : "—";
      if (elOpenPdf) {
        elOpenPdf.textContent = tx.openPdf;
        elOpenPdf.href = doc.pdf + "#page=" + String(st.page);
      }

      var isPreviewAllowed = st.page <= previewLimit();
      if (!isPreviewAllowed) {
        showLockedOverlay();
        return;
      }

      loadPdf(doc)
        .then(function (pdf) {
          var pageNumber = Math.min(Math.max(1, st.page), pdf.numPages || st.page);
          st.page = pageNumber;
          if (elPage) elPage.textContent = String(st.page);
          if (elPageTotal) elPageTotal.textContent = String(pdf.numPages || "—");
          if (elPrev) elPrev.disabled = st.page <= 1;
          if (elNext) elNext.disabled = st.page >= (pdf.numPages || st.page);

          return extractPageText(doc, pageNumber).then(function (payload) {
            renderViewerText(payload, doc);
          });
        })
        .catch(function (err) {
          if (!elViewer) return;
          elViewer.textContent = String(err && err.message ? err.message : err);
        });
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
      if (elSearchHits) elSearchHits.textContent = tx.searching;

      loadPdf(doc)
        .then(function (pdf) {
          var limit = Math.min(pdf.numPages || 0, previewLimit());
          var hits = [];
          var queue = Promise.resolve();

          for (var i = 1; i <= limit; i++) {
            (function (pageNo) {
              queue = queue.then(function () {
                return extractPageText(doc, pageNo).then(function (payload) {
                  var txt = payload && payload.text ? payload.text : "";
                  if (txt && scoreText(txt, q) > 0) hits.push(pageNo);
                });
              });
            })(i);
          }

          return queue.then(function () {
            if (!hits.length) {
              if (elSearchHits) elSearchHits.textContent = tx.noSearchHit;
              return;
            }
            st.page = hits[0];
            renderPage();
            if (elSearchHits) elSearchHits.textContent = tx.hitPages + "：" + hits.slice(0, 10).join(", ");
            setHash();
          });
        })
        .catch(function () {
          if (elSearchHits) elSearchHits.textContent = tx.noSearchHit;
        });
    }

    function detectQuestionIntent(q) {
      var lower = String(q || "").toLowerCase();
      var isCompare = /(对比|比较|异同|区别|差异|相似|相同|共同|compare|similar|difference|vs)/i.test(lower);
      var isDiff = /(区别|差异|不同|difference|different)/i.test(lower);
      var isSimilar = /(相似|相同|共同|similar|same)/i.test(lower);
      if (isCompare) {
        if (isDiff) return "difference";
        if (isSimilar) return "similarity";
        return "compare";
      }
      return "general";
    }

    function extractAnchors(question) {
      var q = String(question || "");
      var matches = qaVocab.filter(function (v) {
        return v && q.indexOf(v) !== -1;
      });
      matches.sort(function (a, b) { return b.length - a.length; });
      var deduped = [];
      matches.forEach(function (term) {
        var covered = deduped.some(function (x) { return x.indexOf(term) !== -1; });
        if (!covered) deduped.push(term);
      });
      return deduped.slice(0, 6);
    }

    function formatRef(hit) {
      return escapeHtml(textByLocale(hit.doc.title, locale)) + " " + tx.qaPageUnit + hit.page + tx.qaPageSuffix;
    }

    function docProfileForPerson(person, candidates) {
      var related = candidates.filter(function (d) {
        return Array.isArray(d.people) && d.people.indexOf(person) !== -1;
      });
      var eras = uniq(related.map(function (d) { return d.era; }));
      var themes = uniq(
        related.flatMap(function (d) { return d.themes || []; })
      );
      return { eras: eras, themes: themes };
    }

    function collectQAHits(question, candidates, anchors) {
      var hitsPromise = Promise.resolve([]);
      var maxPagesPerDoc = isUnlocked() ? 80 : previewLimit();

      candidates.forEach(function (doc) {
        hitsPromise = hitsPromise.then(function (acc) {
          return loadPdf(doc).then(function (pdf) {
            var limit = Math.min(pdf.numPages || 0, maxPagesPerDoc);
            var scan = Promise.resolve();
            for (var i = 1; i <= limit; i++) {
              (function (pageNo) {
                scan = scan.then(function () {
                  return extractPageText(doc, pageNo).then(function (payload) {
                    var txt = payload && payload.text ? payload.text : "";
                    if (!txt) return;
                    var score = scoreText(txt, question, anchors);
                    if (score <= 0) return;
                    var matchedAnchors = (anchors || []).filter(function (a) {
                      return txt.indexOf(a) !== -1;
                    });
                    acc.push({
                      doc: doc,
                      page: pageNo,
                      score: score,
                      snippet: snippetAround(txt, question, matchedAnchors),
                      matchedAnchors: matchedAnchors,
                    });
                  });
                });
              })(i);
            }
            return scan.then(function () { return acc; });
          });
        });
      });

      return hitsPromise.then(function (hits) {
        hits.sort(function (a, b) { return b.score - a.score; });
        return hits;
      });
    }

    function renderNoEnough() {
      if (!elQaAnswer) return;
      elQaAnswer.innerHTML =
        "<div class=\"qa-title\">" +
        escapeHtml(tx.qaTitle) +
        "</div><div class=\"qa-body\"><p>" +
        escapeHtml(tx.qaNoEnough) +
        "</p><p>" +
        escapeHtml(tx.qaPromptHint) +
        "</p></div>";
    }

    function renderGeneralAnswer(question, hits) {
      if (!elQaAnswer) return;
      if (!hits.length) {
        renderNoEnough();
        return;
      }
      var top = hits.slice(0, 3);
      var summary = locale === "zh"
        ? ("根据站内已检索内容，与你的问题“" + question + "”最相关的信息集中在以下段落：")
        : ("Based on the indexed site content, the most relevant passages for \"" + question + "\" are:");

      var html = "<div class=\"qa-title\">" + escapeHtml(tx.qaTitle) + "</div>";
      html += "<div class=\"qa-body\"><p><b>" + escapeHtml(tx.qaSummary) + "：</b>" + escapeHtml(summary) + "</p>";
      html += "<div><b>" + escapeHtml(tx.qaEvidence) + "：</b>";
      top.forEach(function (hit, idx) {
        html += "<p><b>" + (idx + 1) + ".</b> " + escapeHtml(hit.snippet) + "</p>";
      });
      html += "</div></div>";
      html += "<div class=\"qa-refs\"><b>" + escapeHtml(tx.qaRefs) + "：</b>" + top.map(formatRef).join("；") + "</div>";
      elQaAnswer.innerHTML = html;
    }

    function renderCompareAnswer(question, intent, anchors, hits, candidates) {
      if (!elQaAnswer) return;
      if (!hits.length || anchors.length < 2) {
        renderGeneralAnswer(question, hits);
        return;
      }

      var entities = anchors.slice(0, 2);
      var byEntity = {};
      entities.forEach(function (e) {
        byEntity[e] = hits.filter(function (h) {
          return h.matchedAnchors.indexOf(e) !== -1;
        });
      });

      if (!byEntity[entities[0]].length && !byEntity[entities[1]].length) {
        renderNoEnough();
        return;
      }

      var profileA = docProfileForPerson(entities[0], candidates);
      var profileB = docProfileForPerson(entities[1], candidates);
      var commonThemes = profileA.themes.filter(function (x) { return profileB.themes.indexOf(x) !== -1; }).slice(0, 4);
      var aOnlyThemes = profileA.themes.filter(function (x) { return profileB.themes.indexOf(x) === -1; }).slice(0, 3);
      var bOnlyThemes = profileB.themes.filter(function (x) { return profileA.themes.indexOf(x) === -1; }).slice(0, 3);

      var topA = byEntity[entities[0]][0] || null;
      var topB = byEntity[entities[1]][0] || null;
      var evidence = hits.slice(0, 4);
      var html = "<div class=\"qa-title\">" + escapeHtml(tx.qaTitle) + "</div><div class=\"qa-body\">";

      var summaryText = "";
      if (locale === "zh") {
        summaryText = "按站内可检索内容来看，" + entities[0] + "与" + entities[1] + "既有交叉点，也有关注重心差异。";
      } else {
        summaryText = "From the site evidence, " + entities[0] + " and " + entities[1] + " show both overlap and distinct emphases.";
      }
      html += "<p><b>" + escapeHtml(tx.qaSummary) + "：</b>" + escapeHtml(summaryText) + "</p>";

      if (intent !== "difference") {
        var simText = commonThemes.length
          ? (locale === "zh"
              ? ("两者在资料标签中都与以下主题相关：" + commonThemes.join("、") + "。")
              : ("Both are associated with: " + commonThemes.join(", ") + "."))
          : (locale === "zh"
              ? "在当前筛选范围中，尚未提取到明确的共同主题标签。"
              : "No strong shared theme tags were detected in the current scope.");
        html += "<p><b>" + escapeHtml(tx.qaSimilarity) + "：</b>" + escapeHtml(simText) + "</p>";
      }

      if (intent !== "similarity") {
        var diffText = locale === "zh"
          ? (entities[0] + "相关内容更偏向：" + (aOnlyThemes.length ? aOnlyThemes.join("、") : "资料尚不足") +
            "；" + entities[1] + "更偏向：" + (bOnlyThemes.length ? bOnlyThemes.join("、") : "资料尚不足") + "。")
          : (entities[0] + " leans toward: " + (aOnlyThemes.length ? aOnlyThemes.join(", ") : "insufficient data") +
            "; " + entities[1] + " leans toward: " + (bOnlyThemes.length ? bOnlyThemes.join(", ") : "insufficient data") + ".");
        html += "<p><b>" + escapeHtml(tx.qaDifference) + "：</b>" + escapeHtml(diffText) + "</p>";
      }

      html += "<div><b>" + escapeHtml(tx.qaEvidence) + "：</b>";
      if (topA) html += "<p><b>" + escapeHtml(entities[0]) + "：</b>" + escapeHtml(topA.snippet) + "</p>";
      if (topB) html += "<p><b>" + escapeHtml(entities[1]) + "：</b>" + escapeHtml(topB.snippet) + "</p>";
      html += "</div></div>";
      html += "<div class=\"qa-refs\"><b>" + escapeHtml(tx.qaRefs) + "：</b>" + evidence.map(formatRef).join("；") + "</div>";
      elQaAnswer.innerHTML = html;
    }

    function askQuestion() {
      var q = (elQaInput && elQaInput.value ? String(elQaInput.value) : "").trim();
      if (!q) {
        if (elQaAnswer) elQaAnswer.textContent = tx.qaEmpty;
        return;
      }
      if (elQaAnswer) elQaAnswer.textContent = tx.qaThinking;

      var candidates = docsInFilter();
      if (!candidates.length) candidates = docs.slice();
      var anchors = extractAnchors(q);
      var intent = detectQuestionIntent(q);

      collectQAHits(q, candidates, anchors)
        .then(function (allHits) {
          if (!allHits.length) {
            renderNoEnough();
            return;
          }
          if (intent === "compare" || intent === "difference" || intent === "similarity") {
            renderCompareAnswer(q, intent, anchors, allHits, candidates);
            return;
          }
          renderGeneralAnswer(q, allHits);
        })
        .catch(function () {
          renderNoEnough();
        });
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
      elSearch.addEventListener("keydown", function (e) {
        if (e.key === "Enter") searchInDoc();
      });
    }

    if (elQaAsk) elQaAsk.addEventListener("click", askQuestion);
    if (elQaInput) {
      elQaInput.addEventListener("keydown", function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
          askQuestion();
        }
      });
    }

    window.addEventListener("storage", function () {
      renderPage();
    });

    loadHash();
    renderFilters();
    renderDocList();
    updateIllustration();
    renderPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
