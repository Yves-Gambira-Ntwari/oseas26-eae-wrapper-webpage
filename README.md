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

## How to run this wrapper

Do not open `views/index.html` as a `file://` page. Serve the repository root
over HTTP:

```bash
python Server.py
```

Then open <http://localhost:8000/views/index.html>.

Any static server works (`npx serve .`, VS Code Live Server). The page loads
countries and states from the public EAE API and embeds the live tool at
`https://www.energyaccessexplorer.org/tool/a/?id=<geography>&inputs=<datasets>`.

### Configure regions and crops

Edit `src/config.js`:

- `EAE_ORIGIN` / `EAE_APP_PATH` — which EAE instance to embed
- `DEFAULT_COUNTRY_ID` / `DEFAULT_STATE_ID` — first-load geography (India / Nagaland)
- `CROPS_BY_GEOGRAPHY` — crop dropdown entries per geography id
- each crop: `{ id, label, inputs: ["dataset-name"], snapshot?: "id", mock?: true }`

When organisers publish mock crop-suitability analyses, replace `inputs` or set
`snapshot` to the saved EAE view. No other files need to change.

Shareable wrapper URLs look like:

`/views/index.html?country=<id>&state=<id>&district=<id>&crop=<id>`

Changing a dropdown reloads the iframe so the selection always overrides
whatever the visitor last did inside EAE.

### Known limitations

- EAE does not currently collapse its own side panels or accept `postMessage`.
  The wrapper maximises the map area around the iframe and sends `?embed=1` so
  a future EAE patch can pick that up. Until then, EAE’s panels stay as the
  live tool draws them.
- EAE refuses to start below about 768 px. On phones the wrapper scales a
  desktop-sized iframe down so the map still appears.
- Nagaland does not yet have crop-suitability rasters in the public API. The
  crop list there is marked **(mock)** and lights Land Use / Land Cover until
  the organisers share the mock analyses.
- District zoom only works when the district exists as an EAE geography
  (`/geographies` child). Many Indian states, including Nagaland, expose
  districts as a layer inside EAE rather than as a separate `id`.
- Attribution: <https://www.energyaccessexplorer.org/attribution>
