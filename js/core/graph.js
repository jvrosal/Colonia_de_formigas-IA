/**
 * Etapa 01 — matemática do grafo completo não direcionado e das rotas.
 * Índices da matriz seguem exatamente a ordem de graph.vertices.
 */
import { validateVertices, validateDepot, validateRoute } from "./validation.js";

export class GraphValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "GraphValidationError";
    this.errors = errors;
  }
}

export function expectedEdgeCount(vertexCount) {
  if (!Number.isInteger(vertexCount) || vertexCount < 0) {
    throw new RangeError("A contagem de vértices deve ser um inteiro não negativo.");
  }
  return vertexCount < 2 ? 0 : vertexCount * (vertexCount - 1) / 2;
}

export function calculateDistance(vertexA, vertexB) {
  for (const point of [vertexA, vertexB]) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)
        || typeof point.x !== "number" || typeof point.y !== "number") {
      throw new TypeError("Os dois pontos devem possuir coordenadas numéricas finitas.");
    }
  }
  return Math.hypot(vertexA.x - vertexB.x, vertexA.y - vertexB.y);
}

/** Cria matriz de distâncias independente, simétrica e com zero na diagonal. */
export function createDistanceMatrix(vertices) {
  const check = validateVertices(vertices);
  if (!check.valid) {
    throw new GraphValidationError("Não é possível calcular distâncias: vértices inválidos.", check.errors);
  }
  const count = vertices.length;
  const matrix = Array.from({ length: count }, () => Array(count).fill(0));
  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      const distance = calculateDistance(vertices[i], vertices[j]);
      matrix[i][j] = distance;
      matrix[j][i] = distance;
    }
  }
  return matrix;
}

/**
 * O grafo entrega uma fotografia imutável dos dados para proteger cálculos futuros
 * de alterações acidentais da interface. Nenhuma autoaresta é gerada.
 */
export function createGraph(vertices, depotId) {
  const vertexCheck = validateVertices(vertices);
  const depotCheck = validateDepot(vertices, depotId);
  const errors = [...vertexCheck.errors, ...depotCheck.errors];
  if (errors.length) {
    throw new GraphValidationError("Não é possível criar o grafo com os dados fornecidos.", errors);
  }

  const vertexCopies = Object.freeze(vertices.map(({ id, x, y }) => Object.freeze({ id, x, y })));
  const distanceMatrix = Object.freeze(createDistanceMatrix(vertexCopies)
    .map((row) => Object.freeze(row)));
  const edges = [];
  for (let i = 0; i < vertexCopies.length; i += 1) {
    for (let j = i + 1; j < vertexCopies.length; j += 1) {
      edges.push(Object.freeze({
        fromId: vertexCopies[i].id,
        toId: vertexCopies[j].id,
        distance: distanceMatrix[i][j],
      }));
    }
  }
  return Object.freeze({
    vertices: vertexCopies,
    depotId,
    distanceMatrix,
    edges: Object.freeze(edges),
  });
}

/** Consulta uma distância por identificador, independente da posição do vértice. */
export function getDistance(graph, fromId, toId) {
  const i = graph.vertices.findIndex(({ id }) => id === fromId);
  const j = graph.vertices.findIndex(({ id }) => id === toId);
  if (i === -1 || j === -1) {
    throw new RangeError(`Vértice não encontrado: ${i === -1 ? String(fromId) : String(toId)}.`);
  }
  return graph.distanceMatrix[i][j];
}

/** Rejeita rotas inválidas; inclui o segmento de retorno ao depósito. */
export function calculateRouteLength(route, graph) {
  const check = validateRoute(route, graph.vertices, graph.depotId);
  if (!check.valid) {
    throw new GraphValidationError("Não é possível calcular a distância de uma rota inválida.", check.errors);
  }
  let total = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    total += getDistance(graph, route[i], route[i + 1]);
  }
  return total;
}
