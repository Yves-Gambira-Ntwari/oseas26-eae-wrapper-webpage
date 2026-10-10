// config.js - settings you may want to change. No page logic here.

const API = "https://api.energyaccessexplorer.org";

// Live EAE map. Geography is ?id=; datasets are ?inputs=name1,name2;
// saved views are ?snapshot=<id>. ?embed=1 is ignored today, reserved for a
// future EAE patch (collapsed panels / postMessage).
const EAE_ORIGIN = "https://www.energyaccessexplorer.org";
const EAE_APP_PATH = "/tool/a/";

// First load: India → Nagaland (the government partner named in the brief).
const DEFAULT_COUNTRY_ID = "7d10f6b0-32b1-4803-b202-4c4325cc4d83";
const DEFAULT_STATE_ID = "61cc6dc7-2159-405f-a0df-6faa8c583923";

// Minimum inner width so EAE does not hit its "desktop required" gate (~768px).
const EAE_MIN_WIDTH = 1280;
const EAE_MIN_HEIGHT = 800;

// Names that look like crop / suitability layers when we scan the API.
const CROP_NAME_RE =
  /crop|agri|suitab|rice|maize|wheat|sorghum|cassava|onion|potato|tomato|sugarcane|plantation|cropland|lulc/i;

// Mock crop names for geographies that do not yet have organiser-provided
// suitability analyses. Each entry maps to real EAE dataset `name`s so the
// iframe still lights something up. Replace `inputs` / `snapshot` when the
// mock analyses are published — no other code change needed.
const MOCK_CROPS = [
  {
    id: "rice",
    label: "Rice",
    inputs: ["lulc-mutant", "district-boundaries"],
    mock: true,
  },
  {
    id: "maize",
    label: "Maize",
    inputs: ["lulc-mutant", "district-boundaries"],
    mock: true,
  },
  {
    id: "soybean",
    label: "Soybean",
    inputs: ["lulc-mutant"],
    mock: true,
  },
  {
    id: "pineapple",
    label: "Pineapple",
    inputs: ["lulc-mutant"],
    mock: true,
  },
];

// Optional overrides per geography id. Use `snapshot` instead of `inputs`
// when mentors share saved-analysis ids.
const CROPS_BY_GEOGRAPHY = {
  // Mizoram — real crop layers already in EAE
  "39e4dcfd-7a0f-4534-9d90-e3f0dc4344c9": [
    {
      id: "sugarcane-area",
      label: "Sugarcane (area)",
      inputs: ["crop-sugarcane-area-ha"],
    },
    {
      id: "sugarcane-prod",
      label: "Sugarcane (production)",
      inputs: ["crop-sugarcane-prod-mt"],
    },
  ],
  // Kenya — irrigated crop energy-demand rasters
  "562ffd81-d326-41e4-9ba0-2dedb21130b2": [
    {
      id: "maize",
      label: "Maize (irrigated)",
      inputs: ["energy-demand-for-irrigated-maize-crops"],
    },
    {
      id: "wheat",
      label: "Wheat (irrigated)",
      inputs: ["energy-demand-for-irrigated-wheat-crops"],
    },
    {
      id: "potato",
      label: "Potato (irrigated)",
      inputs: ["energy-demand-for-irrigated-potato-crops"],
    },
    {
      id: "tomato",
      label: "Tomato (irrigated)",
      inputs: ["energy-demand-for-irrigated-tomato-crops"],
    },
    {
      id: "onion",
      label: "Onion (irrigated)",
      inputs: ["energy-demand-for-irrigated-onion-crops"],
    },
    {
      id: "sorghum",
      label: "Sorghum (irrigated)",
      inputs: ["energy-demand-for-irrigated-sorghum-crops"],
    },
    {
      id: "cassava",
      label: "Cassava (irrigated)",
      inputs: ["energy-demand-for-irrigated-cassava-crops"],
    },
  ],
  // Nagaland — mocks until crop-suitability analyses are preloaded
  "61cc6dc7-2159-405f-a0df-6faa8c583923": MOCK_CROPS,
};

const TEXTS = {
  help:
    "Choose a country and state, then a crop. The Energy Access Explorer map " +
    "reloads on that area with the matching layers switched on. You can still " +
    "pan, zoom and use EAE’s own sliders. Dropdowns always win: changing them " +
    "resets the embed to your selection.",
  disclaimer:
    "This page wraps public Energy Access Explorer data. It is an independent " +
    "OSEAS hackathon wrapper, not an official WRI product. Boundaries and " +
    "layers are shown as published and may be incomplete. Mock crop names are " +
    "placeholders until organisers provide crop-suitability analyses.",
};
