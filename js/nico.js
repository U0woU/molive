window.Nico = (function () {
  let allowed = [];

  async function load() {
    try {
      const res = await fetch("data/nico-channels.json");
      allowed = await res.json();
    } catch (e) {
      allowed = [];
    }
  }

  function isAllowed(liveId) {
    return allowed.some(a => a.liveId === liveId && a.embed);
  }

  function getEmbed(liveId) {
    const item = allowed.find(a => a.liveId === liveId);
    return item ? item.embed : null;
  }

  function buildFallback(liveId) {
    return '<div class="notice">' +
      '<div>この放送は埋め込みタグが必要です</div>' +
      '<div>放送ページの「共有」→埋め込みタグを上の欄に貼ってください</div>' +
      '<a href="https://live.nicovideo.jp/watch/' + liveId + '" target="_blank" rel="noopener">ニコニコで開く</a>' +
      '</div>';
  }

  return { load, isAllowed, getEmbed, buildFallback };
})();
