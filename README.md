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

1. **Serve the EAE Tool Fork (Port 3000):**
   In the `tool` repository directory:
   ```bash
   # 1. Compile TypeScript
   npx tsc -p .

   # 2. Assemble distribution with BSD Make
   bmake build-a   # on Linux/macOS, or: wsl bash -c "bmake build-a" on Windows

   # 3. Serve the tool on port 3000
   npx http-server serve -p 3000 -c-1
   ```

2. **Serve the Wrapper Webpage (Port 8000):**
   In this repository root directory:
   ```bash
   npx http-server -p 8000 -c-1
   ```
   *(Or using Python: `python -m http.server 8000`)*

3. **Open the application:**
   Navigate in your browser to:
   [http://localhost:8000/views/index.html](http://localhost:8000/views/index.html)

---

## Features & Implementation Details

- **Embedded EAE Iframe (`src/embed.js`):** Integrates the customized EAE platform inside a central responsive stage with full WebGL performance.
- **Strict PostMessage Protocol:** Secure bidirectional messaging between wrapper and tool (`eae:ready`, `eae:set`, `eae:view`) validated against `EAE_ORIGIN`.
- **Default Startup Screen (W1):** Starts clean with a Leaflet overview map and empty state dropdowns. The EAE iframe only loads once a geography is selected.
- **Administrative Boundary Hierarchy (W4 & W5):** Dynamic Country → State selection, followed by district selection populated directly from the tool's `eae:ready` divisions payload. Selecting a district zooms the Mapbox camera to that district.
- **Mentor Analysis Scenarios (W8):** Configured with verified mentor snapshot IDs for Nagaland:
  - **Scenario 1**: Population & Solar GHI (`1791614683478`)
  - **Scenario 2**: Schools & Solar GHI (`1791615168733`)
  Automatically disabled with *"No scenarios for this area yet"* when viewing geographies without preconfigured scenarios (e.g. Jharkhand).
- **Criteria Mask Toggle:** Real-time *"Only suitable areas"* checkbox sends criteria filtering to the embedded tool without page reload.
- **Two-Way URL State Synchronization (W9 & W10):** Automatically reflects active state in query parameters (`?country=...&state=...&district=...&scenario=...&criteria=...`). Reloading the page or sharing the link restores the exact state.
- **Open Full Map Action:** Direct link to open the current analysis in a standalone EAE tab with identical parameters.
- **Responsive Mobile & Desktop Layout (W13):** Fluid layout supporting viewports from 360px up to widescreen desktops, adhering to Nagaland GIS branding guidelines.

---

## Configuration (`src/config.js`)

All endpoints and preconfigured snapshots are centralized in `src/config.js`:
- `EAE_APP`: Points to the local tool endpoint (`http://localhost:3000/tool/a/`).
- `DEFAULT_GEOGRAPHY_ID`: Default Nagaland UUID (`61cc6dc7-2159-405f-a0df-6faa8c583923`).
- `CROPS`: Verified mentor scenario definitions.

---

## License & Attribution

Developed for the Open Source in Energy Access Symposium Hackathon (OSEAS 2026).
Based on Energy Access Explorer by the World Resources Institute (WRI). Licensed under MIT.
