/** Estado informativo inicial. O cálculo das métricas virá nas Etapas 05 e 08. */
export function renderInitialDashboard(documentRoot, vertexCount, iterationLimit) {
  documentRoot.getElementById("vertex-count").textContent = String(vertexCount);
  documentRoot.getElementById("current-iteration").textContent = `0 / ${iterationLimit}`;
  documentRoot.getElementById("best-distance").textContent = "Ainda não calculada";
  documentRoot.getElementById("best-distance").classList.add("is-empty");
  documentRoot.getElementById("iteration-distance").textContent = "—";
  documentRoot.getElementById("average-distance").textContent = "—";
  documentRoot.getElementById("best-route").textContent = "Ainda não calculada";
  documentRoot.getElementById("simulation-state").textContent = "Não iniciada";
}
