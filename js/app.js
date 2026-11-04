(function () {
  "use strict";

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

  // ---------- 保存・復元 ----------
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

    // カスタム埋め込みタグ（ニコニコ共有タグなど）
    if (data.rawEmbed) {
      cell.innerHTML = data.rawEmbed + '<button class="clear-btn" title="解除">×</button>';
      bindClear(cell, i);
      return;
    }

    // YouTube チャンネル固定（HLS）
    if (data.platform === "YouTube (チャンネル)" && data.channelId) {
      cell.innerHTML =
        '<video class="yt-video" controls autoplay muted playsinline></video>' +
        '<button class="clear-btn" title="解除">×</button>';
      const video = cell.querySelector(".yt-video");
      const hlsUrl = "https://ythls.kekikakademi.org/youtube/channel/" + data.channelId + ".m3u8";

      if (window.Hls && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (e, d) => {
          if (d.fatal) {
            cell.innerHTML =
              '<div class="notice"><div>現在配信していません</div></div>' +
              '<button class="clear-btn" title="解除">×</button>';
            bindClear(cell, i);
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl;
        video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
      } else {
        cell.innerHTML =
          '<div class="notice"><div>このブラウザはHLS再生に対応していません</div></div>' +
          '<button class="clear-btn" title="解除">×</button>';
      }
      bindClear(cell, i);
      return;
    }

    // ニコニコ生放送（許可リスト or フォールバック）
    if (data.platform === "ニコニコ生放送") {
      if (window.Nico.isAllowed(data.nicoLiveId)) {
        cell.innerHTML = window.Nico.getEmbed(data.nicoLiveId) +
          '<button class="clear-btn" title="解除">×</button>';
      } else {
        cell.innerHTML = window.Nico.buildFallback(data.nicoLiveId) +
          '<button class="clear-btn" title="解除">×</button>';
      }
      bindClear(cell, i);
      return;
    }

    // 通常のiframe（YouTube動画・Twitch・ニコニコ動画）
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

  // ---------- 起動 ----------
  window.Layout.init();
  window.Nico.load().then(() => {
    restore();
    for (let i = 0; i < 4; i++) paint(i);
  });
})();
