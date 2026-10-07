// embed.js - everything that draws on the main Leaflet map.
// Knows nothing about dropdowns or the API.

const map = L.map("map", {
  // tolerance makes thin lines easier to hover
  renderer: L.canvas({ tolerance: 6 }),
  zoomControl: false,
}).setView(MAP_DEFAULT.center, MAP_DEFAULT.zoom);
L.control.zoom({ position: "topright" }).addTo(map);
L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(
  map,
);

// dataset id -> { layer, color, defaultColor, opacity, name, raw, shown, total }
const active = {};
let colorIdx = 0;
let districtLayer = null;

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

// ---- Feature text: click popup + hover tooltip -----------------------------
function attrRows(props, max, cut) {
  return Object.entries(props || {})
    .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
    .slice(0, max)
    .map(
      ([k, v]) =>
        "<tr><td><b>" + esc(k) + "</b></td><td>" + esc(String(v).slice(0, cut)) + "</td></tr>",
    )
    .join("");
}

// A readable name for a feature, if it has a name-like attribute.
function featureTitle(props) {
  const entries = Object.entries(props || {}).filter(
    ([, v]) => typeof v === "string" && v.trim(),
  );
  const hit =
    entries.find(([k]) => /^(name|title|label)$/i.test(k)) ||
    entries.find(([k]) => /name/i.test(k));
  return hit ? hit[1].trim() : "";
}

const dot = (color) =>
  '<span class="tip-dot" style="background:' + esc(color) + '"></span>';

function popupHtml(props, name, color) {
  const title = featureTitle(props);
  const rows = attrRows(props, POPUP_MAX_ROWS, 200);
  return (
    '<div class="tip-layer">' + dot(color) + esc(name) + "</div>" +
    (title ? '<div class="tip-title">' + esc(title) + "</div>" : "") +
    (rows ? '<table class="tip-table">' + rows + "</table>" : "No attributes")
  );
}

function tipHtml(props, name, color) {
  const title = featureTitle(props);
  const rows = attrRows(props, TOOLTIP_MAX_ROWS, 60);
  return (
    '<div class="tip-layer">' + dot(color) + esc(name) + "</div>" +
    (title ? '<div class="tip-title">' + esc(title) + "</div>" : "") +
    (rows ? '<table class="tip-table">' + rows + "</table>" : "") +
    '<div class="tip-hint">Click for all details</div>'
  );
}

function fitEnvelope(env) {
  // envelope = [minX, minY, maxX, maxY] -> Leaflet [[lat, lng], [lat, lng]]
  // Some geographies may have no envelope, so check before zooming.
  if (!Array.isArray(env) || env.length < 4) return;
  map.fitBounds([
    [env[1], env[0]],
    [env[3], env[2]],
  ]);
}

// ---- District highlight --------------------------------------------------
function clearDistrictLayer() {
  if (districtLayer) {
    map.removeLayer(districtLayer);
    districtLayer = null;
  }
}

function showDistrict(features) {
  clearDistrictLayer();
  districtLayer = L.geoJSON(
    { type: "FeatureCollection", features },
    {
      style: {
        color: "#000",
        weight: 3,
        fillColor: "#ffd400",
        fillOpacity: 0.15,
      },
      interactive: false, // so it never blocks hovering the data layers
    },
  ).addTo(map);
  map.fitBounds(districtLayer.getBounds());
}

// ---- Clipping to the selected district ------------------------------------
// A dataset file holds the whole state/country. When a district is selected we
// keep only the features that touch that district's polygon.
let clip = null; // { polys: [{ rings, bbox }] } or null = show everything

function ringBBox(ring) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  ring.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  return [minX, minY, maxX, maxY];
}

function inRing(ring, x, y) {
  // ray casting
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function buildClip(features) {
  const polys = [];
  features.forEach((f) => {
    const g = f.geometry;
    if (!g) return;
    const list =
      g.type === "Polygon"
        ? [g.coordinates]
        : g.type === "MultiPolygon"
          ? g.coordinates
          : [];
    list.forEach((rings) => polys.push({ rings, bbox: ringBBox(rings[0]) }));
  });
  return polys.length ? { polys } : null;
}

function pointInClip(x, y) {
  return clip.polys.some((p) => {
    const b = p.bbox;
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
    if (!inRing(p.rings[0], x, y)) return false;
    // not inside a hole
    return !p.rings.slice(1).some((h) => inRing(h, x, y));
  });
}

function vertices(coords, out) {
  if (typeof coords[0] === "number") out.push(coords);
  else coords.forEach((c) => vertices(c, out));
  return out;
}

function featureInClip(f) {
  const g = f.geometry;
  if (!g) return false;
  const geoms = g.type === "GeometryCollection" ? g.geometries : [g];
  return geoms.some((gg) =>
    vertices(gg.coordinates || [], []).some(([x, y]) => pointInClip(x, y)),
  );
}

// ---- Data layers ---------------------------------------------------------
const styleOf = (color, opacity) => ({
  color: color,
  weight: 2,
  fillColor: color,
  fillOpacity: opacity,
});

// One tooltip shared by all layers; it follows the cursor.
const hoverTip = L.tooltip({
  direction: "top",
  offset: [0, -8],
  opacity: 1,
  className: "hover-tip",
});

function buildLayer(id, raw, color, name, opacity) {
  const all = raw.features || [];
  const feats = clip ? all.filter(featureInClip) : all;
  const layer = L.geoJSON(
    { type: "FeatureCollection", features: feats },
    {
      pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 5 }),
      style: () => styleOf(color, opacity),
      onEachFeature: (f, l) => {
        // The popup is built when it opens, so it always shows the current color.
        l.bindPopup(() => {
          const a = active[id];
          return popupHtml(f.properties, name, a ? a.color : color);
        });
      },
    },
  ).addTo(map);

  // Hover: show the place's details and highlight it.
  layer.on("mouseover", (e) => {
    const a = active[id];
    if (!a || !e.layer.feature) return;
    hoverTip
      .setLatLng(e.latlng)
      .setContent(tipHtml(e.layer.feature.properties, a.name, a.color));
    if (!map.hasLayer(hoverTip)) hoverTip.addTo(map);
    e.layer.setStyle({ weight: 4, fillOpacity: Math.min(0.7, a.opacity + 0.3) });
  });
  layer.on("mousemove", (e) => hoverTip.setLatLng(e.latlng));
  layer.on("mouseout", (e) => {
    if (map.hasLayer(hoverTip)) map.removeLayer(hoverTip);
    const a = active[id];
    if (a) e.layer.setStyle(styleOf(a.color, a.opacity));
  });

  return { layer, shown: feats.length, total: all.length };
}

// Returns { shown, total } so the page can say "12 of 340 features".
function addDataLayer(id, name, gj) {
  const color = COLORS[colorIdx++ % COLORS.length];
  const { layer, shown, total } = buildLayer(id, gj, color, name, DEFAULT_OPACITY);
  active[id] = {
    layer,
    color,
    defaultColor: color,
    opacity: DEFAULT_OPACITY,
    name,
    raw: gj,
    shown,
    total,
  };
  return { shown, total };
}

// Change a layer's color and/or opacity. Pass only what changed.
function setLayerStyle(id, { color, opacity }) {
  const a = active[id];
  if (!a) return;
  if (color) a.color = color;
  if (opacity !== undefined && opacity !== null) a.opacity = opacity;
  a.layer.setStyle(styleOf(a.color, a.opacity));
}

function resetLayerStyle(id) {
  const a = active[id];
  if (a) setLayerStyle(id, { color: a.defaultColor, opacity: DEFAULT_OPACITY });
}

// Pass the selected district's features, or null to show everything again.
// Layers already on the map are rebuilt with the new filter.
function setClip(features) {
  clip = features && features.length ? buildClip(features) : null;
  Object.entries(active).forEach(([id, a]) => {
    map.removeLayer(a.layer);
    const b = buildLayer(id, a.raw, a.color, a.name, a.opacity);
    a.layer = b.layer;
    a.shown = b.shown;
    a.total = b.total;
  });
}

// Zoom to a layer that is on the map. Returns false if there is nothing to show.
function zoomToLayer(id) {
  if (!active[id]) return false;
  const bounds = active[id].layer.getBounds();
  if (!bounds.isValid()) return false;
  map.fitBounds(bounds);
  return true;
}

function removeDataLayer(id) {
  if (!active[id]) return;
  map.removeLayer(active[id].layer);
  delete active[id];
  if (map.hasLayer(hoverTip)) map.removeLayer(hoverTip);
}

function clearAllLayers() {
  Object.values(active).forEach((a) => map.removeLayer(a.layer));
  Object.keys(active).forEach((k) => delete active[k]);
  colorIdx = 0;
  clip = null;
  if (map.hasLayer(hoverTip)) map.removeLayer(hoverTip);
}
