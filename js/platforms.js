window.Platforms = (function () {
  const parentHost = location.hostname || "localhost";

  function parse(raw) {
    const s = (raw || "").trim();
    if (!s) return { error: "" };

    let url;
    try {
      const norm = /^[a-z]+:\/\//i.test(s) ? s : "https://" + s;
      url = new URL(norm);
    } catch (e) {
      return { error: "URLの形式が正しくありません" };
    }

    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = url.pathname;

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      const ch = path.match(/^\/channel\/(UC[\w-]+)/);
      if (ch) return { platform: "YouTube (チャンネル)", channelId: ch[1], embed: null };

      let id = null;
      if (host === "youtu.be") id = path.split("/").filter(Boolean)[0];
      else if (path === "/watch") id = url.searchParams.get("v");
      else if (/^\/(live|embed|shorts)\//.test(path)) id = path.split("/").filter(Boolean)[1];
      if (!id) return { error: "YouTube: 動画IDを特定できません（チャンネルは /channel/UC... 形式）" };
      return {
        platform: "YouTube (動画)",
        embed: "https://www.youtube.com/embed/" + id + "?autoplay=1&mute=1&playsinline=1"
      };
    }

    if (host === "twitch.tv" || host === "m.twitch.tv" || host === "player.twitch.tv") {
      const seg = path.split("/").filter(Boolean);
      if (seg[0] === "videos" && seg[1]) {
        return {
          platform: "Twitch (VOD)",
          embed: "https://player.twitch.tv/?video=" + seg[1] +
                 "&parent=" + parentHost + "&autoplay=true&muted=true"
        };
      }
      if (seg[0]) {
        return {
          platform: "Twitch",
          embed: "https://player.twitch.tv/?channel=" + seg[0] +
                 "&parent=" + parentHost + "&autoplay=true&muted=true"
        };
      }
      return { error: "Twitch: チャンネル名を特定できません" };
    }

    if (host === "nicovideo.jp" || host === "live.nicovideo.jp" || host === "sp.nicovideo.jp") {
      const seg = path.split("/").filter(Boolean);
      if (seg[0] === "watch" && seg[1]) {
        return { platform: "ニコニコ動画", embed: "https://embed.nicovideo.jp/watch/" + seg[1] + "?autoplay=1" };
      }
      if (seg[0] === "live" && seg[1]) {
        return { platform: "ニコニコ生放送", nicoLiveId: seg[1], embed: null };
      }
      if (seg.length === 1 && /^lv\d+$/.test(seg[0])) {
        return { platform: "ニコニコ生放送", nicoLiveId: seg[0], embed: null };
      }
      return { error: "ニコニコ: 動画ID/放送IDを特定できません" };
    }

    return { error: "対応URLではありません（YouTube / Twitch / ニコニコ）" };
  }

  return { parse };
})();
