// main.js - wires the boundary and crop dropdowns to the EAE iframe.

const $ = (id) => document.getElementById(id);

const countrySel = $("country");
const stateSel = $("state");
const districtSel = $("district");
const cropSel = $("crop");
const statusEl = $("status");
const frameHost = $("frame-host");
const iframe = $("eae");
const overlay = $("overlay");
const overlayText = $("overlay-text");
const overlayRetry = $("overlay-retry");
const openTab = $("open-tab");

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

const say = (t) => {
  statusEl.textContent = t || "";
};

function fill(select, items, placeholder) {
  select.innerHTML =
    '<option value="">' +
    esc(placeholder) +
    "</option>" +
    items
      .map(
        (i) =>
          '<option value="' + esc(i.value) + '">' + esc(i.label) + "</option>",
      )
      .join("");
  select.disabled = items.length === 0;
}

let countries = [];
let states = [];
let districts = [];
let crops = [];
let datasets = [];
let selToken = 0;
let loadTimer = 0;
let restoring = false;
let retryAction = null;

const initialParams = new URLSearchParams(location.search);

eaeFrameInit(iframe, () => {
  say("EAE embed controls are available.");
});

function geographyId() {
  return districtSel.value || stateSel.value || countrySel.value;
}

function selectedCrop() {
  return crops.find((c) => c.id === cropSel.value) || null;
}

function currentSel() {
  const crop = selectedCrop();
  return {
    geographyId: geographyId(),
    inputs: crop ? crop.inputs || [] : [],
    snapshot: crop && crop.snapshot ? crop.snapshot : null,
  };
}

function syncUrl() {
  if (restoring) return;
  const p = new URLSearchParams();
  if (countrySel.value) p.set("country", countrySel.value);
  if (stateSel.value) p.set("state", stateSel.value);
  if (districtSel.value) p.set("district", districtSel.value);
  if (cropSel.value) p.set("crop", cropSel.value);
  const q = p.toString();
  history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
}

function showOverlay(text, retry, onRetry) {
  overlay.hidden = false;
  overlayText.textContent = text;
  overlayRetry.hidden = !retry;
  retryAction = onRetry || null;
}

function hideOverlay() {
  overlay.hidden = true;
  overlayRetry.hidden = true;
  retryAction = null;
  if (loadTimer) {
    clearTimeout(loadTimer);
    loadTimer = 0;
  }
}

function applyEmbed() {
  if (loadTimer) {
    clearTimeout(loadTimer);
    loadTimer = 0;
  }
  const geo = geographyId();
  if (!geo) {
    showOverlay("Select a country or state to load the map.", false);
    iframe.removeAttribute("src");
    return;
  }
  const src = showInEae(currentSel());
  showOverlay("Loading Energy Access Explorer…", false);
  loadTimer = setTimeout(() => {
    showOverlay(
      "The map is taking a long time. EAE often needs 10+ seconds. You can wait, retry, or open it in a new tab.",
      true,
    );
  }, 15000);
  iframe.dataset.src = src;
  syncUrl();
}

iframe.addEventListener("load", () => {
  const src = iframe.getAttribute("src") || "";
  if (!src || src === "about:blank" || src !== iframe.dataset.src) return;
  hideOverlay();
  fitEaeFrame(frameHost);
  const crop = selectedCrop();
  const geoName =
    (districts.find((d) => d.id === districtSel.value) ||
      states.find((s) => s.id === stateSel.value) ||
      countries.find((c) => c.id === countrySel.value) ||
      {}).name || "selected area";
  if (crop) {
    say(
      geoName +
        " · " +
        crop.label +
        (crop.mock
          ? " (mock layer until crop-suitability analyses are published)"
          : ""),
    );
  } else {
    say(geoName + " · pick a crop to highlight suitable areas");
  }
});

function resizeFrame() {
  fitEaeFrame(frameHost);
}

window.addEventListener("resize", resizeFrame);

async function loadCrops(geoId, token) {
  fill(cropSel, [], "Loading crops...");
  datasets = [];
  crops = [];
  if (!geoId) {
    fill(cropSel, [], "Select an area first");
    return;
  }
  try {
    datasets = await fetchDatasets(geoId);
  } catch (e) {
    console.warn(e);
    datasets = [];
  }
  if (token !== selToken) return;
  crops = cropsFor(geoId, datasets);
  fill(
    cropSel,
    crops.map((c) => ({
      value: c.id,
      label: c.mock ? c.label + " (mock)" : c.label,
    })),
    crops.length ? "Select a crop..." : "No crop layers yet",
  );
  if (!cropSel.value && crops[0]) cropSel.value = crops[0].id;
}

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
    fill(countrySel, [], "Could not load countries");
    showOverlay(
      "Could not load countries from the EAE API: " + e.message,
      true,
      () => loadCountries().then(restoreFromUrl),
    );
  }
}

async function loadStates(countryId, token) {
  fill(stateSel, [], "Loading...");
  fill(districtSel, [], "Select a state first");
  districtSel.disabled = true;
  states = [];
  districts = [];
  try {
    states = await fetchStates(countryId);
  } catch (e) {
    console.error(e);
    fill(stateSel, [], "Error");
    say("Could not load states: " + e.message);
    return;
  }
  if (token !== selToken) return;
  fill(
    stateSel,
    states.map((s) => ({ value: s.id, label: s.name })),
    states.length ? "Select a state..." : "No sub-areas",
  );
}

async function loadDistricts(stateId, token) {
  fill(districtSel, [], "Loading...");
  districts = [];
  try {
    districts = await fetchDistricts(stateId);
  } catch (e) {
    console.warn(e);
    districts = [];
  }
  if (token !== selToken) return;
  if (!districts.length) {
    fill(districtSel, [], "Shown inside the map");
    districtSel.disabled = true;
    return;
  }
  fill(
    districtSel,
    districts.map((d) => ({ value: d.id, label: d.name })),
    "Whole state (optional district)",
  );
}

async function onCountryChange() {
  const token = ++selToken;
  const country = countries.find((c) => c.id === countrySel.value);
  fill(cropSel, [], "Select an area first");
  crops = [];
  if (!country) {
    fill(stateSel, [], "Select a country first");
    fill(districtSel, [], "Select a state first");
    stateSel.disabled = true;
    districtSel.disabled = true;
    applyEmbed();
    return;
  }
  await loadStates(country.id, token);
  if (token !== selToken) return;
  await loadCrops(country.id, token);
  if (token !== selToken) return;
  applyEmbed();
}

async function onStateChange() {
  const token = ++selToken;
  const state = states.find((s) => s.id === stateSel.value);
  if (!state) {
    fill(districtSel, [], "Select a state first");
    districtSel.disabled = true;
    const country = countries.find((c) => c.id === countrySel.value);
    if (country) await loadCrops(country.id, token);
    applyEmbed();
    return;
  }
  await loadDistricts(state.id, token);
  if (token !== selToken) return;
  await loadCrops(state.id, token);
  if (token !== selToken) return;
  applyEmbed();
}

async function onDistrictChange() {
  const token = ++selToken;
  const district = districts.find((d) => d.id === districtSel.value);
  const geo = district || states.find((s) => s.id === stateSel.value);
  if (geo) await loadCrops(geo.id, token);
  applyEmbed();
}

countrySel.addEventListener("change", onCountryChange);
stateSel.addEventListener("change", onStateChange);
districtSel.addEventListener("change", onDistrictChange);
cropSel.addEventListener("change", () => applyEmbed());

openTab.addEventListener("click", (e) => {
  e.preventDefault();
  if (!geographyId()) return;
  openEaeTab(currentSel());
});

overlayRetry.addEventListener("click", () => {
  const retry = retryAction;
  retryAction = null;
  if (retry) retry();
  else applyEmbed();
});

$("help-btn").addEventListener("click", () => {
  $("dialog-title").textContent = "How to use this map";
  $("dialog-text").textContent = TEXTS.help;
  $("dialog").showModal();
});
$("disclaimer-btn").addEventListener("click", () => {
  $("dialog-title").textContent = "Disclaimer";
  $("dialog-text").textContent = TEXTS.disclaimer;
  $("dialog").showModal();
});
$("dialog-close").addEventListener("click", () => $("dialog").close());

const hasOption = (sel, v) => [...sel.options].some((o) => o.value === v);

async function restoreFromUrl() {
  const cId = initialParams.get("country") || DEFAULT_COUNTRY_ID;
  const sId = initialParams.get("state") || DEFAULT_STATE_ID;
  const dId = initialParams.get("district");
  const cropId = initialParams.get("crop");
  restoring = true;
  try {
    if (!hasOption(countrySel, cId)) return;
    countrySel.value = cId;
    await onCountryChange();
    if (sId && hasOption(stateSel, sId)) {
      stateSel.value = sId;
      await onStateChange();
    }
    if (dId && hasOption(districtSel, dId)) {
      districtSel.value = dId;
      await onDistrictChange();
    }
    if (cropId && hasOption(cropSel, cropId)) {
      cropSel.value = cropId;
      applyEmbed();
    }
  } finally {
    restoring = false;
    syncUrl();
    resizeFrame();
  }
}

loadCountries().then(restoreFromUrl);
resizeFrame();
