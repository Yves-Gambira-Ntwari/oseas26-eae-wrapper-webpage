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

// Which left-rail group a dataset belongs to (see CATEGORIES in config.js).
function categoryOf(d) {
  const hit = CATEGORIES.find((c) => c.match && c.match.test(d.name_long || d.name || ""));
  return hit ? hit.id : "other";
}

async function fetchGeoJSON(dataset) {
  const file = dataset.source_files.find((f) => f.func === "vectors");
  if (USE_PROXY) {
    try {
      const res = await fetch(PROXY_PATH + encodeURIComponent(file.endpoint));
      if (res.ok) return res.json();
    } catch (e) {
      // proxy not running: fall through to a direct request
    }
  }
  const res = await fetch(file.endpoint);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// ---- Dataset info ("Dataset info" window) ----------------------------------
// The list request above only asks for a few columns. The full row is fetched
// on demand, with select=* so it works whatever the column names are.
async function fetchDatasetInfo(id) {
  const rows = await api("/datasets", { select: "*", id: "eq." + id });
  return rows[0] || null;
}

const normKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");

// First non-empty text value found under any of `names`, in the row itself
// or in its "metadata" object.
function pickField(row, names) {
  let meta = row.metadata;
  if (typeof meta === "string") {
    try {
      meta = JSON.parse(meta);
    } catch (e) {
      meta = null;
    }
  }
  const sources = [row, meta && typeof meta === "object" ? meta : null].filter(Boolean);
  for (const src of sources) {
    for (const name of names) {
      const key = Object.keys(src).find((k) => normKey(k) === normKey(name));
      if (!key) continue;
      const v = src[key];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);
      if (Array.isArray(v) && v.length && v.every((x) => typeof x !== "object")) {
        return v.join(", ");
      }
    }
  }
  return "";
}

// Returns { description, why, citation, cautions, source, license, date,
// download, learn } - empty strings where the API has nothing.
function normalizeInfo(row) {
  const out = {};
  Object.keys(INFO_FIELDS).forEach((k) => {
    out[k] = row ? pickField(row, INFO_FIELDS[k]) : "";
  });
  return out;
}

// ---- Outline (for the small preview map) -----------------------------------
function findOutlineDataset(list) {
  return (
    list.find(
      (d) =>
        /^(outline|boundary|boundaries|country-?outline|geography-?outline)$/i.test(d.name || "") &&
        hasVectorFile(d),
    ) || list.find((d) => /^outline$/i.test(d.name_long || "") && hasVectorFile(d))
  );
}

// Returns GeoJSON, or null when the geography has no outline dataset.
async function fetchOutline(list) {
  const d = findOutlineDataset(list);
  return d ? fetchGeoJSON(d) : null;
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
