<p align="center">
  <a href="https://github.com/EnAccess/oseas26-eae-wrapper-webpage">
    <img
      src="https://drive.google.com/uc?id=1gtL_p7l3HbOcCzc09A7KW5d7B5qn-BDs"
      alt="A wrapper webpage for EAE's Analysis"
      width="640"
    >
  </a>
</p>
<p align="center">
    October 26-27 | Open Source in Energy Access Symposium Hackathon | Kigali, Rwanda
</p>

---

# A wrapper webpage for EAE's Analysis

A basic webpage that embeds the
[Energy Access Explorer (EAE)](https://www.energyaccessexplorer.org) analysis in
an interactive, preconfigured map window.

## Abstract and goal

A basic webpage should be developed with the Energy Access Explorer (EAE)
platform embedded within a map window, similar to a Leaflet-based
implementation. The webpage design and layout can be adapted from the template
used on <https://nagalandgis.in/> and integrated as an additional page within the
existing website.

The embedded EAE map should be configured with an appropriate default zoom level
and responsive sizing to ensure optimal viewing and usability across both desktop
and mobile devices. When the page loads, the left and right side panels of EAE
should be collapsed by default to maximize the visible map area.

The webpage should provide user controls for selecting two key parameters that
are linked to the embedded EAE platform:

- Administrative boundary hierarchy
- Crop names

Based on the user's selections, the webpage should enable users to automatically
zoom to the selected administrative boundary and visualize or highlight areas
identified as suitable for growing the selected crop. The required administrative
boundary layers will be preloaded within the EAE platform, and a set of mock crop
suitability analyses will be provided to support the development and testing of
the webpage functionality.

## Expected outcomes

- An iframe which allows users to have an interactive map of the pre-selected
  data embedded on an HTML page. It will render the map with your exact dataset
  combinations and legend.
- A live mirror of EAE where the map remains fully interactive. This means
  visitors to the wrapper website will still be able to move sliders around or
  zoom in and out if they choose to explore the data further.

## Required knowledge

### Stack

- iframe-based implementation.
- Embedded EAE map with preset data and configuration in a wrapper webpage.

EAE is written in plain/modern JavaScript (ECMAScript 2020). There is no
framework; instead a traditional C-style programming pattern is enforced. The
directories contain:

- `src`: JavaScript code
- `stylesheets`: CSS code
- `views`: HTML documents
- `bin`: scripts and executables

### Helpful experiences

- Experience in UI/UX.
- Experience with iframe.
- Familiarity with web mapping and UI tools.

## Person of contact supporting this challenge

- Akansha Saklani
- Abdul Khalid

## Getting started

- Join the OSEAS Discord server: <https://community.oseas.org/>
- Introduce yourself in the `#introductions` channel and join the relevant
  channels for this challenge.
- For physical participants: bring a computer (and required adapters) for some
  hacking.
- Read the documentation:
  - [Energy Access Explorer](https://www.energyaccessexplorer.org)
  - [EAE GitHub](https://github.com/energyaccessexplorer)
  - [EAE Technical Note](https://www.wri.org/research/energy-access-explorer-data-and-methods?ap3c=IGaj6AgspJqgeKwBAGaj6AgmzCZ5Iv70Fr7H6ahniwtFr1FOgg)

---

## Local Setup & How to Run

1. **Start the local server:**
   ```bash
   python server.py
   ```
   This serves the wrapper page at `http://localhost:8000` and provides a localhost-restricted proxy (`/proxy?url=...`) for CORS-restricted S3 files.

2. **Run your EAE tool build (local or hosted):**
   - For local development, serve your built `tool` fork on port 3000:
     ```bash
     npx http-server serve -p 3000 -c-1
     ```
   - Alternatively, pass `?tool_url=<your-hosted-pages-url>/tool/a/` in the browser address bar.

3. **Open the application:**
   - Open [http://localhost:8000/views/index.html](http://localhost:8000/views/index.html).

---

## Features & Implementation Details

- **Embedded EAE Iframe (`src/embed.js`):** Replaces the Leaflet map in the main stage with an accessible, high-performance EAE iframe.
- **Collapsed Panels on Load:** Embedded iframe runs in `?embed=1` mode, hiding the top navbar and collapsing left/right panels on initial load.
- **Boundary Dropdown Hierarchy:** Selecting Country, State (e.g. Nagaland), and District communicates with the embedded map to zoom to the boundary without full page reloads.
- **Crop / Scenario Selector:** Allows choosing between Scenarios (Scenario 1, Scenario 2, Maize, Rice, Cassava) which passes filter inputs and updates suitability analysis on the map.
- **Sensible Default Zoom:** Centers on Nagaland state (`lng: 94.5, lat: 26.1`, zoom level 8) by default.
- **Responsive Phone & Desktop Layout:** Adapts smoothly across phone (360px), tablet (768px), and desktop (1200px) viewports with branding and styling inspired by [nagalandgis.in](https://nagalandgis.in/).
- **Loading & Fallback Error States:** Features an animated loading spinner while waiting for the iframe's `eae:ready` handshake, and an "Open full map" fallback link.

---

## How to Add a Crop Scenario or Boundary

1. **Adding a Crop / Scenario:**
   - In `src/config.js`, add a new entry to the `CROPS` array:
     ```javascript
     { id: "scenario_new", label: "Scenario Name", dataset: "dataset_key", inputs: "input_categories" }
     ```
2. **Adding an Administrative Boundary:**
   - Boundaries are dynamically queried from the EAE API (`/geographies`). New administrative subdivisions published in the EAE backend automatically populate in the Country -> State -> District dropdowns.

---

## Known Limits

- **Initial Load Time:** Startup of the complex EAE WebGL/Mapbox engine inside an iframe takes 5–15 seconds depending on network connection and device performance.
- **S3 CORS Restrictions:** Some S3 vector files require the local `server.py` proxy on localhost because upstream S3 buckets do not allow cross-origin requests directly from arbitrary client origins.
