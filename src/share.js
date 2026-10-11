// share.js - "Share link" button: copies the full current URL to the clipboard.
// Self-contained: it only needs the #share-btn button from index.html.
// main.js already keeps the address bar up to date with
// ?country=...&state=...&district=...&crop=...&layers=...
// so location.href is always a link that reopens the same view.

(function () {
  const btn = document.getElementById("share-btn");
  if (!btn) return;

  const label = btn.querySelector(".share-label");
  const original = label ? label.textContent : btn.textContent;
  let timer = null;

  function flash(text, ok) {
    if (label) label.textContent = text;
    else btn.textContent = text;
    btn.classList.toggle("share-ok", !!ok);
    btn.classList.toggle("share-fail", ok === false);
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (label) label.textContent = original;
      else btn.textContent = original;
      btn.classList.remove("share-ok", "share-fail");
    }, 2000);
  }

  // Works on http pages and inside iframes where navigator.clipboard is blocked.
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  async function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        // blocked (for example inside an iframe): use the fallback
      }
    }
    return fallbackCopy(text);
  }

  btn.addEventListener("click", async () => {
    const url = location.href; // full URL including all selections
    const ok = await copy(url);
    if (ok) {
      flash("Link copied!", true);
    } else {
      // Last resort: let the user copy it by hand.
      window.prompt("Copy this link:", url);
      flash("Copy failed", false);
    }
  });

  // Look of the button (move these rules into style.css if you prefer).
  const css = document.createElement("style");
  css.textContent =
    "#share-btn{cursor:pointer;font:inherit;font-size:13px;padding:5px 10px;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit;margin-left:8px}" +
    "#share-btn:hover{background:rgba(0,0,0,.06)}" +
    "#share-btn.share-ok{border-color:#1a7f37;color:#1a7f37}" +
    "#share-btn.share-fail{border-color:#b42318;color:#b42318}";
  document.head.appendChild(css);
})();
