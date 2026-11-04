window.Layout = (function () {
  const LAYOUT_KEY = "molive-layout-v1";
  let gridEl = null;
  let buttonsEl = null;

  function apply(l) {
    if (!["solo", "split-h", "split-v", "grid-4"].includes(l)) l = "solo";
    if (gridEl) gridEl.className = "grid layout-" + l;
    if (buttonsEl) {
      buttonsEl.querySelectorAll("button").forEach(b => {
        b.classList.toggle("active", b.dataset.layout === l);
      });
    }
    try { localStorage.setItem(LAYOUT_KEY, l); } catch (e) {}
  }

  function init() {
    gridEl = document.getElementById("grid");
    buttonsEl = document.getElementById("layouts");
    buttonsEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-layout]");
      if (btn) apply(btn.dataset.layout);
    });
    let saved = "solo";
    try { saved = localStorage.getItem(LAYOUT_KEY) || "solo"; } catch (e) {}
    apply(saved);
  }

  return { init, apply };
})();
