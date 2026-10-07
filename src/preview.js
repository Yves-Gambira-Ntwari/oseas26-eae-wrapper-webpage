// preview.js - the small "selected place" map under the legend.
// Knows nothing about dropdowns or the API; main.js tells it what to show.

const mini = L.map("minimap", {
  preferCanvas: true,
  zoomControl: false,
  attributionControl: false,
  dragging: false,
  touchZoom: false,
  doubleClickZoom: false,
  scrollWheelZoom: false,
  boxZoom: false,
  keyboard: false,
}).setView(MAP_DEFAULT.center, 1);
L.tileLayer(TILE_URL, { maxZoom: 19 }).addTo(mini);

const pvLabel = document.getElementById("preview-label");
const pvEmpty = document.getElementById("preview-empty");

const PV_STYLE = {
  color: "#007a4d",
  weight: 2,
  fillColor: "#007a4d",
  fillOpacity: 0.2,
  interactive: false,
};
const PV_DISTRICT_STYLE = {
  color: "#000",
  weight: 2,
  fillColor: "#ffd400",
  fillOpacity: 0.55,
  interactive: false,
};

let pvPlace = ""; // name of the chosen country / state
let pvShape = null; // outline (or bounding box) of the chosen place
let pvDistrict = null; // highlighted district
let pvBounds = null; // what the view is currently fitted to

function pvRemove(layer) {
  if (layer) mini.removeLayer(layer);
  return null;
}

function pvFit(bounds) {
  pvBounds = bounds;
  if (bounds && bounds.isValid()) {
    mini.fitBounds(bounds, { padding: [10, 10], animate: false });
  }
}

function pvSetLabel(text) {
  pvLabel.textContent = text || "No place selected";
  pvEmpty.hidden = !!pvPlace;
}

// A country or state was chosen: show its bounding box until the real
// outline arrives.
function previewPlace(name, envelope) {
  pvDistrict = pvRemove(pvDistrict);
  pvShape = pvRemove(pvShape);
  pvPlace = name || "";
  pvBounds = null;
  if (Array.isArray(envelope) && envelope.length >= 4) {
    const b = L.latLngBounds(
      [envelope[1], envelope[0]],
      [envelope[3], envelope[2]],
    );
    pvShape = L.rectangle(b, PV_STYLE).addTo(mini);
    pvFit(b);
  }
  pvSetLabel(pvPlace);
}

// The real outline of the chosen place (GeoJSON) replaces the bounding box.
function previewOutline(gj) {
  if (!pvPlace) return;
  pvShape = pvRemove(pvShape);
  pvShape = L.geoJSON(gj, { style: () => PV_STYLE, interactive: false }).addTo(mini);
  if (!pvDistrict) pvFit(pvShape.getBounds());
}

// Highlight the chosen district, or pass null to go back to the whole place.
function previewDistrict(features, name) {
  pvDistrict = pvRemove(pvDistrict);
  if (!features || !features.length) {
    if (pvShape) pvFit(pvShape.getBounds());
    pvSetLabel(pvPlace);
    return;
  }
  pvDistrict = L.geoJSON(
    { type: "FeatureCollection", features },
    { style: () => PV_DISTRICT_STYLE, interactive: false },
  ).addTo(mini);
  pvFit(pvDistrict.getBounds());
  pvSetLabel(pvPlace + " / " + name);
}

function previewReset() {
  pvDistrict = pvRemove(pvDistrict);
  pvShape = pvRemove(pvShape);
  pvPlace = "";
  pvBounds = null;
  mini.setView(MAP_DEFAULT.center, 1);
  pvSetLabel("");
}

// Call after the panel becomes visible or changes size.
function previewResize() {
  mini.invalidateSize();
  if (pvBounds) pvFit(pvBounds);
}
