/**
 * Etapa 01: prévia geométrica baseada no modelo matemático validado.
 * Feromônios, melhor rota e animações pertencem à Etapa 07.
 */
import { expectedEdgeCount } from "../core/graph.js";
export { expectedEdgeCount } from "../core/graph.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_WIDTH = 840;
const VIEW_HEIGHT = 460;
const PADDING = 66;

function svgElement(name, attributes = {}, text = "") {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  if (text) element.textContent = text;
  return element;
}

function projectCoordinates(vertices) {
  const xs = vertices.map(({ x }) => x);
  const ys = vertices.map(({ y }) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const scale = Math.min(
    (VIEW_WIDTH - PADDING * 2) / Math.max(rangeX, 1),
    (VIEW_HEIGHT - PADDING * 2) / Math.max(rangeY, 1),
  );
  const renderWidth = rangeX * scale;
  const renderHeight = rangeY * scale;
  const left = (VIEW_WIDTH - renderWidth) / 2;
  const top = (VIEW_HEIGHT - renderHeight) / 2;

  return vertices.map(({ id, x, y }) => ({
    id,
    x: left + (x - minX) * scale,
    y: top + (maxY - y) * scale,
  }));
}

export function renderInitialGraphPreview(svg, graph) {
  const { vertices, depotId, edges: graphEdges } = graph;
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    `Prévia estática: grafo completo com ${vertices.length} vértices e ${expectedEdgeCount(vertices.length)} arestas. Depósito: ${depotId}.`,
  );

  if (vertices.length === 0) return;

  const coordinates = projectCoordinates(vertices);
  const coordinatesById = new Map(coordinates.map((point) => [point.id, point]));
  const edges = svgElement("g", { class: "graph-preview-edges" });
  const nodes = svgElement("g", { class: "graph-preview-nodes" });

  for (const edge of graphEdges) {
    const from = coordinatesById.get(edge.fromId);
    const to = coordinatesById.get(edge.toId);
    const line = svgElement("line", {
      x1: from.x, y1: from.y,
      x2: to.x, y2: to.y,
      class: "graph-preview-edge",
      "data-edge": `${edge.fromId}-${edge.toId}`,
      "data-distance": edge.distance,
    });
    line.append(svgElement("title", {},
      `${edge.fromId} ↔ ${edge.toId} · Distância: ${edge.distance.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}`));
    edges.append(line);
  }

  for (const point of coordinates) {
    const isDepot = point.id === depotId;
    const group = svgElement("g", { "data-vertex": point.id });
    if (isDepot) {
      group.append(svgElement("circle", {
        cx: point.x, cy: point.y, r: 31,
        class: "graph-preview-depot-ring",
      }));
    }
    group.append(svgElement("circle", {
      cx: point.x, cy: point.y, r: 22,
      class: isDepot ? "graph-preview-node graph-preview-node--depot" : "graph-preview-node",
    }));
    group.append(svgElement("text", {
      x: point.x, y: point.y + 5,
      "text-anchor": "middle", class: "graph-preview-label",
    }, point.id));
    nodes.append(group);
  }

  svg.append(edges, nodes);
}
