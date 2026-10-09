// src/eae-frame.js

/**
 * Updates the EAE iframe source with the selected geography and datasets.
 * 
 * @param {string} geographyId - The ID of the selected geography (country, state, or district).
 * @param {string[]} [datasetNames] - Optional array of dataset names (e.g., crop suitability) to enable.
 */
function updateEaeFrame(geographyId, datasetNames = []) {
  const frame = document.getElementById("f");
  if (!frame) return;

  // Decide what happens when there is no geography: clear or placeholder
  if (!geographyId) {
    if (frame.src !== "") {
      frame.removeAttribute("src");
    }
    return;
  }

  const params = new URLSearchParams({ id: String(geographyId).trim() });
  
  if (datasetNames && datasetNames.length > 0) {
    params.set("inputs", datasetNames.join(",").trim());
  }

  const newSrc = EAE_APP + "?" + params.toString();

  if (frame.src !== newSrc) {
    frame.src = newSrc;
  }
}
