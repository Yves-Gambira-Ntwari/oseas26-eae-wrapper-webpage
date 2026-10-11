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
    if (!event.data || typeof event.data !== "object") return;

    if (event.data.type === "eae:ready") {
      isReady = true;
      if (readyTimeout) {
        clearTimeout(readyTimeout);
        readyTimeout = null;
      }

      hideLoader();

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
    if (options.inputs) params.set("inputs", String(options.inputs));

    const base = typeof EAE_APP !== "undefined" ? EAE_APP : "http://localhost:3000/tool/a/";
    return base + "?" + params.toString();
  }

  function load(geographyId, options = {}) {
    if (!frame) frame = document.getElementById("eae-frame");
    if (!frame) return;

    currentGeographyId = geographyId;
    isReady = false;
    pendingMessages = [];

    const loader = document.getElementById("eae-loader");
    if (loader) loader.style.display = "flex";

    const errEl = document.getElementById("eae-error");
    if (errEl) errEl.style.display = "none";

    const url = buildUrl(geographyId, options);
    frame.src = url;

    // Update the "Open full map" link
    const fullMapLink = document.getElementById("full-map-link");
    if (fullMapLink) {
      const standaloneUrl = url.replace(/([?&])embed=1&?/, "$1").replace(/[?&]$/, "");
      fullMapLink.href = standaloneUrl;
    }

    const errLink = document.getElementById("eae-error-link");
    if (errLink) {
      const standaloneUrl = url.replace(/([?&])embed=1&?/, "$1").replace(/[?&]$/, "");
      errLink.href = standaloneUrl;
    }

    if (readyTimeout) clearTimeout(readyTimeout);
    readyTimeout = setTimeout(() => {
      if (!isReady) {
        if (loader) loader.style.display = "none";
        if (errEl) errEl.style.display = "flex";
      }
    }, 20000);
  }

  function send(data) {
    if (!isReady) {
      pendingMessages.push(data);
      return;
    }
    if (!frame) frame = document.getElementById("eae-frame");
    if (!frame || !frame.contentWindow) return;

    const message = { type: "eae:set", ...data };
    try {
      frame.contentWindow.postMessage(message, "*");
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
  };
})();

// ---- Boundary & Geometry helpers -------------------------------------------
function fitEnvelope(env) {
  if (!Array.isArray(env) || env.length < 4) return;
  const center = {
    lng: +((env[0] + env[2]) / 2).toFixed(4),
    lat: +((env[1] + env[3]) / 2).toFixed(4),
  };
  EaeController.setView({ center, zoom: 8 });
}

function showDistrict(features) {
  if (!features || !features.length) return;
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

  function scanCoords(coords) {
    if (typeof coords[0] === "number") {
      const lng = coords[0];
      const lat = coords[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      coords.forEach(scanCoords);
    }
  }

  features.forEach((f) => {
    if (f.geometry && f.geometry.coordinates) {
      scanCoords(f.geometry.coordinates);
    }
  });

  if (isFinite(minLng) && isFinite(minLat)) {
    const center = {
      lng: +((minLng + maxLng) / 2).toFixed(4),
      lat: +((minLat + maxLat) / 2).toFixed(4),
    };
    EaeController.setView({ center, zoom: 9 });
  }
}

function clearDistrictLayer() {}

function setClip(features) {}

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

  const activeIdentifiers = [
    ...Object.keys(active),
    ...Object.values(active).map((a) => a.name),
  ];
  EaeController.send({ inputs: activeIdentifiers });

  return { shown: active[id].shown, total: active[id].total };
}

function removeDataLayer(id) {
  if (!active[id]) return;
  delete active[id];
  const activeIdentifiers = [
    ...Object.keys(active),
    ...Object.values(active).map((a) => a.name),
  ];
  EaeController.send({ inputs: activeIdentifiers });
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

function zoomToLayer(id) {
  return true;
}

function clearAllLayers() {
  active = {};
  colorIdx = 0;
  EaeController.send({ inputs: [] });
}

