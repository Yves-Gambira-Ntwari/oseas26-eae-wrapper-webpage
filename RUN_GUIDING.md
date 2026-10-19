# EAE Wrapper Webpage

A web page that makes the [Energy Access Explorer (EAE)](https://www.energyaccessexplorer.org/) map easy to use. Built for the OSEA Symposium Hackathon (Kigali, 26-27 October).

Official repo: [EnAccess/oseas26-eae-wrapper-webpage](https://github.com/EnAccess/oseas26-eae-wrapper-webpage)  
Team fork: [Yves-Gambira-Ntwari/oseas26-eae-wrapper-webpage](https://github.com/Yves-Gambira-Ntwari/oseas26-eae-wrapper-webpage)  
Full team guide: [RUN_GUIDING.md](https://github.com/Yves-Gambira-Ntwari/oseas26-eae-wrapper-webpage/blob/dev/RUN_GUIDING.md)

## What it does

- Dropdown to choose an administrative boundary (state, then district).
- Dropdown to choose a crop.
- Map area (an embedded EAE map in an iframe) that zooms to the chosen boundary and shows where the chosen crop is suitable.
- Layout and look adapted from [nagalandgis.in](https://nagalandgis.in/), so it can be used as an additional page on that site.
- On load: EAE side panels collapsed, a sensible default zoom, and a layout that works on desktop and mobile.

This repo does **not** contain EAE itself, the boundary layers or the crop analyses. EAE is embedded; the organizers provide the boundaries and mock crop suitability data.

## Project structure

```
├── views/index.html       page shell: header, dropdowns, map area, footer
├── stylesheets/style.css  layout, responsive sizing, look and feel
├── src/
│   ├── config.js          EAE address, default zoom, panel settings
│   ├── data.js            boundaries, crops, IDs
│   ├── embed.js           builds the iframe URL / moves the map
│   └── main.js            connects the dropdowns to the map
├── bin/                   optional helper scripts
└── README.md
```

Plain HTML, CSS and JavaScript. There is no build step.

## Run locally

Requires [Node.js](https://nodejs.org/) (npm comes with it).

```bash
git clone https://github.com/Yves-Gambira-Ntwari/oseas26-eae-wrapper-webpage.git
cd oseas26-eae-wrapper-webpage
npx http-server -p 8000
```

Then open `http://localhost:8000/views/index.html`.

Notes:

- **Do not open `index.html` by double-clicking.** Pages from `file://` have no origin, so map and data requests fail. The address must start with `http://`.
- Port **8000** is the one EAE's embed mode allows by default, so keep it.
- Other options: VS Code "Live Server" extension (right-click `index.html` > Open with Live Server), or `python -m http.server 8000` (`py -m http.server 8000` on Windows).

## Configure the map

Set the EAE address in `src/config.js`:

- **Public EAE:** `https://www.energyaccessexplorer.org/tool/s`
- **Local EAE tool (embed-mode fork):** `http://localhost:3000/tool/a/?id=61cc6dc7-2159-405f-a0df-6faa8c583923&embed=1`. See the tool repo's README for how to build and serve it on port 3000.

When the embed-mode fork is used, the page controls the map with `window.postMessage`:

| Message | Direction | Purpose |
|---|---|---|
| `eae:ready` | EAE → page | Tool is initialized; includes the list of divisions |
| `eae:view` | EAE → page | Camera moved (`zoom`, `center`) |
| `eae:set` | page → EAE | Set `divtier`, `subdiv`, `zoom`, `center`, `bounds`, `view`, `criteria`, `layers: { on, off }` |

Send messages to the tool's origin, never `"*"`.

## Data sources

- States: `https://api.energyaccessexplorer.org/geographies` (each has an `envelope` bounding box)
- Datasets: `https://api.energyaccessexplorer.org/datasets`

Layer files on `energyaccess-storage.s3.amazonaws.com` are blocked by CORS when fetched directly by this page. Show layers through the embedded EAE tool instead.

## Attribution

Read [the EAE attribution page](https://www.energyaccessexplorer.org/attribution). The page footer must carry the required credit.

## Contributing

We work through forks and pull requests against `main`.

```bash
git remote add upstream https://github.com/EnAccess/oseas26-eae-wrapper-webpage.git
git fetch upstream
git merge upstream/main
```

- One issue, one pull request. Get assigned to the issue first.
- PR titles use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`) because PRs are squash-merged.
- Keep PRs small, link the issue with `closes:` in the PR description, describe how you tested, and attach desktop and mobile screenshots.
- Have a teammate review before maintainers do.
