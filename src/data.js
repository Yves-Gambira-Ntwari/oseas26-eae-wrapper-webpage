// data.js - talks to the EAE API. Does not touch the page or the iframe.

async function api(path, params) {
  const res = await fetch(API + path + "?" + new URLSearchParams(params));
  if (!res.ok) throw new Error("API " + res.status + " on " + path);
  return res.json();
}

function fetchCountries() {
  return api("/geographies", {
    select: "id,name,adm,envelope,parent_id",
    parent_id: "is.null",
    order: "name.asc",
  });
}

function fetchStates(countryId) {
  return api("/geographies", {
    select: "id,name,adm,envelope,parent_id",
    parent_id: "eq." + countryId,
    order: "name.asc",
  });
}

function fetchDistricts(stateId) {
  return api("/geographies", {
    select: "id,name,adm,envelope,parent_id",
    parent_id: "eq." + stateId,
    order: "name.asc",
  });
}

function fetchDatasets(geographyId) {
  return api("/datasets", {
    select: "id,name,name_long,type",
    geography_id: "eq." + geographyId,
    name_long: "not.is.null",
    order: "name_long.asc",
  });
}

function isCropDataset(d) {
  const text = (d.name_long || "") + " " + (d.name || "");
  if (!CROP_NAME_RE.test(text)) return false;
  if (/cooking|residue|fuel/i.test(text)) return false;
  return !!d.name;
}

// Config crops for this geography, plus any extra crop-like datasets from the API.
function cropsFor(geographyId, datasets) {
  const fromConfig = (CROPS_BY_GEOGRAPHY[geographyId] || MOCK_CROPS).map((c) =>
    Object.assign({ source: c.mock ? "mock" : "config" }, c),
  );
  const seen = new Set(fromConfig.map((c) => c.id));
  const fromApi = (datasets || [])
    .filter(isCropDataset)
    .filter((d) => !seen.has(d.name))
    .map((d) => ({
      id: d.name,
      label: d.name_long,
      inputs: [d.name],
      source: "api",
    }));
  return fromConfig.concat(fromApi);
}
