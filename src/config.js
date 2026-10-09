// config.js - settings you may want to change. No logic here.

const API = "https://api.energyaccessexplorer.org";

// Dataset types the map knows how to draw.
const DRAWABLE = ["points", "lines", "polygons", "polygons-boundaries"];

// Colors given to layers, in order. They are also the quick-pick swatches in
// the "advanced controls" of a layer.
const COLORS = [
  "#e6194b",
  "#3cb44b",
  "#4363d8",
  "#f58231",
  "#911eb4",
  "#008080",
  "#f032e6",
  "#9a6324",
  "#800000",
  "#000075",
];

// Fill opacity of a layer (0-1) before the user changes it.
const DEFAULT_OPACITY = 0.25;

// World view: the country is not known until the user picks one.
const MAP_DEFAULT = { center: [20, 0], zoom: 2 };

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";

// Max attributes shown in a click popup / in the hover tooltip.
const POPUP_MAX_ROWS = 12;
const TOOLTIP_MAX_ROWS = 6;

// Left rail. The API does not give us a category here, so each dataset is put
// in the first group whose pattern matches its name. No match = "other".
// "all" shows everything. Edit the patterns to fit your data.
const CATEGORIES = [
  { id: "census", label: "Census", match: /census|population|household|roof|radio|lighting|cooking|literacy|ownership/i },
  { id: "demand", label: "Demand", match: /demand|crop|agri|health|school|education|market|business|income|poverty|night/i },
  { id: "supply", label: "Supply", match: /supply|solar|wind|hydro|geothermal|biomass|power|grid|transmission|substation|line|road|mini|ghi|elevation|slope/i },
  { id: "other", label: "Other", match: null },
  { id: "all", label: "All", match: null },
];
const DEFAULT_CATEGORY = "all";

// "Dataset info" window. The API field names are not guaranteed, so each
// section lists the names to look for (case and punctuation are ignored, first
// match wins). They are searched in the dataset row and in its "metadata"
// object. If a section stays empty, add the real field name here.
const INFO_FIELDS = {
  description: ["description_long", "description", "about"],
  why: ["why", "why_used", "purpose", "usage"],
  citation: ["citation", "suggested_citation", "cite"],
  cautions: ["cautions", "caution", "warning", "limitations"],
  source: ["sources", "source", "provider"],
  license: ["license", "licence"],
  date: ["date_of_content", "content_date", "date", "year"],
  download: ["download", "download_url", "download_from_source", "source_url"],
  learn: ["learn_more", "learn_more_url", "more_info", "url", "link"],
};

// Large GeoJSON files often fail with CORS errors. When the page runs on
// localhost, try server.py's /proxy first, then fall back to a direct request.
const USE_PROXY = ["localhost", "127.0.0.1"].includes(location.hostname);
const PROXY_PATH = "/proxy?url=";

// Texts for the Help / About / Disclaimer dialogs.
const TEXTS = {
  help: "Pick a country, then a state and (optionally) a district. Switch on any layer in the left panel to draw it. Hover the map to see a place's details, click it for everything we know. In the Legend, click a color dot to recolor a layer. Use the three dots next to a layer for its info, advanced controls and more.",
  disclaimer:
    "This page is an independent wrapper around public Energy Access Explorer data. Boundaries and datasets are shown as provided by the source and may be incomplete or out of date.",
};

// Mock crop analyses configurations
const CROPS = [
  { id: "maize", label: "Maize", dataset: "maize_suitability" },
  { id: "cassava", label: "Cassava", dataset: "cassava_suitability" },
  { id: "rice", label: "Rice", dataset: "rice_suitability" }
];
