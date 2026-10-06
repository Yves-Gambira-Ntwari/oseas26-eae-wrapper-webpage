// data.js - everything that talks to the EAE API or reads data files.
// These functions only fetch and return data; they never touch the page or map.

async function api(path, params) {
  const res = await fetch(API + path + "?" + new URLSearchParams(params));
  if (!res.ok) throw new Error("API " + res.status + " on " + path);
  return res.json();
}

// Countries = top of the tree (no parent).
function fetchCountries() {
  return api("/geographies", {
    select: "id,name,adm,envelope,parent_id",
    parent_id: "is.null",
    order: "name.asc",
  });
}

// States = children of the chosen country.
function fetchStates(countryId) {
  return api("/geographies", {
    select: "id,name,adm,envelope,parent_id",
    parent_id: "eq." + countryId,
    order: "name.asc",
  });
}

function fetchDatasets(geographyId) {
  return api("/datasets", {
    select: "id,name,name_long,type,source_files",
    geography_id: "eq." + geographyId,
    name_long: "not.is.null",
    order: "name_long.asc",
  });
}

function hasVectorFile(d) {
  return (d.source_files || []).some((f) => f.func === "vectors");
}

function isDrawable(d) {
  return DRAWABLE.includes(d.type) && hasVectorFile(d);
}

async function fetchGeoJSON(dataset) {
  const file = dataset.source_files.find((f) => f.func === "vectors");
  const res = await fetch(file.endpoint);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// ---- Districts -----------------------------------------------------------
// Dataset names and property names differ between countries and states,
// so look for them with loose rules instead of one fixed name.
function findDistrictDataset(list) {
  return (
    list.find((d) => d.name === "district-boundaries") ||
    list.find((d) => /district/i.test(d.name || "") && hasVectorFile(d))
  );
}

function detectNameProp(features) {
  const sample = (features.find((f) => f.properties) || {}).properties;
  const keys = Object.keys(sample || {});
  return (
    keys.find((k) => /^district(_?n(ame)?)?$/i.test(k)) ||
    keys.find((k) => /district/i.test(k)) ||
    keys.find((k) => /name/i.test(k)) ||
    null
  );
}

// Returns null when the geography has no district dataset,
// otherwise { features, prop } (prop may be null if no name field was found).
async function fetchDistricts(list) {
  const dd = findDistrictDataset(list);
  if (!dd || !hasVectorFile(dd)) return null;
  const gj = await fetchGeoJSON(dd);
  const features = gj.features || [];
  return { features, prop: detectNameProp(features) };
}
