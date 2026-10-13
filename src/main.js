// main.js - connects the dropdowns, rail, toggles, legend and dialogs to the
// data and the maps.

const $ = (id) => document.getElementById(id);

const countrySel = $("country");
const stateSel = $("state");
const districtSel = $("district");
const info = $("info");
const titleEl = $("title");
const datasetList = $("datasets");
const panelTitle = $("panel-title");
const resultsTitle = $("results-title");
const resultsBody = $("results-body");
const side = $("side");
const menuEl = $("ds-menu");

const say = (t) => (info.textContent = t);

let countries = [];
let states = [];
let datasets = [];
let districtFeatures = [];
let districtProp = null; // name of the property that holds district names
let selToken = 0; // ignores answers that arrive after the user changed their mind
let category = DEFAULT_CATEGORY; // left rail selection
let tab = "data"; // "data" = legend, "analysis" = feature counts
let menuDatasetId = null; // dataset whose three-dot menu is open
const loadingIds = new Set(); // datasets currently downloading
const advOpen = new Set(); // datasets showing their advanced controls

// URL state: read once when the page opens.
// ?country=<id>&state=<id>&district=<name>&layers=<id>,<id>
const initialParams = new URLSearchParams(location.search);
let restoring = initialParams.has("country"); // don't overwrite the URL while restoring

// <input type="color"> only accepts #rrggbb.
const hexOf = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : "#888888");
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");

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

function setTitle(name) {
  titleEl.textContent = name || "Select a country";
}

function clearDistrict() {
  districtFeatures = [];
  districtProp = null;
}

// Remove every layer and everything attached to them.
function resetLayers() {
  clearAllLayers();
  advOpen.clear();
  closeMenu();
}

const cropSel = $("crop");
const criteriaToggle = $("criteria-toggle");
const fullMapLink = $("full-map-link");

// ---- URL state: write the current selection into the address bar -----------
function syncUrl() {
  if (restoring) return;
  const p = new URLSearchParams();
  if (countrySel.value) p.set("country", countrySel.value);
  if (stateSel.value) p.set("state", stateSel.value);
  if (districtSel.value) p.set("district", districtSel.value);
  if (cropSel && cropSel.value) p.set("scenario", cropSel.value);
  if (criteriaToggle && criteriaToggle.checked) p.set("criteria", "1");
  const ids = Object.keys(active);
  if (ids.length) p.set("layers", ids.join(","));
  const q = p.toString();
  history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));

  updateFullMapLink();
}

function updateFullMapLink() {
  if (!fullMapLink) return;
  const stateId = stateSel.value;
  if (!stateId) {
    fullMapLink.removeAttribute("href");
    return;
  }

  const p = new URLSearchParams();
  p.set("id", stateId);

  const selectedCrop = (typeof CROPS !== "undefined" && cropSel)
    ? CROPS.find((c) => c.id === cropSel.value)
    : null;
  if (selectedCrop && selectedCrop.snapshot) {
    p.set("snapshot", selectedCrop.snapshot);
  }

  if (districtSel.value) {
    p.set("divtier", "1");
    p.set("subdiv", districtSel.value);
  }

  if (EaeController.lastView) {
    p.set("zoom", EaeController.lastView.zoom);
    p.set("lng", EaeController.lastView.center.lng);
    p.set("lat", EaeController.lastView.center.lat);
  }

  if (criteriaToggle && criteriaToggle.checked) {
    p.set("criteria", "1");
  }

  const activeNames = Object.values(active).map((a) => a.name);
  if (activeNames.length) {
    p.set("inputs", activeNames.join(","));
  }

  const base = typeof EAE_APP !== "undefined" ? EAE_APP : "http://localhost:3000/tool/a/";
  fullMapLink.href = base + "?" + p.toString();
}

// ---- Left panel: dataset list ----------------------------------------------
function advHtml(id) {
  const a = active[id];
  const pct = Math.round(a.opacity * 100);
  return (
    '<div class="adv">' +
    '<div class="adv-line"><span>Color</span>' +
    '<input type="color" class="adv-color" value="' +
    hexOf(a.color) +
    '" /></div>' +
    '<div class="adv-presets">' +
    COLORS.map(
      (c) =>
        '<button type="button" class="preset" data-color="' +
        c +
        '" style="background:' +
        c +
        '" aria-label="Use ' +
        c +
        '"></button>',
    ).join("") +
    "</div>" +
    '<div class="adv-line"><span>Opacity</span>' +
    '<input type="range" class="adv-op" min="0" max="100" value="' +
    pct +
    '" />' +
    "<output>" +
    pct +
    "%</output></div>" +
    "</div>"
  );
}

function renderDatasets() {
  const cat = CATEGORIES.find((c) => c.id === category);
  panelTitle.textContent = cat ? cat.label : "";
  datasetList.innerHTML = "";

  if (!datasets.length) {
    datasetList.innerHTML =
      '<li class="empty">Select a state to see its layers.</li>';
    return;
  }

  const shown = datasets.filter(
    (d) => category === "all" || categoryOf(d) === category,
  );
  if (!shown.length) {
    datasetList.innerHTML =
      '<li class="empty">No layers in this category.</li>';
    return;
  }

  shown.forEach((d) => {
    const ok = isDrawable(d);
    const on = !!active[d.id];
    const li = document.createElement("li");
    li.className =
      "ds" + (ok ? "" : " disabled") + (loadingIds.has(d.id) ? " loading" : "");
    if (!ok) li.title = d.type + " - not drawable";
    li.innerHTML =
      '<div class="ds-row">' +
      '<label class="switch"><input type="checkbox"' +
      (on ? " checked" : "") +
      (ok ? "" : " disabled") +
      ' aria-label="' +
      esc(d.name_long) +
      '" />' +
      '<span class="track"></span></label>' +
      '<span class="ds-name">' +
      esc(d.name_long) +
      "</span>" +
      '<button type="button" class="ds-menu" title="More options" aria-label="More options" aria-haspopup="menu">&#8942;</button>' +
      "</div>" +
      (on && advOpen.has(d.id) ? advHtml(d.id) : "");

    li.querySelector("input").addEventListener("change", (e) =>
      toggleLayer(d, e.target),
    );
    li.querySelector(".ds-menu").addEventListener("click", (e) =>
      toggleMenu(d, e.currentTarget),
    );

    const adv = li.querySelector(".adv");
    if (adv) {
      adv.querySelector(".adv-color").addEventListener("input", (e) => {
        setLayerStyle(d.id, { color: e.target.value });
        renderResults();
      });
      adv.querySelectorAll(".preset").forEach((b) =>
        b.addEventListener("click", () => {
          setLayerStyle(d.id, { color: b.dataset.color });
          refresh();
        }),
      );
      const op = adv.querySelector(".adv-op");
      const out = adv.querySelector("output");
      op.addEventListener("input", () => {
        out.textContent = op.value + "%";
        setLayerStyle(d.id, { opacity: op.value / 100 });
      });
    }
    datasetList.appendChild(li);
  });
}

// ---- Right panel: legend (Data tab) or feature counts (Analysis tab) -------
function renderResults() {
  resultsTitle.textContent = tab === "data" ? "Legend" : "Analysis";
  resultsBody.innerHTML = "";

  const ids = Object.keys(active);
  if (!ids.length) {
    resultsBody.innerHTML =
      '<div class="empty">No layers on the map yet.</div>';
    return;
  }

  if (tab === "data") {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Click a color dot to change that layer's color.";
    resultsBody.appendChild(hint);
  }

  ids.forEach((id) => {
    const a = active[id];
    const row = document.createElement("div");
    row.className = "row";
    if (tab === "data") {
      row.innerHTML =
        '<input type="color" class="lg-color" title="Change color" aria-label="Change color of ' +
        esc(a.name) +
        '" value="' +
        hexOf(a.color) +
        '" />' +
        '<span class="t">' +
        esc(a.name) +
        "</span>" +
        '<button type="button" title="Remove" aria-label="Remove layer">&times;</button>';
      const color = row.querySelector(".lg-color");
      color.addEventListener("input", (e) =>
        setLayerStyle(id, { color: e.target.value }),
      );
      color.addEventListener("change", () => renderDatasets()); // keep advanced controls in sync
      row.querySelector("button").onclick = () => {
        removeDataLayer(id);
        advOpen.delete(id);
        refresh();
      };
    } else {
      row.innerHTML =
        '<div class="sw" style="background:' +
        esc(a.color) +
        '"></div>' +
        '<span class="t">' +
        esc(a.name) +
        "</span>" +
        '<span class="count">' +
        (a.shown === a.total ? a.shown : a.shown + " of " + a.total) +
        " features</span>";
    }
    resultsBody.appendChild(row);
  });
}

function refresh() {
  renderDatasets();
  renderResults();
  syncUrl(); // keeps ?layers=... up to date
}

// ---- Three-dot menu --------------------------------------------------------
function closeMenu() {
  menuEl.hidden = true;
  menuDatasetId = null;
}

function toggleMenu(d, btn) {
  if (!menuEl.hidden && menuDatasetId === d.id) {
    closeMenu();
    return;
  }
  const on = !!active[d.id];
  const items = [
    { label: "Dataset info", run: () => openInfo(d) },
    {
      label: "Toggle advanced controls",
      needsOn: true,
      run: () => {
        if (advOpen.has(d.id)) advOpen.delete(d.id);
        else advOpen.add(d.id);
        renderDatasets();
      },
    },
    {
      label: "Reset default values",
      needsOn: true,
      run: () => {
        resetLayerStyle(d.id);
        refresh();
        say(d.name_long + ": default color and opacity restored");
      },
    },
    { label: "Set values manually", needsOn: true, run: () => openValues(d) },
  ];

  menuEl.innerHTML = items
    .map(
      (it, i) =>
        '<button type="button" role="menuitem" data-i="' +
        i +
        '"' +
        (it.needsOn && !on
          ? ' disabled title="Switch the layer on first"'
          : "") +
        ">" +
        esc(it.label) +
        "</button>",
    )
    .join("");
  menuEl.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      const it = items[Number(b.dataset.i)];
      closeMenu();
      it.run();
    }),
  );

  menuDatasetId = d.id;
  menuEl.hidden = false;
  const r = btn.getBoundingClientRect();
  menuEl.style.top =
    Math.max(
      8,
      Math.min(r.bottom, window.innerHeight - menuEl.offsetHeight - 8),
    ) + "px";
  menuEl.style.left = Math.max(8, r.right - menuEl.offsetWidth) + "px";
}

document.addEventListener("click", (e) => {
  if (
    !menuEl.hidden &&
    !menuEl.contains(e.target) &&
    !e.target.closest(".ds-menu")
  ) {
    closeMenu();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
$("panel").addEventListener("scroll", closeMenu);
window.addEventListener("resize", closeMenu);

// ---- "Dataset info" window -------------------------------------------------
const infoDialog = $("info-dialog");
const infoTitle = $("info-title");
const infoBody = $("info-body");
let infoToken = 0;

function infoHtml(i, d, note) {
  const para = (t) => "<p>" + esc(t).replace(/\n/g, "<br>") + "</p>";
  const sec = (h, t) => (t ? "<h4>" + esc(h) + "</h4>" + para(t) : "");
  const link = (label, u) => {
    const s = safeUrl(u);
    return s
      ? '<div class="info-link"><a href="' +
          esc(s) +
          '" target="_blank" rel="noopener noreferrer">' +
          esc(label) +
          " &#8600;</a></div>"
      : "";
  };

  const left =
    sec("Description", i.description) +
    sec("Why is this dataset used?", i.why) +
    sec("Suggested Citation", i.citation) +
    sec("Cautions", i.cautions);
  const right =
    link("Download from Source", i.download) +
    link("Learn More", i.learn) +
    sec("Sources", i.source) +
    sec("License", i.license) +
    sec("Date of Content", i.date) +
    sec("Type", d.type);

  return (
    (note ? '<p class="muted info-note">' + esc(note) + "</p>" : "") +
    '<div class="info-cols"><div>' +
    (left ||
      '<p class="muted">No description is available for this dataset.</p>') +
    "</div><div>" +
    right +
    "</div></div>"
  );
}

async function openInfo(d) {
  const token = ++infoToken;
  infoTitle.textContent = d.name_long || d.name;
  infoBody.innerHTML = '<p class="muted">Loading dataset information...</p>';
  if (!infoDialog.open) infoDialog.showModal();

  let html;
  try {
    const row = await fetchDatasetInfo(d.id);
    if (token !== infoToken) return;
    html = infoHtml(normalizeInfo(row), d);
  } catch (e) {
    console.error(e);
    if (token !== infoToken) return;
    html = infoHtml(
      normalizeInfo(null),
      d,
      "Could not load the full description: " + e.message,
    );
  }
  infoBody.innerHTML = html;
}

$("info-close").addEventListener("click", () => infoDialog.close());
infoDialog.addEventListener("click", (e) => {
  if (e.target === infoDialog) infoDialog.close(); // click on the dark backdrop
});

// ---- "Set values manually" window ------------------------------------------
const valuesDialog = $("values-dialog");
const valuesHex = $("values-hex");
const valuesColor = $("values-color");
const valuesOpacity = $("values-opacity");
const valuesError = $("values-error");
let valuesId = null;

function openValues(d) {
  const a = active[d.id];
  if (!a) return;
  valuesId = d.id;
  $("values-title").textContent = d.name_long;
  valuesHex.value = hexOf(a.color);
  valuesColor.value = hexOf(a.color);
  valuesOpacity.value = Math.round(a.opacity * 100);
  valuesError.textContent = "";
  valuesDialog.showModal();
}

valuesColor.addEventListener(
  "input",
  () => (valuesHex.value = valuesColor.value),
);
valuesHex.addEventListener("input", () => {
  if (/^#[0-9a-f]{6}$/i.test(valuesHex.value))
    valuesColor.value = valuesHex.value;
});
$("values-cancel").addEventListener("click", () => valuesDialog.close());
$("values-apply").addEventListener("click", () => {
  let hex = valuesHex.value.trim();
  if (/^[0-9a-f]{6}$/i.test(hex)) hex = "#" + hex;
  const pct = Number(valuesOpacity.value);
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    valuesError.textContent = "Color must look like #e6194b.";
    return;
  }
  if (valuesOpacity.value === "" || !(pct >= 0 && pct <= 100)) {
    valuesError.textContent = "Opacity must be a number from 0 to 100.";
    return;
  }
  setLayerStyle(valuesId, { color: hex, opacity: pct / 100 });
  refresh();
  valuesDialog.close();
});

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
    fill(countrySel, [], "Error");
    say("Could not load countries: " + e.message);
  }
}

countrySel.addEventListener("change", async () => {
  const token = ++selToken;
  EaeController.clear();
  placeholderReset();
  resetLayers();
  clearDistrict();
  states = [];
  datasets = [];
  refresh();
  fill(stateSel, [], "Loading...");
  fill(districtSel, [], "Select a state first");

  const country = countries.find((c) => c.id === countrySel.value);
  if (!country) {
    fill(stateSel, [], "Select a country first");
    setTitle("");
    previewReset();
    say("");
    return;
  }

  setTitle(country.name);
  placeholderFit(country.envelope);
  previewPlace(country.name, country.envelope);
  say(country.name + " selected");

  await loadStates(country.id);
  if (token !== selToken) return;

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
  resetLayers();
  clearDistrict();
  datasets = [];
  refresh();

  const geo = states.find((s) => s.id === stateSel.value);
  if (!geo) {
    EaeController.clear();
    fill(districtSel, [], "Select a state first");
    const country = countries.find((c) => c.id === countrySel.value);
    if (country) {
      placeholderFit(country.envelope);
      previewPlace(country.name, country.envelope);
    } else {
      placeholderReset();
      previewReset();
    }
    say("");
    return;
  }

  setTitle(geo.name);
  placeholderFit(geo.envelope);
  previewPlace(geo.name, geo.envelope);
  say(geo.name + " selected");
  selectGeography(geo, token);
});

// ---- 3. A geography is chosen: load its datasets, outline and districts ----
async function selectGeography(geo, token) {
  fill(districtSel, [], "Loading...");
  datasetList.innerHTML = '<li class="empty">Loading layers...</li>';

  if (typeof updateScenarioDropdown === "function") {
    updateScenarioDropdown(geo.id);
  }

  if (typeof EaeController !== "undefined" && geo && geo.id) {
    EaeController.load(geo.id);
  }

  let list;
  try {
    list = await fetchDatasets(geo.id);
  } catch (e) {
    console.error(e);
    if (token !== selToken) return;
    say("Could not load datasets: " + e.message);
    datasetList.innerHTML = '<li class="empty">Could not load layers.</li>';
    fill(districtSel, [], "Error");
    return;
  }
  if (token !== selToken) return;
  datasets = list;
  refresh();

  loadOutline(datasets, token);
}

// The preview map shows the real outline when the geography has one.
async function loadOutline(list, token) {
  try {
    const gj = await fetchOutline(list);
    if (token !== selToken || !gj) return;
    previewOutline(gj);
  } catch (e) {
    console.warn("Outline not readable:", e);
  }
}

// ---- 4. Districts (driven by eae:ready divisions) --------------------------
window.onDivisionsLoaded = function (divisions) {
  if (!divisions || !divisions.length) {
    fill(districtSel, [], "District list unavailable");
    return;
  }

  // Find administrative tier 1 (districts)
  const tier1 = divisions.find((d) => d.tier === 1) || divisions[0];
  if (!tier1 || !tier1.entries || !tier1.entries.length) {
    fill(districtSel, [], "No districts found");
    return;
  }

  const items = tier1.entries
    .map((e) => ({ value: String(e.id), label: e.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  fill(districtSel, items, "Select a district...");
  districtSel.disabled = false;
};

districtSel.addEventListener("change", () => {
  if (!districtSel.value) {
    say("");
    syncUrl();
    return;
  }

  const subdivId = Number(districtSel.value);
  EaeController.send({ divtier: 1, subdiv: subdivId });
  const opt = districtSel.options[districtSel.selectedIndex];
  say("District: " + (opt ? opt.text : districtSel.value));
  syncUrl();
});

// ---- 5. Layers (toggle switches) -------------------------------------------
async function toggleLayer(d, checkbox) {
  if (!checkbox.checked) {
    removeDataLayer(d.id);
    advOpen.delete(d.id);
    refresh();
    return;
  }
  if (active[d.id]) return;

  loadingIds.add(d.id);
  checkbox.closest(".ds").classList.add("loading");
  say("Loading " + d.name_long + "...");
  try {
    const gj = await fetchGeoJSON(d);
    const { shown, total } = addDataLayer(d.id, d.name_long, gj);
    say(
      d.name_long +
        ": " +
        (shown === total
          ? shown + " features"
          : shown + " of " + total + " features in " + districtSel.value),
    );
  } catch (e) {
    console.error(e);
    checkbox.checked = false;
    say(
      "Could not load " +
        d.name_long +
        ": " +
        e.message +
        " (check the Console for a CORS error)",
    );
  } finally {
    loadingIds.delete(d.id);
    refresh();
  }
}

// ---- 6. Rail, tabs, drawer, dialogs ----------------------------------------
document.querySelectorAll(".rail-item").forEach((btn) => {
  btn.classList.toggle("active", btn.dataset.cat === category);
  btn.addEventListener("click", () => {
    category = btn.dataset.cat;
    document
      .querySelectorAll(".rail-item")
      .forEach((b) => b.classList.toggle("active", b === btn));
    closeMenu();
    renderDatasets();
  });
});

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    tab = btn.dataset.tab;
    document
      .querySelectorAll(".tab")
      .forEach((b) => b.classList.toggle("active", b === btn));
    // On phones the results panel is only shown on the Analysis tab.
    document.body.classList.toggle("show-results", tab === "analysis");
    renderResults();
    // map.invalidateSize();
    previewResize();
  });
});

$("menu-btn").addEventListener("click", () => side.classList.toggle("open"));
// map.on("click", () => side.classList.remove("open"));

const dialog = $("dialog");
function openDialog(kind) {
  $("dialog-title").textContent = kind === "help" ? "Help" : "Disclaimer";
  $("dialog-text").textContent = TEXTS[kind];
  dialog.showModal();
}
$("help-btn").addEventListener("click", () => openDialog("help"));
$("about-btn").addEventListener("click", () => openDialog("help"));
$("disclaimer-btn").addEventListener("click", () => openDialog("disclaimer"));
$("dialog-close").addEventListener("click", () => dialog.close());

window.addEventListener("resize", previewResize);

// ---- 7. URL state: update the address bar and restore from it --------------
// Runs after the change handlers above, so the dropdown values are up to date.
[countrySel, stateSel, districtSel].forEach((s) =>
  s.addEventListener("change", syncUrl),
);

// ---- Scenarios (mentor snapshots) ------------------------------------------
function updateScenarioDropdown(stateId) {
  if (!cropSel || typeof CROPS === "undefined") return;

  const validScenarios = CROPS.filter((c) => c.geography === stateId);
  if (!validScenarios.length) {
    fill(cropSel, [], "No scenarios for this area yet");
    cropSel.disabled = true;
    return;
  }

  fill(
    cropSel,
    validScenarios.map((c) => ({ value: c.id, label: c.label })),
    "Select a scenario",
  );
  cropSel.disabled = false;
}

if (cropSel) {
  cropSel.addEventListener("change", () => {
    const stateId = stateSel.value;
    if (!stateId) return;

    const selectedCrop = typeof CROPS !== "undefined"
      ? CROPS.find((c) => c.id === cropSel.value)
      : null;

    if (selectedCrop && selectedCrop.snapshot) {
      say("Loaded mock analysis: " + selectedCrop.label);
      EaeController.load(stateId, { snapshot: selectedCrop.snapshot });
    } else {
      say("Restored baseline state view");
      EaeController.load(stateId);
    }

    syncUrl();
  });
}

// ---- Suitable areas criteria toggle ----------------------------------------
if (criteriaToggle) {
  criteriaToggle.addEventListener("change", () => {
    const isChecked = criteriaToggle.checked;
    EaeController.send({ criteria: isChecked });
    say(isChecked ? "Only suitable areas enabled" : "Criteria mask disabled");
    syncUrl();
  });
}

window.onEaeViewChanged = function (view) {
  updateFullMapLink();
};

// Wait until a condition is true (or give up after `ms`).
const waitFor = (test, ms = 20000) =>
  new Promise((resolve) => {
    const t0 = Date.now();
    (function tick() {
      if (test() || Date.now() - t0 > ms) return resolve(test());
      setTimeout(tick, 100);
    })();
  });

const hasOption = (sel, v) => [...sel.options].some((o) => o.value === v);

async function restoreFromUrl() {
  const cId = initialParams.get("country");
  const sId = initialParams.get("state");
  const dName = initialParams.get("district");
  const layerIds = (initialParams.get("layers") || "")
    .split(",")
    .filter(Boolean);

  try {
    if (!cId || !hasOption(countrySel, cId)) return;
    countrySel.value = cId;
    countrySel.dispatchEvent(new Event("change"));

    if (sId) {
      if (!(await waitFor(() => hasOption(stateSel, sId)))) return;
      stateSel.value = sId;
      stateSel.dispatchEvent(new Event("change"));
    }

    // District first
    if (dName && (await waitFor(() => hasOption(districtSel, dName)))) {
      districtSel.value = dName;
      districtSel.dispatchEvent(new Event("change"));
    }

    const scenarioId = initialParams.get("scenario");
    if (scenarioId && cropSel && (await waitFor(() => hasOption(cropSel, scenarioId)))) {
      cropSel.value = scenarioId;
      cropSel.dispatchEvent(new Event("change"));
    }

    const criteriaParam = initialParams.get("criteria");
    if (criteriaParam && criteriaToggle) {
      criteriaToggle.checked = (criteriaParam === "1" || criteriaParam === "true");
      criteriaToggle.dispatchEvent(new Event("change"));
    }

    if (layerIds.length) {
      await waitFor(() => datasets.length > 0);
      // toggleLayer only needs .checked and .closest(".ds").classList.add
      const fake = {
        checked: true,
        closest: () => ({ classList: { add() {} } }),
      };
      await Promise.all(
        layerIds.map((id) => {
          const d = datasets.find((x) => String(x.id) === id);
          return d && isDrawable(d) && !active[d.id]
            ? toggleLayer(d, { ...fake })
            : null;
        }),
      );
    }
  } finally {
    restoring = false;
    syncUrl();
  }
}

refresh();
if (typeof EaeController !== "undefined") EaeController.init("eae-frame");
loadCountries().then(restoreFromUrl);




