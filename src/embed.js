// src/embed.js - builds the iframe URL, controls the embedded EAE map,
// and coordinates postMessage communication and layer state.

const esc = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Layer state tracking (shared with main.js)
let active = {};
let colorIdx = 0;

const EaeController = (function () {
  let frame = null;
  let isReady = false;
  let readyTimeout = null;
  let onReadyCallbacks = [];
  let pendingMessages = [];
  let currentGeographyId = null;
  let currentSnapshot = null;
  let divisionsPayload = [];
  let lastView = null; // { zoom, center: { lng, lat } }

  function init(frameElementId) {
    frame = document.getElementById(frameElementId);
    if (!frame) return;

    window.addEventListener("message", handleMessage);

    frame.addEventListener("load", () => {
      setTimeout(hideLoader, 1000);
    });

    // Fallback: If iframe painted before main scripts attached, dismiss loader
    setTimeout(hideLoader, 2500);
  }

  function hideLoader() {
    const loader = document.getElementById("eae-loader");
    if (loader) loader.style.display = "none";

    const errEl = document.getElementById("eae-error");
    if (errEl) errEl.style.display = "none";
  }

  function handleMessage(event) {
    const frameEl = frame || document.getElementById("eae-frame");
    if (typeof EAE_ORIGIN !== "undefined" && event.origin !== EAE_ORIGIN) return;
    if (frameEl && event.source !== frameEl.contentWindow) return;
    if (!event.data || typeof event.data !== "object") return;

    if (event.data.type === "eae:ready") {
      isReady = true;
      if (readyTimeout) {
        clearTimeout(readyTimeout);
        readyTimeout = null;
      }

      hideLoader();
      console.log("[Wrapper] eae:ready received with divisions:", event.data.divisions);

      if (Array.isArray(event.data.divisions)) {
        divisionsPayload = event.data.divisions;
        if (typeof window.onDivisionsLoaded === "function") {
          window.onDivisionsLoaded(divisionsPayload);
        }
      }

      pendingMessages.forEach((msg) => send(msg));
      pendingMessages = [];

      onReadyCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.error("onReady callback error:", e);
        }
      });
      onReadyCallbacks = [];
    } else if (event.data.type === "eae:view") {
      lastView = {
        zoom: event.data.zoom,
        center: event.data.center,
      };
      if (typeof window.onEaeViewChanged === "function") {
        window.onEaeViewChanged(lastView);
      }
    }
  }

  function buildUrl(geographyId, options = {}) {
    const geoId = String(geographyId || DEFAULT_GEOGRAPHY_ID).trim();
    const params = new URLSearchParams();
    params.set("id", geoId);
    params.set("embed", "1");

    if (options.snapshot) params.set("snapshot", String(options.snapshot).trim());
    if (options.zoom !== undefined) params.set("zoom", String(options.zoom));
    if (options.lng !== undefined && options.lat !== undefined) {
      params.set("lng", String(options.lng));
      params.set("lat", String(options.lat));
    }
    if (options.divtier !== undefined) params.set("divtier", String(options.divtier));
    if (options.subdiv !== undefined) params.set("subdiv", String(options.subdiv));
    if (options.view) params.set("view", String(options.view));
    if (options.criteria !== undefined) params.set("criteria", options.criteria ? "1" : "0");

    const base = typeof EAE_APP !== "undefined" ? EAE_APP : "http://localhost:3000/tool/a/";
    return base + "?" + params.toString();
  }

  function load(geographyId, options = {}) {
    if (!frame) frame = document.getElementById("eae-frame");
    if (!frame) return;

    const targetSnapshot = options.snapshot || null;
    const isSameTarget = currentGeographyId === geographyId && currentSnapshot === targetSnapshot;

    if (isSameTarget && isReady) {
      if (options.center || options.zoom) setView(options);
      return;
    }

    currentGeographyId = geographyId;
    currentSnapshot = targetSnapshot;
    isReady = false;
    pendingMessages = [];

    const loader = document.getElementById("eae-loader");
    if (loader) loader.style.display = "flex";

    const errEl = document.getElementById("eae-error");
    if (errEl) errEl.style.display = "none";

    const url = buildUrl(geographyId, options);
    if (frame.src !== url) {
      frame.src = url;
    }

    if (readyTimeout) clearTimeout(readyTimeout);
    readyTimeout = setTimeout(() => {
      if (!isReady) {
        if (loader) loader.style.display = "none";
        if (errEl) errEl.style.display = "flex";
      }
    }, 15000);
  }

  function send(data) {
    if (!isReady) {
      pendingMessages.push(data);
      return;
    }
    if (!frame) frame = document.getElementById("eae-frame");
    if (!frame || !frame.contentWindow) return;

    const message = { type: "eae:set", ...data };
    const targetOrigin = typeof EAE_ORIGIN !== "undefined" ? EAE_ORIGIN : "http://localhost:3000";
    try {
      frame.contentWindow.postMessage(message, targetOrigin);
    } catch (e) {
      console.warn("Could not postMessage to EAE iframe:", e);
    }
  }

  function whenReady(callback) {
    if (isReady) callback();
    else onReadyCallbacks.push(callback);
  }

  function setView(options) {
    if (isReady) {
      send(options);
    } else {
      whenReady(() => send(options));
    }
  }

  return {
    init,
    load,
    send,
    whenReady,
    setView,
    buildUrl,
    hideLoader,
    get isReady() {
      return isReady;
    },
    get divisions() {
      return divisionsPayload;
    },
    get lastView() {
      return lastView;
    },
  };
})();

// ---- Boundary & Layer synchronization helpers -----------------------------
function fitEnvelope(env) {
  if (!Array.isArray(env) || env.length < 4) return;
  const center = {
    lng: +((env[0] + env[2]) / 2).toFixed(4),
    lat: +((env[1] + env[3]) / 2).toFixed(4),
  };
  EaeController.setView({ center, zoom: 8 });
}

function addDataLayer(id, name, gj) {
  const color = COLORS[colorIdx++ % COLORS.length];
  active[id] = {
    color,
    defaultColor: color,
    opacity: DEFAULT_OPACITY,
    name,
    raw: gj,
    shown: (gj && gj.features ? gj.features.length : 1),
    total: (gj && gj.features ? gj.features.length : 1),
  };

  // Sync with EAE via layers: { on, off }
  EaeController.send({ layers: { on: [name], off: [] } });

  return { shown: active[id].shown, total: active[id].total };
}

function removeDataLayer(id) {
  if (!active[id]) return;
  const name = active[id].name;
  delete active[id];

  // Sync with EAE via layers: { on, off }
  EaeController.send({ layers: { on: [], off: [name] } });
}

function setLayerStyle(id, { color, opacity }) {
  const a = active[id];
  if (!a) return;
  if (color) a.color = color;
  if (opacity !== undefined && opacity !== null) a.opacity = opacity;
}

function resetLayerStyle(id) {
  const a = active[id];
  if (a) a.color = a.defaultColor;
}

function clearAllLayers() {
  const names = Object.values(active).map((a) => a.name);
  active = {};
  colorIdx = 0;
  if (names.length) {
    EaeController.send({ layers: { on: [], off: names } });
  }
}
