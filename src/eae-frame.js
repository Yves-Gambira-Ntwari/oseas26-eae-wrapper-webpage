// eae-frame.js - builds the EAE iframe URL and (later) talks to it via postMessage.
// Two modes:
//   "url"     (default) reload the iframe with ?id=&inputs=&snapshot=
//   "message" used when the embed replies with { type: "eae:ready" }

let frameMode = "url";
let frameEl = null;
let onReady = null;

function eaeFrameInit(iframe, readyCallback) {
  frameEl = iframe;
  onReady = readyCallback || null;
  window.addEventListener("message", onEaeMessage);
}

function onEaeMessage(event) {
  if (event.origin !== EAE_ORIGIN) return;
  if (!frameEl || event.source !== frameEl.contentWindow) return;
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "eae:ready") {
    frameMode = "message";
    if (onReady) onReady();
  }
}

function buildEaeUrl({ geographyId, inputs, snapshot }) {
  const url = new URL(EAE_APP_PATH, EAE_ORIGIN);
  if (geographyId) url.searchParams.set("id", geographyId);
  if (snapshot) url.searchParams.set("snapshot", snapshot);
  const names = (inputs || []).filter(Boolean);
  if (names.length) url.searchParams.set("inputs", names.join(","));
  url.searchParams.set("embed", "1");
  return url.toString();
}

// Always re-apply the wrapper selection so dropdowns override in-iframe edits.
function showInEae(sel) {
  const src = buildEaeUrl(sel);
  if (frameMode === "message" && frameEl && frameEl.contentWindow) {
    try {
      frameEl.contentWindow.postMessage(
        {
          type: "eae:set",
          geographyId: sel.geographyId || null,
          inputs: sel.inputs || [],
          snapshot: sel.snapshot || null,
          collapsePanels: true,
        },
        EAE_ORIGIN,
      );
      return src;
    } catch (e) {
      frameMode = "url";
    }
  }
  if (frameEl) {
    if (frameEl.getAttribute("src") === src) frameEl.src = "about:blank";
    frameEl.src = src;
  }
  return src;
}

function openEaeTab(sel) {
  window.open(buildEaeUrl(sel), "_blank", "noopener,noreferrer");
}

// Scale the iframe so EAE sees a desktop-sized window on phones.
function fitEaeFrame(host) {
  if (!host || !frameEl) return;
  const w = host.clientWidth;
  const h = host.clientHeight;
  if (w <= 0 || h <= 0) return;

  const needScale = w < EAE_MIN_WIDTH;
  const innerW = needScale ? EAE_MIN_WIDTH : w;
  const scale = w / innerW;
  const innerH = Math.max(EAE_MIN_HEIGHT, h / scale);

  frameEl.style.width = innerW + "px";
  frameEl.style.height = innerH + "px";
  frameEl.style.transform = scale < 0.999 ? "scale(" + scale + ")" : "none";
}
