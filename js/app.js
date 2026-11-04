(function () {
  "use strict";

  // グローバルエラーを画面に表示（デバッグ用）
  window.addEventListener("error", (e) => {
    if (document.getElementById("global-error")) return;
    const div = document.createElement("div");
    div.id = "global-error";
    div.style.cssText =
      "position:fixed;left:10px;right:10px;bottom:10px;z-index:9999;" +
      "background:#c01838;color:#fff;padding:10px 14px;border-radius:8px;" +
      "font:12px/1.5 monospace;white-space:pre-wrap;";
    div.textContent = "ERROR: " + (e.message || e.error) +
      "\n" + (e.filename || "") + ":" + (e.lineno || "");
    document.body.appendChild(div);
  });

  const cells     = Array.from(document.querySelectorAll(".cell"));
  const overlay   = document.getElementById("overlay");
  const urlInput  = document.getElementById("urlInput");
  const embedInput= document.getElementById("embedInput");
  const hint      = document.getElementById("hint");
  const okBtn     = document.getElementById("okBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  const STORAGE_KEY = "molive-v1";

  let activeIndex = null;
  let pending     = null;
  let state       = [null, null, null, null];

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function restore() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(s) && s.length === 4) state = s;
    } catch (e) {}
  }

  // ---------- 描画 ----------
  function renderEmpty(cell, i) {
    cell.classList.remove("filled");
    cell.innerHTML =
      '<div class="placeholder">' +
        '<div class="plus">+</div>' +
        '<div class="label">タップで挿入</div>' +
      '</div>';
    cell.onclick = () => openModal(i);
  }

  function bindClear(cell, i) {
    const btn = cell.querySelector(".clear-btn");
    if (btn) btn.onclick = (e) => {
      e.stopPropagation();
      state[i] = null;
      persist();
      renderEmpty(cell, i);
    };
  }

  function renderFilled(cell, i) {
    const data = state[i];
    cell.classList.add("filled");
    cell.onclick = null;

    // 1) カスタム埋め込みタグ（ニコニコ共有タグなど）
    if (data.rawEmbed) {
      cell.innerHTML = data.rawEmbed +
        '<button class="clear-btn" title="解除">×</button>';
      bindClear(cell, i);
      return;
    }

    // 2) YouTube チャンネル固定（HLS）→ youtube.js に委譲
    if (data.platform === "YouTube (チャンネル)" && data.channelId) {
      if (!window.Youtube) {
        cell.innerHTML =
          '<div class="notice"><div>js/youtube.js が読み込まれていません</div></div>' +
          '<button class="clear-btn" title="解除">×</button>';
        bindClear(cell, i);
        return;
      }
      window.Youtube.renderChannel(cell, data.channelId, () => {
        state[i] = null; persist(); renderEmpty(cell, i);
      });
      return;
    }

    // 3) ニコニコ生放送
    if (data.platform === "ニコニコ生放送") {
      if (window.Nico && window.Nico.isAllowed(data.nicoLiveId)) {
        cell.innerHTML = window.Nico.getEmbed(data.nicoLiveId) +
          '<button class="clear-btn" title="解除">×</button>';
      } else {
        const fallback = window.Nico
          ? window.Nico.buildFallback(data.nicoLiveId)
          : '<div class="notice"><div>ニコニコモジュール未読込</div></div>';
        cell.innerHTML = fallback +
          '<button class="clear-btn" title="解除">×</button>';
      }
      bindClear(cell, i);
      return;
    }

    // 4) 通常のiframe（YouTube動画・Twitch・ニコニコ動画）
    if (data.embed) {
      cell.innerHTML =
        '<iframe src="' + data.embed + '" ' +
          'allow="autoplay; fullscreen; picture-in-picture; encrypted-media" ' +
          'allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
        '<button class="clear-btn" title="解除">×</button>';
      bindClear(cell, i);
      return;
    }

    renderEmpty(cell, i);
  }

  function paint(i) {
    if (state[i]) renderFilled(cells[i], i);
    else          renderEmpty(cells[i], i);
  }

  // ---------- モーダル ----------
  function setHint(text, cls) {
    hint.textContent = text;
    hint.className = "hint" + (cls ? " " + cls : "");
  }

  function openModal(i) {
    activeIndex = i;
    pending = null;
    urlInput.value = "";
    embedInput.value = "";
    okBtn.disabled = true;
    setHint("", "");
    overlay.classList.add("open");
    setTimeout(() => urlInput.focus(), 50);
  }
  function closeModal() {
    overlay.classList.remove("open");
    activeIndex = null;
    pending = null;
  }

  urlInput.addEventListener("input", () => {
    embedInput.value = "";
    if (!window.Platforms) {
      setHint("js/platforms.js が読み込まれていません", "err");
      okBtn.disabled = true;
      return;
    }
    const r = window.Platforms.parse(urlInput.value);
    if (r.error) {
      pending = null;
      okBtn.disabled = true;
      setHint(urlInput.value.trim() ? r.error : "", urlInput.value.trim() ? "err" : "");
    } else if (r.embed || r.channelId || r.nicoLiveId) {
      pending = r;
      okBtn.disabled = false;
      setHint("✓ " + r.platform + " を挿入します", "ok");
    } else {
      pending = null;
      okBtn.disabled = true;
      setHint("", "");
    }
  });

  embedInput.addEventListener("input", () => {
    const v = embedInput.value.trim();
    if (v) {
      urlInput.value = "";
      pending = { platform: "カスタム埋め込み", rawEmbed: v };
      okBtn.disabled = false;
      setHint("✓ 埋め込みタグを挿入します", "ok");
    } else {
      pending = null;
      okBtn.disabled = true;
      setHint("", "");
    }
  });

  function commit() {
    if (activeIndex === null || !pending) return;
    state[activeIndex] = pending;
    persist();
    paint(activeIndex);
    closeModal();
  }

  okBtn.addEventListener("click", commit);
  cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && pending) commit(); });

  // ---------- 起動：まず即描画、Nico読込は後追い ----------
  if (window.Layout) window.Layout.init();
  restore();
  for (let i = 0; i < 4; i++) paint(i);

  // ニコニコの許可リストは後から読み込む（失敗してもサイトは動く）
  if (window.Nico) {
    window.Nico.load().then(() => {
      // ニコ生セルがあれば再描画
      for (let i = 0; i < 4; i++) {
        if (state[i] && state[i].platform === "ニコニコ生放送") paint(i);
      }
    }).catch((err) => {
      console.warn("Nico load failed:", err);
    });
  }
})();
