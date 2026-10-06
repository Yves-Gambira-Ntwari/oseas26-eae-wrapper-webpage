// main.js - connects the dropdowns to the data and the map.

const countrySel = document.getElementById("country");
const stateSel = document.getElementById("state");
const districtSel = document.getElementById("district");
const datasetSel = document.getElementById("dataset");
const info = document.getElementById("info");
const layersBox = document.getElementById("layers");
const layerList = document.getElementById("layerlist");

const say = (t) => (info.textContent = t);

let countries = [];
let states = [];
let datasets = [];
let districtFeatures = [];
let districtProp = null; // name of the property that holds district names
let selToken = 0; // ignores answers that arrive after the user changed their mind

// ---- UI helpers ------------------------------------------------------------
function fill(select, items, placeholder) {
  select.innerHTML =
    '<option value="">' +
    esc(placeholder) +
    "</option>" +
    items
      .map(
        (i) =>
          '<option value="' +
          esc(i.value) +
          '"' +
          (i.disabled ? " disabled" : "") +
          ">" +
          esc(i.label) +
          "</option>",
      )
      .join("");
  select.disabled = items.length === 0;
}

function renderLayerList() {
  const ids = Object.keys(active);
  layersBox.style.display = ids.length ? "block" : "none";
  layerList.innerHTML = "";
  ids.forEach((id) => {
    const a = active[id];
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML =
      '<div class="sw" style="background:' +
      a.color +
      '"></div>' +
      '<span class="t">' +
      esc(a.name) +
      "</span>" +
      '<button title="Remove">&times;</button>';
    row.querySelector("button").onclick = () => {
      removeDataLayer(id);
      renderLayerList();
    };
    layerList.appendChild(row);
  });
}

function clearDistrict() {
  clearDistrictLayer();
  districtFeatures = [];
  districtProp = null;
}

// ---- 1. Countries ----------------------------------------------------------
async function loadCountries() {
  try {
    countries = await fetchCountries();
    fill(
      countrySel,
      countries.map((c) => ({ value: c.id, label: c.name })),
      "Select a country...",
    );
  } catch (e) {
    console.error(e);
    say("Could not load countries: " + e.message);
  }
}

countrySel.addEventListener("change", async () => {
  const token = ++selToken;
  clearAllLayers();
  renderLayerList();
  clearDistrict();
  states = [];
  datasets = [];
  fill(stateSel, [], "Loading...");
  fill(districtSel, [], "Select a state first");
  fill(datasetSel, [], "Select a state first");

  const country = countries.find((c) => c.id === countrySel.value);
  if (!country) {
    fill(stateSel, [], "Select a country first");
    say("");
    return;
  }

  fitEnvelope(country.envelope);
  say(country.name + " selected");

  await loadStates(country.id);
  if (token !== selToken) return;

  // A country without sub-areas: use the country itself.
  if (states.length === 0) selectGeography(country, token);
});

// ---- 2. States -------------------------------------------------------------
async function loadStates(countryId) {
  try {
    states = await fetchStates(countryId);
    fill(
      stateSel,
      states.map((s) => ({ value: s.id, label: s.name })),
      states.length ? "Select a state..." : "No sub-areas",
    );
  } catch (e) {
    console.error(e);
    states = [];
    fill(stateSel, [], "Error");
    say("Could not load states: " + e.message);
  }
}

stateSel.addEventListener("change", () => {
  const token = ++selToken;
  clearAllLayers();
  renderLayerList();
  clearDistrict();
  datasets = [];

  const geo = states.find((s) => s.id === stateSel.value);
  if (!geo) {
    fill(districtSel, [], "Select a state first");
    fill(datasetSel, [], "Select a state first");
    say("");
    return;
  }

  fitEnvelope(geo.envelope);
  say(geo.name + " selected");
  selectGeography(geo, token);
});

// ---- 3. A geography is chosen: load its datasets and districts -------------
async function selectGeography(geo, token) {
  fill(districtSel, [], "Loading...");
  fill(datasetSel, [], "Loading...");

  let list;
  try {
    list = await fetchDatasets(geo.id);
  } catch (e) {
    console.error(e);
    if (token !== selToken) return;
    say("Could not load datasets: " + e.message);
    fill(datasetSel, [], "Error");
    fill(districtSel, [], "Error");
    return;
  }
  if (token !== selToken) return;
  datasets = list;

  fill(
    datasetSel,
    datasets.map((d) => {
      const ok = isDrawable(d);
      return {
        value: d.id,
        label: d.name_long + (ok ? "" : " (" + d.type + " - not drawable)"),
        disabled: !ok,
      };
    }),
    "Add a layer... (" + datasets.length + ")",
  );

  loadDistricts(datasets, token);
}

// ---- 4. Districts ----------------------------------------------------------
async function loadDistricts(list, token) {
  try {
    const result = await fetchDistricts(list);
    if (token !== selToken) return;

    if (!result) {
      fill(districtSel, [], "No district data");
      return;
    }
    districtFeatures = result.features;
    districtProp = result.prop;
    if (!districtProp) {
      fill(districtSel, [], "No district names found");
      return;
    }

    const names = [
      ...new Set(
        districtFeatures
          .map((f) => (f.properties || {})[districtProp])
          .filter(Boolean),
      ),
    ].sort();
    fill(
      districtSel,
      names.map((n) => ({ value: n, label: n })),
      "Select a district...",
    );
  } catch (e) {
    if (token !== selToken) return;
    console.warn("District file not readable:", e);
    fill(districtSel, [], "District list unavailable");
    say("Could not read district file (probably CORS): " + e.message);
  }
}

districtSel.addEventListener("change", () => {
  clearDistrictLayer();
  if (!districtSel.value || !districtProp) {
    setClip(null); // no district: layers show the whole area again
    say("");
    return;
  }
  const feats = districtFeatures.filter(
    (f) => (f.properties || {})[districtProp] === districtSel.value,
  );
  showDistrict(feats);
  setClip(feats); // filter every layer to this district
  say("District: " + districtSel.value);
});

// ---- 5. Layers -------------------------------------------------------------
datasetSel.addEventListener("change", async () => {
  const d = datasets.find((x) => x.id === datasetSel.value);
  datasetSel.value = "";
  if (!d) return;
  if (active[d.id]) {
    say(d.name_long + " is already on the map");
    return;
  }

  say("Loading " + d.name_long + "...");
  try {
    const gj = await fetchGeoJSON(d);
    const { shown, total } = addDataLayer(d.id, d.name_long, gj);
    renderLayerList();
    say(
      d.name_long +
        ": " +
        (shown === total
          ? shown + " features"
          : shown + " of " + total + " features in " + districtSel.value),
    );
  } catch (e) {
    console.error(e);
    say(
      "Could not load " +
        d.name_long +
        ": " +
        e.message +
        " (check the Console for a CORS error)",
    );
  }
});

loadCountries();
