// config.js - settings you may want to change. No logic here.

const API = "https://api.energyaccessexplorer.org";

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

// World view: the country is not known until the user picks one.
const MAP_DEFAULT = { center: [20, 0], zoom: 2 };

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";

// Max attributes shown in a feature popup.
const POPUP_MAX_ROWS = 12;
