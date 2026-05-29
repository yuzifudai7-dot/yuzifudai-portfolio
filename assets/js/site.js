(function () {
  var ACCESS_STORAGE_KEY = "access_granted_v1";

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

  function getAccessConfig() {
    var cfg = window.ACCESS || {};
    return {
      previewCount: typeof cfg.previewCount === "number" ? cfg.previewCount : 2,
      hash: typeof cfg.hash === "string" ? cfg.hash : "",
    };
  }

  function isUnlocked() {
    try {
      return localStorage.getItem(ACCESS_STORAGE_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function setUnlocked(flag) {
    try {
      if (flag) localStorage.setItem(ACCESS_STORAGE_KEY, "1");
      else localStorage.removeItem(ACCESS_STORAGE_KEY);
    } catch (_) {}
  }

  function uiText(locale) {
    if (locale === "zh") {
      return {
        locked: "未解锁",
        unlocked: "已解锁",
        lockTitle: "🔒 注册 / 登录后可查看完整内容",
        lockHint: "公开预览仅展示部分；解锁后可查看全部 PDF 链接。",
        open: "去解锁",
        close: "关闭",
        ok: "已解锁，可以查看全部内容。",
        bad: "访问码不正确，请重试。",
        loggedOut: "已退出。",
        missing: "请先输入访问码。",
      };
    }
    return {
      locked: "Locked",
      unlocked: "Unlocked",
      lockTitle: "🔒 Register / sign in to view full content",
      lockHint: "Public preview shows only part; unlock to access all PDF links.",
      open: "Unlock",
      close: "Close",
      ok: "Unlocked. Full content is now available.",
      bad: "Invalid access code. Please try again.",
      loggedOut: "Logged out.",
      missing: "Please enter an access code.",
    };
  }

  function bytesToHex(bytes) {
    var hex = "";
    for (var i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
  }

  function sha256Hex(text) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve("");
    var enc = new TextEncoder();
    return crypto.subtle.digest("SHA-256", enc.encode(text)).then(function (buf) {
      return bytesToHex(new Uint8Array(buf));
    });
  }

  function setupAccessUI(locale, onChange) {
    var t = uiText(locale);
    var modal = document.getElementById("access-modal");
    var status = document.getElementById("access-status");
    var email = document.getElementById("access-email");
    var code = document.getElementById("access-code");
    var msg = document.getElementById("access-message");
    var btnUnlock = document.getElementById("access-unlock");
    var btnLogout = document.getElementById("access-logout");
    var btnClose = document.getElementById("access-close");

    function syncStatus() {
      if (!status) return;
      status.textContent = isUnlocked() ? t.unlocked : t.locked;
    }

    function openModal() {
      if (!modal) return;
      modal.classList.add("open");
      if (msg) msg.textContent = "";
      setTimeout(function () {
        if (code) code.focus();
      }, 0);
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove("open");
      if (code) code.value = "";
    }

    function bindOpen(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("click", function (e) {
        e.preventDefault();
        openModal();
      });
    }

    bindOpen("open-access");
    bindOpen("open-access-mobile");
    bindOpen("open-access-cta");

    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal && modal.classList.contains("open")) closeModal();
    });

    if (btnClose) btnClose.addEventListener("click", closeModal);

    if (btnLogout) {
      btnLogout.addEventListener("click", function () {
        setUnlocked(false);
        syncStatus();
        if (msg) msg.textContent = t.loggedOut;
        if (typeof onChange === "function") onChange();
      });
    }

    if (btnUnlock) {
      btnUnlock.addEventListener("click", function () {
        var cfg = getAccessConfig();
        var v = (code && code.value ? String(code.value) : "").trim();
        if (!v) {
          if (msg) msg.textContent = t.missing;
          return;
        }
        sha256Hex(v).then(function (hex) {
          if (hex && cfg.hash && hex === cfg.hash) {
            setUnlocked(true);
            syncStatus();
            if (msg) msg.textContent = t.ok;
            if (email && email.value) {
              try {
                localStorage.setItem("access_email_hint_v1", String(email.value).trim());
              } catch (_) {}
            }
            if (typeof onChange === "function") onChange();
            setTimeout(closeModal, 450);
          } else {
            if (msg) msg.textContent = t.bad;
          }
        });
      });
    }

    syncStatus();
  }

  function renderProjects(locale) {
    var target = document.querySelector("[data-projects]");
    if (!target) return;
    var items = (window.PORTFOLIO_PROJECTS || []).slice();
    var cfg = getAccessConfig();
    var unlocked = isUnlocked();
    var t = uiText(locale);
    target.innerHTML = "";

    items.forEach(function (p, idx) {
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

      var shouldLock = !unlocked && idx >= cfg.previewCount;

      if (!shouldLock && Array.isArray(p.links) && p.links.length) {
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

      if (shouldLock) {
        card.classList.add("locked");
        var overlay = document.createElement("div");
        overlay.className = "lock-overlay";
        var box = document.createElement("div");
        box.className = "lock-box";
        var b = document.createElement("b");
        b.textContent = t.lockTitle;
        var hint = document.createElement("p");
        hint.textContent = t.lockHint;
        var actions = document.createElement("div");
        actions.className = "lock-actions";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn primary";
        btn.textContent = t.open;
        btn.addEventListener("click", function () {
          var open = document.getElementById("open-access");
          if (open) open.click();
        });
        actions.appendChild(btn);
        box.appendChild(b);
        box.appendChild(hint);
        box.appendChild(actions);
        overlay.appendChild(box);
        card.appendChild(overlay);
      }

      target.appendChild(card);
    });
  }

  var locale = getLocaleFromPath();
  savePreferredLocale(locale);
  setupAccessUI(locale, function () {
    renderProjects(locale);
  });
  renderProjects(locale);
})();
