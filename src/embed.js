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

// ---- Data layers ---------------------------------------------------------
function addDataLayer(id, name, gj) {
  const color = COLORS[colorIdx++ % COLORS.length];
  const layer = L.geoJSON(gj, {
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
  }).addTo(map);
  active[id] = { layer, color, name };
  return gj.features ? gj.features.length : 0;
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
}
