window.Youtube = (function () {
  // 動画ID → 埋め込みiframeのURL
  function buildEmbedUrl(videoId) {
    return "https://www.youtube.com/embed/" + videoId +
      "?autoplay=1&mute=1&playsinline=1";
  }

  // チャンネルID → HLSで再生（低遅延・配信切替に追従）
  function renderChannel(cell, channelId, onClear) {
    cell.innerHTML =
      '<video class="yt-video" controls autoplay muted playsinline></video>' +
      '<button class="clear-btn" title="解除">×</button>';

    const video = cell.querySelector(".yt-video");
    const hlsUrl = "https://ythls.kekikakademi.org/youtube/channel/" +
      channelId + ".m3u8";

    const bindClear = () => {
      const btn = cell.querySelector(".clear-btn");
      if (btn) btn.onclick = (e) => { e.stopPropagation(); onClear(); };
    };

    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(window.Hls.Events.ERROR, (e, d) => {
        if (d.fatal) {
          cell.innerHTML =
            '<div class="notice"><div>現在配信していません</div></div>' +
            '<button class="clear-btn" title="解除">×</button>';
          bindClear();
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
    bindClear();
  }

  return { buildEmbedUrl, renderChannel };
})();
