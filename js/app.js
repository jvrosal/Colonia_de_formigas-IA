import {
  DEFAULT_PARAMETERS, INITIAL_DEPOT_ID, INITIAL_VERTICES, PARAMETER_FIELDS,
} from "./core/constants.js";
import { renderInitialVertices, renderInitialParameters } from "./ui/forms.js";
import { renderInitialGraphPreview } from "./ui/graph-view.js";
import { createGraph, expectedEdgeCount, calculateRouteLength } from "./core/graph.js";
import { renderDistanceMatrix } from "./ui/distance-matrix.js";
import { renderInitialDashboard } from "./ui/dashboard.js";
import { renderInitialProbabilityPreview } from "./ui/probability-preview.js";

export function initializeApp(root = document) {
  // Inicializar a partir de um modelo validado impede que dados inválidos cheguem à visualização.
  const graph = createGraph(INITIAL_VERTICES, INITIAL_DEPOT_ID);
  renderInitialVertices(
    root.getElementById("vertices-body"),
    root.getElementById("depot-select"),
    graph.vertices,
    graph.depotId,
  );
  renderInitialParameters(
    root.getElementById("parameter-fields"),
    PARAMETER_FIELDS,
    DEFAULT_PARAMETERS,
  );
  renderInitialGraphPreview(root.getElementById("graph-preview"), graph);
  renderDistanceMatrix(root.getElementById("distance-matrix"), graph);
  renderInitialProbabilityPreview(root.getElementById("probability-preview"), graph, DEFAULT_PARAMETERS);

  const exampleRoute = [...graph.vertices.map((vertex) => vertex.id), graph.depotId];
  const routeDistance = calculateRouteLength(exampleRoute, graph);
  root.getElementById("example-route").textContent = exampleRoute.join(" → ");
  root.getElementById("example-distance").textContent = routeDistance.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  renderInitialDashboard(root, graph.vertices.length, DEFAULT_PARAMETERS.iterations);

  root.getElementById("graph-summary").textContent =
    `${graph.vertices.length} vértices · ${expectedEdgeCount(graph.vertices.length)} arestas`;
  root.getElementById("app-status").textContent = "Grafo e probabilidades preparados";
  root.getElementById("app-status").classList.add("status--ready");
}

try {
  if (typeof document !== "undefined") initializeApp();
} catch (error) {
  const errorBanner = typeof document !== "undefined" ? document.getElementById("initialization-error") : null;
  if (errorBanner) {
    errorBanner.hidden = false;
    errorBanner.textContent = error?.errors?.map((item) => item.message).join(" ") || "Não foi possível carregar a interface. Verifique o console do navegador.";
  }
  console.error("Falha na inicialização da Etapa 02:", error);
}
