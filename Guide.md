# Team Guide: EAE Wrapper Webpage

Working guide for our team of four at the OSEA Symposium Hackathon (Kigali, 26-27 October). Read it fully once, then keep it open. Update it as we learn things.

- Official repo: `EnAccess/oseas26-eae-wrapper-webpage`
- Contacts: Akansha Saklani, Abdul Khalid (ask in the challenge channel on Discord: https://community.oseas.org/)

---

## 1. What we are building

A **web page that makes the Energy Access Explorer (EAE) map easy to access**. The page has:

1. A dropdown to choose an **administrative boundary** (state, then district).
2. A dropdown to choose a **crop**.
3. A **map area** that zooms to the chosen boundary and shows where the chosen crop is suitable.
4. Layout and look adapted from https://nagalandgis.in/, usable as an additional page on that site.
5. On load, EAE's left and right panels **collapsed**, a sensible default zoom, and a layout that works on desktop and mobile.

### What we are NOT building

- We do **not** build EAE or its map engine.
- We do **not** create the boundary layers or crop analyses. The organizers preload the boundaries and provide mock crop suitability analyses.
- We do **not** run EAE's `tool`, `admin` or `website` repos locally. They need a database, API and more.

### The expected outcome (from the brief)

An **iframe** with an interactive EAE map and preset data, which stays fully interactive (sliders, zoom). **Open question:** is a Leaflet map fed from the EAE API acceptable instead? We have asked the organizers (see section 8).

---

## 2. What we know so far

| Finding                                                                                                     | Status                           |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| The map is at `https://www.energyaccessexplorer.org/tool/s` (the site's `index.tmpl` redirects there)       | Confirmed: the page exists       |
| The map loads in a browser                                                                                  | Confirmed by a teammate          |
| The map loads **inside an iframe** (not blocked by `X-Frame-Options` or CSP)                                | **Not yet tested**               |
| Non-public EAE hosts (`test`, etc.) redirect to a login page (from `env.tmpl`)                              | Read in code, not tested         |
| EAE shows a "Desktop Required" overlay (from `nav.tmpl`), which may affect mobile                           | Not yet tested on a phone        |
| States come from `https://api.energyaccessexplorer.org/geographies`, each with an `envelope` (bounding box) | Confirmed in our prototype       |
| Datasets come from `https://api.energyaccessexplorer.org/datasets`                                          | Confirmed in our prototype       |
| Layer files on `energyaccess-storage.s3.amazonaws.com` are **blocked by CORS** for our page                 | Confirmed (error in console)     |
| District data may exist as child geographies in the API                                                     | **Unknown**, to test (section 6) |
| EAE accepts a boundary, crop or panel state through the **URL**                                             | **Unknown**, to research         |

---

## 3. The repos

| Repo                               | Use                                                           |
| ---------------------------------- | ------------------------------------------------------------- |
| **`oseas26-eae-wrapper-webpage`**  | **Our work goes here.** All PRs target this repo.             |
| `tool` (energyaccessexplorer/tool) | Reference only. Read `src` to learn what the URL can control. |
| `admin`                            | Skip. Setup is heavy and the data is preloaded.               |
| `website`                          | Skip. It is EAE's own public site.                            |

**Attribution:** every EAE repo says to read https://www.energyaccessexplorer.org/attribution before using any part of the project. Our page needs the required credit in its footer.

---

## 4. Planned structure

```
oseas26-eae-wrapper-webpage/
├── .github/            issue templates, PR template (already there)
├── views/
│   └── index.html      page shell: header, dropdowns, map area, footer
├── stylesheets/
│   └── style.css       layout, responsive sizing, nagalandgis-style look
├── src/
│   ├── config.js       EAE address, default zoom, panel settings
│   ├── data.js         boundaries, crops, IDs
│   ├── embed.js        builds the iframe URL / moves the map
│   └── main.js         connects the dropdowns to the map
├── bin/                optional helper scripts
├── TEAM_GUIDE.md       this file
└── README.md           challenge description (add "how to run" later)
```

This mirrors EAE's own `src`, `stylesheets`, `views`, `bin` layout. Everything is plain HTML, CSS and JavaScript with no build step, so it can be moved into another website easily.

---

## 5. Who does what

| Person                       | Name      | Tasks                                                | Branches                                      | Files                                       |
| ---------------------------- | --------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| **A** (UI/UX)                | _fill in_ | Page skeleton, then responsive polish                | `feat-page-skeleton`, `fix-responsive-layout` | `views/index.html`, `stylesheets/style.css` |
| **B** (EAE research)         | _fill in_ | Find what the URL can control, test iframe embedding | `feat-eae-config`                             | `src/config.js`                             |
| **C** (data and logic)       | _fill in_ | Boundary and crop data, then the map-control logic   | `feat-data-config`, `feat-embed-builder`      | `src/data.js`, `src/embed.js`               |
| **D** (integration and docs) | _fill in_ | Team setup, wire dropdowns, README                   | `feat-wire-controls`, `docs-readme-run`       | `src/main.js`, `README.md`                  |

Stay in your own files where possible so merge conflicts stay rare.

**Reviews:** A is reviewed by D, B by C, C by B, D by A.

---

## 6. First tasks, by person

**A:** Build the skeleton with a grey placeholder where the map goes. Make it responsive and test it in a phone-sized window. Add the EAE attribution to the footer.

**B:**

1. Put the EAE URL in a plain iframe (`<iframe src="https://www.energyaccessexplorer.org/tool/s" style="width:100%;height:100vh;border:0">`) served from a local server. Does it load, or is it blocked? Check the console for `X-Frame-Options` or `frame-ancestors`.
2. In the live tool, choose different areas and watch whether the address bar changes.
3. In `tool/src`, search for `URLSearchParams`, `location.search`, `location.hash`, `geography`, `division`, `panel`, `postMessage`. Write down what the URL can control, with example URLs, in the `feat-eae-config` issue.
4. Test on a phone: does the "Desktop Required" overlay cover the map?

**C:**

1. Test whether districts are in the API. Open `https://api.energyaccessexplorer.org/geographies?name=eq.Mizoram&select=id,name,adm,envelope`, copy the `id`, then open `https://api.energyaccessexplorer.org/geographies?parent_id=eq.<id>&select=id,name,adm,envelope`.
2. Find where the mock crop analyses are. Ask the organizers if the dataset list does not show them.
3. Draft `data.js` in this shape and fill it in as facts arrive:
   ```js
   { id: "...", name: "...", level: "state", parentId: "...", envelope: [west, south, east, north] }
   ```

**D:** Fork and clone the repo, create the seven issues (one per task), make sure everyone has claimed theirs, post the questions in section 8 on Discord, and write a short "how to run" for the README.

---

## 7. Running the page locally

Do **not** open `index.html` by double-clicking. Pages from `file://` have no origin, so map tiles and data requests fail. Use a local server:

- **VS Code Live Server** (easiest): install the extension "Live Server", right-click `index.html`, **Open with Live Server**.
- **Node:** `npx http-server -p 8000`, then open `http://localhost:8000/index.html`.
- Python is not installed on every machine. If you have it: `python -m http.server 8000` (or `py -m http.server 8000` on Windows).

The address bar must begin with `http://`.

### Known problem: CORS on the layer files

Layer files on `energyaccess-storage.s3.amazonaws.com` cannot be read by our page (`No 'Access-Control-Allow-Origin' header`). This is the server's setting, not our code. Options: ask the organizers to enable CORS, show the layers through EAE's own tool in an iframe, or download the few files we need (check size, licence and attribution first).

---

## 8. Open questions for the organizers

Send these in the challenge Discord channel and record the answers here.

1. Which URL do we embed? Is it `https://www.energyaccessexplorer.org/tool/s`, or a separate deployment with the preloaded boundaries and mock crop analyses?
2. Is that deployment public, or does it need a login?
3. What are the IDs of the boundaries and the mock crop analyses, and where do the crop analyses live?
4. How can the boundary, crop analysis, zoom and collapsed panels be set from outside (URL parameters or `postMessage`)? If EAE cannot do it yet, may we propose a small PR to `tool`?
5. Is iframe embedding allowed? Can the top bar be hidden, and does the "Desktop Required" overlay appear on phones?
6. Is a Leaflet map fed by the EAE API acceptable, or must the map be EAE's own tool in an iframe?
7. Can CORS be enabled on the S3 bucket for our page?
8. Should the final page be standalone in our repo or added to the nagalandgis.in codebase?

**Answers so far:** _(write them here)_

---

## 9. Git workflow

We work through forks and pull requests, as the contributing guide asks.

```bash
# one-time setup
git clone https://github.com/<your-username>/oseas26-eae-wrapper-webpage.git
cd oseas26-eae-wrapper-webpage
git remote add upstream https://github.com/EnAccess/oseas26-eae-wrapper-webpage.git

# for each task
git fetch upstream
git switch main
git merge upstream/main
git switch -c feat-your-task-name

# work, commit, then
git push -u origin feat-your-task-name
```

Rules:

- **One issue, one branch, one PR.** Get assigned to the issue before opening the PR.
- **Never commit to `main`**, not even on your fork. Keep it a clean copy of upstream.
- **PR titles use Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`), because PRs are squash-merged and the title becomes the commit message. Commits inside your branch can say anything.
- Keep PRs small. Unrelated changes go in a separate PR.
- Put `closes: #<issue number>` in the PR description, fill in how you tested, and add screenshots (desktop and mobile).
- Have a teammate review before maintainers see it. If a week passes with no response, a polite comment is welcome (at the hackathon, ping on Discord sooner).
- If you need a teammate's unmerged work, branch from their branch and rebase onto `upstream/main` once it merges.

---

## 11. Definition of done

- [ ] A page with a state dropdown and a district dropdown fed by real EAE data
- [ ] A crop dropdown fed by the mock crop analyses
- [ ] Choosing a boundary zooms the map to it
- [ ] Choosing a crop shows suitable areas
- [ ] Panels collapsed and zoom sensible on load (if EAE allows)
- [ ] Works on desktop and a phone-sized window
- [ ] EAE attribution in the footer
- [ ] README explains how to run and configure the page
- [ ] Every PR has a clear title, a test description, screenshots and an AI-use note

## 12. Team habits

- Post short progress updates in the challenge Discord channel.
- Hold a five-minute sync every few hours.
- Keep this guide current: when you learn something, change section 2 or 8.
- Reserve the last two hours for testing the full page together on a laptop and a phone.
