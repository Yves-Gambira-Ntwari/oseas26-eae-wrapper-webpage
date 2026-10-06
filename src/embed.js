// embed.js - everything that draws on the Leaflet map.
// Knows nothing about dropdowns or the API.

const map = L.map("map", { preferCanvas: true }).setView(
  MAP_DEFAULT.center,
  MAP_DEFAULT.zoom,
);
L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(
  map,
);

const active = {}; // dataset id -> { layer, color, name }
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

function popupHtml(props) {
  const rows = Object.entries(props || {})
    .filter(([, v]) => v !== null && v !== "")
    .slice(0, POPUP_MAX_ROWS)
    .map(
      ([k, v]) =>
        "<tr><td><b>" + esc(k) + "</b></td><td>" + esc(v) + "</td></tr>",
    )
    .join("");
  return rows
    ? '<table style="font-size:12px">' + rows + "</table>"
    : "No attributes";
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
function buildLayer(raw, color) {
  const all = raw.features || [];
  const feats = clip ? all.filter(featureInClip) : all;
  const layer = L.geoJSON(
    { type: "FeatureCollection", features: feats },
    {
      pointToLayer: (f, latlng) =>
        L.circleMarker(latlng, {
          radius: 5,
          color: "#000",
          weight: 1,
          fillColor: color,
          fillOpacity: 0.9,
        }),
      style: () => ({
        color: color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.25,
      }),
      onEachFeature: (f, l) => l.bindPopup(popupHtml(f.properties)),
    },
  ).addTo(map);
  return { layer, shown: feats.length, total: all.length };
}

// Returns { shown, total } so the page can say "12 of 340 features".
function addDataLayer(id, name, gj) {
  const color = COLORS[colorIdx++ % COLORS.length];
  const { layer, shown, total } = buildLayer(gj, color);
  active[id] = { layer, color, name, raw: gj };
  return { shown, total };
}

// Pass the selected district's features, or null to show everything again.
// Layers already on the map are rebuilt with the new filter.
function setClip(features) {
  clip = features && features.length ? buildClip(features) : null;
  Object.values(active).forEach((a) => {
    map.removeLayer(a.layer);
    a.layer = buildLayer(a.raw, a.color).layer;
  });
}

function removeDataLayer(id) {
  if (!active[id]) return;
  map.removeLayer(active[id].layer);
  delete active[id];
}

function clearAllLayers() {
  Object.values(active).forEach((a) => map.removeLayer(a.layer));
  Object.keys(active).forEach((k) => delete active[k]);
  colorIdx = 0;
  clip = null;
}
