
import { expectedEdgeCount } from "../core/graph.js";

export { expectedEdgeCount } from "../core/graph.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_WIDTH = 840;
const VIEW_HEIGHT = 460;
const PADDING = 66;
const MIN_EDGE_WIDTH = 1.5;
const MAX_EDGE_WIDTH = 12;
const NODE_RADIUS = 17;

function svgElement(name, attributes = {}, text = "") {
  const element = document.createElementNS(SVG_NS, name);

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }

  if (text) {
    element.textContent = text;
  }

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
    (VIEW_HEIGHT - PADDING * 2) / Math.max(rangeY, 1)
  );

  const renderWidth = rangeX * scale;
  const renderHeight = rangeY * scale;

  const left = (VIEW_WIDTH - renderWidth) / 2;
  const top = (VIEW_HEIGHT - renderHeight) / 2;

  return vertices.map(({ id, x, y }) => ({
    id,
    x: left + (x - minX) * scale,
    y: top + (maxY - y) * scale
  }));
}

export function renderInitialGraphPreview(
  svg,
  graph,
  pheromones = null,
  bestRoute = null
) {
  const {
    vertices,
    depotId,
    edges: graphEdges
  } = graph;

  svg.replaceChildren();
  svg.setAttribute(
    "viewBox",
    `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`
  );
  svg.setAttribute("role", "img");

  svg.setAttribute(
    "aria-label",
    `Grafo completo com ${vertices.length} vértices e ${expectedEdgeCount(vertices.length)} arestas. Depósito: ${depotId}.`
  );

  if (vertices.length === 0) return;

  const coordinates = projectCoordinates(vertices);

  const coordinatesById = new Map(
    coordinates.map(point => [point.id, point])
  );

  const edges = svgElement("g", {
    class: "graph-preview-edges"
  });

  const nodes = svgElement("g", {
    class: "graph-preview-nodes"
  });

  const indices = new Map(
    vertices.map((vertex, index) => [
      vertex.id,
      index
    ])
  );

  const bestEdges = new Set();

  if (bestRoute) {
    for (let i = 0; i < bestRoute.length - 1; i++) {
      bestEdges.add(
        [bestRoute[i], bestRoute[i + 1]]
          .sort()
          .join("|")
      );
    }
  }

  let maxPheromone = 0;

  if (pheromones) {
    for (const edge of graphEdges) {
      maxPheromone = Math.max(
        maxPheromone,
        pheromones[indices.get(edge.fromId)][indices.get(edge.toId)]
      );
    }
  }

  const bestLayer = svgElement("g", {
    class: "graph-preview-best"
  });

  const hitLayer = svgElement("g", {
    class: "graph-preview-hits"
  });

  for (const edge of graphEdges) {
    const from = coordinatesById.get(edge.fromId);
    const to = coordinatesById.get(edge.toId);
    const endpoints = { x1: from.x, y1: from.y, x2: to.x, y2: to.y };

    const line = svgElement("line", {
      ...endpoints,
      class: "graph-preview-edge",
      "data-edge": `${edge.fromId}-${edge.toId}`,
      "data-distance": edge.distance
    });

    const pheromone = pheromones
      ? pheromones[
          indices.get(edge.fromId)
        ][
          indices.get(edge.toId)
        ]
      : undefined;

    if (pheromone !== undefined) {
      const ratio = maxPheromone > 0
        ? pheromone / maxPheromone
        : 0;

      const thickness =
        MIN_EDGE_WIDTH +
        (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH) * ratio;

      line.style.strokeWidth = `${thickness.toFixed(2)}px`;
      line.style.strokeOpacity = (0.25 + 0.75 * ratio).toFixed(2);
      line.dataset.pheromone = String(pheromone);
    }

    edges.append(line);

    const edgeKey = [edge.fromId, edge.toId].sort().join("|");

    if (bestEdges.has(edgeKey)) {
      bestLayer.append(
        svgElement("line", {
          ...endpoints,
          class: "graph-preview-best-edge"
        })
      );
    }

    const distanceText = edge.distance.toLocaleString(
      "pt-BR",
      { maximumFractionDigits: 6 }
    );

    let tooltip =
      `Aresta ${edge.fromId}–${edge.toId}\nDistância: ${distanceText}`;

    if (pheromone !== undefined) {
      tooltip += `\nFeromônio: ${pheromone.toLocaleString(
        "pt-BR",
        { maximumFractionDigits: 8 }
      )}`;
    }

    const hit = svgElement("line", {
      ...endpoints,
      class: "graph-preview-hit"
    });

    hit.append(svgElement("title", {}, tooltip));
    hitLayer.append(hit);
  }

  for (const point of coordinates) {
    const isDepot = point.id === depotId;

    const group = svgElement("g", {
      "data-vertex": point.id,
      class: isDepot
        ? "graph-preview-vertex graph-preview-vertex--depot"
        : "graph-preview-vertex"
    });

    // Depósito em quadrado e entregas em círculo:
    // o tipo é reconhecível pela forma, não apenas pela cor.
    group.append(
      isDepot
        ? svgElement("rect", {
            x: point.x - NODE_RADIUS,
            y: point.y - NODE_RADIUS,
            width: NODE_RADIUS * 2,
            height: NODE_RADIUS * 2,
            class: "graph-preview-node graph-preview-node--depot"
          })
        : svgElement("circle", {
            cx: point.x,
            cy: point.y,
            r: NODE_RADIUS,
            class: "graph-preview-node"
          })
    );

    group.append(
      svgElement(
        "text",
        {
          x: point.x,
          y: point.y + 5,
          "text-anchor": "middle",
          class: "graph-preview-label"
        },
        point.id
      )
    );

    group.append(
      svgElement(
        "title",
        {},
        isDepot ? `Depósito ${point.id}` : `Entrega ${point.id}`
      )
    );

    nodes.append(group);
  }

  svg.append(edges, bestLayer, hitLayer, nodes);

  return { maxPheromone };
}
