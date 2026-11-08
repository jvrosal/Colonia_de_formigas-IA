
import { calculateRouteLength } from "./graph.js";

/**
 * Etapas 02–04:
 * - Pesos e probabilidades
 * - Construção de rotas completas
 * - Evaporação e depósito de feromônios
 */

const ACO_MIN_VERTICES = 4;
const ACO_MAX_VERTICES = 12;

// Cria a matriz inicial de feromônios.
export function createPheromoneMatrix(vertexCount, initialPheromone) {
  if (
    !Number.isInteger(vertexCount) ||
    vertexCount < ACO_MIN_VERTICES ||
    vertexCount > ACO_MAX_VERTICES
  ) {
    throw new RangeError(
      "A quantidade de vértices deve ser um inteiro de 4 a 12."
    );
  }

  if (
    typeof initialPheromone !== "number" ||
    !Number.isFinite(initialPheromone) ||
    initialPheromone < 0.01 ||
    initialPheromone > 100
  ) {
    throw new RangeError(
      "O feromônio inicial deve estar entre 0,01 e 100."
    );
  }

  return Array.from({ length: vertexCount }, (_, i) =>
    Array.from(
      { length: vertexCount },
      (_, j) => i === j ? 0 : initialPheromone
    )
  );
}

// Valida a matriz de feromônios.
export function validatePheromoneMatrix(matrix, vertexCount) {
  if (
    !Array.isArray(matrix) ||
    matrix.length !== vertexCount ||
    matrix.some(
      (row) => !Array.isArray(row) || row.length !== vertexCount
    )
  ) {
    throw new RangeError("Matriz de feromônios inválida.");
  }

  for (let i = 0; i < vertexCount; i++) {
    if (matrix[i][i] !== 0) {
      throw new RangeError(
        "A diagonal da matriz deve conter zero."
      );
    }

    for (let j = i + 1; j < vertexCount; j++) {
      const a = matrix[i][j];
      const b = matrix[j][i];

      if (
        typeof a !== "number" ||
        !Number.isFinite(a) ||
        a < 1e-12 ||
        typeof b !== "number" ||
        !Number.isFinite(b) ||
        b < 1e-12 ||
        a !== b
      ) {
        throw new RangeError(
          "A matriz deve ser positiva e simétrica."
        );
      }
    }
  }

  return true;
}

// Valida os parâmetros alfa e beta.
function validateExponent(value, label) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 5
  ) {
    throw new RangeError(
      `${label} deve estar entre 0 e 5.`
    );
  }
}

// Calcula os pesos dos candidatos disponíveis.
export function calculateTransitionWeights(
  graph,
  pheromoneMatrix,
  currentId,
  visitedIds,
  alpha,
  beta
) {
  if (
    !graph ||
    !Array.isArray(graph.vertices) ||
    !Array.isArray(graph.distanceMatrix)
  ) {
    throw new TypeError("Informe um grafo válido.");
  }

  const vertexCount = graph.vertices.length;

  if (
    vertexCount < ACO_MIN_VERTICES ||
    vertexCount > ACO_MAX_VERTICES
  ) {
    throw new RangeError(
      "O grafo deve possuir de 4 a 12 vértices."
    );
  }

  validatePheromoneMatrix(pheromoneMatrix, vertexCount);
  validateExponent(alpha, "α");
  validateExponent(beta, "β");

  const identifiers = graph.vertices.map(
    ({ id }) => id
  );

  const currentIndex = identifiers.indexOf(currentId);

  if (currentIndex < 0) {
    throw new RangeError(
      "O vértice atual não pertence ao grafo."
    );
  }

  if (
    !Array.isArray(visitedIds) ||
    new Set(visitedIds).size !== visitedIds.length ||
    !visitedIds.includes(currentId) ||
    visitedIds.some((id) => !identifiers.includes(id))
  ) {
    throw new RangeError(
      "A lista de vértices visitados é inválida."
    );
  }

  const visitedSet = new Set(visitedIds);
  const results = [];

  for (let j = 0; j < vertexCount; j++) {
    const id = identifiers[j];

    if (visitedSet.has(id)) continue;

    const distance =
      graph.distanceMatrix[currentIndex]?.[j];

    const pheromone =
      pheromoneMatrix[currentIndex][j];

    if (
      typeof distance !== "number" ||
      !Number.isFinite(distance) ||
      distance <= 0
    ) {
      throw new RangeError(
        `Distância inválida: ${currentId} → ${id}.`
      );
    }

    const weight =
      (pheromone ** alpha) *
      ((1 / distance) ** beta);

    if (!Number.isFinite(weight) || weight <= 0) {
      throw new RangeError("Peso de escolha inválido.");
    }

    results.push({
      id,
      distance,
      pheromone,
      weight
    });
  }

  return results;
}

// Calcula as probabilidades dos candidatos.
export function calculateProbabilities(weightedCandidates) {
  if (
    !Array.isArray(weightedCandidates) ||
    weightedCandidates.length === 0
  ) {
    throw new RangeError(
      "É necessário pelo menos um candidato."
    );
  }

  if (
    new Set(
      weightedCandidates.map((item) => item?.id)
    ).size !== weightedCandidates.length ||
    weightedCandidates.some(
      (item) =>
        !item ||
        typeof item.id !== "string" ||
        typeof item.weight !== "number" ||
        !Number.isFinite(item.weight) ||
        item.weight <= 0
    )
  ) {
    throw new RangeError("Candidatos inválidos.");
  }

  const maxWeight = Math.max(
    ...weightedCandidates.map(({ weight }) => weight)
  );

  const scaledWeights = weightedCandidates.map(
    ({ weight }) => weight / maxWeight
  );

  const totalScaled = scaledWeights.reduce(
    (sum, value) => sum + value,
    0
  );

  if (!Number.isFinite(totalScaled) || totalScaled <= 0) {
    throw new RangeError(
      "Não foi possível normalizar os pesos."
    );
  }

  return weightedCandidates.map((item, index) => ({
    ...item,
    probability: scaledWeights[index] / totalScaled
  }));
}

// Sorteia um candidato proporcionalmente às probabilidades.
export function weightedRandomChoice(
  candidates,
  probabilities,
  rng
) {
  if (
    !Array.isArray(candidates) ||
    candidates.length === 0 ||
    !Array.isArray(probabilities) ||
    candidates.length !== probabilities.length
  ) {
    throw new RangeError(
      "Candidatos e probabilidades inválidos."
    );
  }

  if (
    probabilities.some(
      (p) =>
        typeof p !== "number" ||
        !Number.isFinite(p) ||
        p < 0
    ) ||
    Math.abs(
      probabilities.reduce((sum, p) => sum + p, 0) - 1
    ) > 1e-9
  ) {
    throw new RangeError(
      "As probabilidades devem somar 1."
    );
  }

  if (!rng || typeof rng.next !== "function") {
    throw new TypeError(
      "Informe um gerador pseudoaleatório válido."
    );
  }

  const randomValue = rng.next();

  if (
    typeof randomValue !== "number" ||
    !Number.isFinite(randomValue) ||
    randomValue < 0 ||
    randomValue >= 1
  ) {
    throw new RangeError(
      "O sorteio deve produzir valor entre 0 e 1."
    );
  }

  let cumulative = 0;
  let lastPositiveIndex = -1;

  for (let i = 0; i < candidates.length; i++) {
    if (probabilities[i] === 0) continue;

    cumulative += probabilities[i];
    lastPositiveIndex = i;

    if (randomValue < cumulative) {
      return {
        candidate: candidates[i],
        index: i,
        randomValue
      };
    }
  }

  return {
    candidate: candidates[lastPositiveIndex],
    index: lastPositiveIndex,
    randomValue
  };
}

// Integra pesos, probabilidades e sorteio.
export function previewTransition(
  graph,
  pheromoneMatrix,
  currentId,
  visitedIds,
  alpha,
  beta,
  rng
) {
  const candidates = calculateProbabilities(
    calculateTransitionWeights(
      graph,
      pheromoneMatrix,
      currentId,
      visitedIds,
      alpha,
      beta
    )
  );

  const choice = weightedRandomChoice(
    candidates,
    candidates.map(({ probability }) => probability),
    rng
  );

  return {
    candidates,
    choice
  };
}

/*
 * ETAPA 03 — CONSTRUÇÃO DE ROTAS COMPLETAS
 *
 * A formiga:
 * - Começa no depósito.
 * - Sorteia os próximos vértices.
 * - Não repete vértices de entrega.
 * - Retorna ao depósito.
 * - Calcula a distância total.
 *
 * Não modifica os feromônios.
 */

export function buildAntRoute(
  graph,
  pheromoneMatrix,
  alpha,
  beta,
  rng
) {
  const depotId = graph.depotId;

  const route = [depotId];
  const visited = new Set([depotId]);
  const steps = [];

  let currentId = depotId;

  while (visited.size < graph.vertices.length) {
    const visitedIds = [...visited];

    const { candidates, choice } = previewTransition(
      graph,
      pheromoneMatrix,
      currentId,
      visitedIds,
      alpha,
      beta,
      rng
    );

    const nextId = choice.candidate.id;

    steps.push({
      currentId,
      visitedIds,
      candidates: candidates.map(
        (candidate) => ({ ...candidate })
      ),
      chosenId: nextId,
      randomValue: choice.randomValue
    });

    route.push(nextId);

    visited.add(nextId);

    currentId = nextId;
  }

  // Retorno obrigatório ao depósito.
  route.push(depotId);

  steps.push({
    currentId,
    visitedIds: [...visited],
    candidates: [],
    chosenId: depotId,
    randomValue: null,
    returnToDepot: true
  });

  const length = calculateRouteLength(route, graph);

  return {
    route,
    length,
    steps
  };
}

/*
 * ETAPA 04 — EVAPORAÇÃO E DEPÓSITO
 *
 * Primeiro todas as formigas concluem suas rotas.
 * Depois ocorre a evaporação e o depósito.
 *
 * rho deve ser uma fração:
 * 50% corresponde a 0.5.
 *
 * A matriz original não é modificada.
 */

export function updatePheromones(
  graph,
  pheromoneMatrix,
  antRoutes,
  rho,
  Q
) {
  const vertexCount = graph?.vertices?.length;

  validatePheromoneMatrix(
    pheromoneMatrix,
    vertexCount
  );

  if (
    typeof rho !== "number" ||
    !Number.isFinite(rho) ||
    rho < 0 ||
    rho > 0.9
  ) {
    throw new RangeError(
      "A evaporação deve estar entre 0 e 0,9."
    );
  }

  if (
    typeof Q !== "number" ||
    !Number.isFinite(Q) ||
    Q < 0.01 ||
    Q > 10000
  ) {
    throw new RangeError(
      "Q deve estar entre 0,01 e 10.000."
    );
  }

  if (
    !Array.isArray(antRoutes) ||
    antRoutes.length < 1 ||
    antRoutes.length > 100
  ) {
    throw new RangeError(
      "Informe as rotas de 1 a 100 formigas."
    );
  }

  const indexById = new Map(
    graph.vertices.map(
      ({ id }, index) => [id, index]
    )
  );

  const deposits = Array.from(
    { length: vertexCount },
    () => Array(vertexCount).fill(0)
  );

  // Soma os depósitos de todas as formigas.
  for (const ant of antRoutes) {
    const route = Array.isArray(ant)
      ? ant
      : ant?.route;

    const length = calculateRouteLength(
      route,
      graph
    );

    const contribution = Q / length;

    const usedEdges = new Set();

    for (
      let position = 0;
      position < route.length - 1;
      position++
    ) {
      const from = indexById.get(
        route[position]
      );

      const to = indexById.get(
        route[position + 1]
      );

      const i = Math.min(from, to);
      const j = Math.max(from, to);

      const key = `${i}:${j}`;

      if (usedEdges.has(key)) continue;

      usedEdges.add(key);

      deposits[i][j] += contribution;
      deposits[j][i] += contribution;
    }
  }

  // Nova matriz de feromônios.
  const matrix = Array.from(
    { length: vertexCount },
    () => Array(vertexCount).fill(0)
  );

  const edgeLogs = [];

  for (let i = 0; i < vertexCount; i++) {
    for (let j = i + 1; j < vertexCount; j++) {
      const previous = pheromoneMatrix[i][j];

      const afterEvaporation =
        (1 - rho) * previous;

      const totalDeposit = deposits[i][j];

      const final = Math.max(
        1e-12,
        afterEvaporation + totalDeposit
      );

      // Mantém a matriz simétrica.
      matrix[i][j] = final;
      matrix[j][i] = final;

      edgeLogs.push({
        fromId: graph.vertices[i].id,
        toId: graph.vertices[j].id,
        previous,
        afterEvaporation,
        totalDeposit,
        final
      });
    }
  }

  return {
    matrix,
    edgeLogs
  };
}
