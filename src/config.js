// config.js - settings you may want to change. No logic here.

const API = "https://api.energyaccessexplorer.org";

// Base URL for the embedded EAE tool. Config-driven only (no ?tool_url= override).
const EAE_APP = "http://localhost:3000/tool/a/";
const EAE_ORIGIN = new URL(EAE_APP).origin;

// Default initial geography (Nagaland state UUID) and fallback settings
const DEFAULT_GEOGRAPHY_ID = "61cc6dc7-2159-405f-a0df-6faa8c583923";
const DEFAULT_ZOOM = 8;
const DEFAULT_CENTER = { lng: 94.5, lat: 26.1 };

// Dataset types the map knows how to draw.
const DRAWABLE = ["points", "lines", "polygons", "polygons-boundaries"];

// Colors given to layers, in order.
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

const DEFAULT_OPACITY = 0.25;
const MAP_DEFAULT = { center: [26.1, 94.5], zoom: 8 };

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";

const POPUP_MAX_ROWS = 12;
const TOOLTIP_MAX_ROWS = 6;

const CATEGORIES = [
  { id: "census", label: "Census", match: /census|population|household|roof|radio|lighting|cooking|literacy|ownership/i },
  { id: "demand", label: "Demand", match: /demand|crop|agri|health|school|education|market|business|income|poverty|night/i },
  { id: "supply", label: "Supply", match: /supply|solar|wind|hydro|geothermal|biomass|power|grid|transmission|substation|line|road|mini|ghi|elevation|slope/i },
  { id: "other", label: "Other", match: null },
  { id: "all", label: "All", match: null },
];
const DEFAULT_CATEGORY = "all";

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

const USE_PROXY = ["localhost", "127.0.0.1"].includes(location.hostname);
const PROXY_PATH = "/proxy?url=";

const TEXTS = {
  help: "Select a country and state (e.g., India -> Nagaland) to view energy access data. Use the District dropdown to zoom into administrative subdivisions, and select crop scenarios to view suitability areas on the embedded map.",
  disclaimer:
    "This page is an independent wrapper around public Energy Access Explorer data based on nagalandgis.in styling. Boundaries and datasets are shown as provided by the source.",
};

// Verified mentor scenarios for Nagaland (61cc6dc7-2159-405f-a0df-6faa8c583923)
const CROPS = [
  {
    id: "scenario_1",
    label: "Scenario 1: Maize & Rainfed Suitability (Mock Analysis)",
    snapshot: "1791614683478",
    geography: "61cc6dc7-2159-405f-a0df-6faa8c583923",
    mock: true,
  },
  {
    id: "scenario_2",
    label: "Scenario 2: Commercial Rice & Solar Irrigation (Mock Analysis)",
    snapshot: "1791615168733",
    geography: "61cc6dc7-2159-405f-a0df-6faa8c583923",
    mock: true,
  },
];
