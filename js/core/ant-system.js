/**
 * Etapa 02 — matriz inicial de feromônios, pesos, probabilidades e sorteio.
 * Ainda NÃO constroi rotas, executa iterações ou atualiza feromônios.
 */

const ACO_MIN_VERTICES = 4;
const ACO_MAX_VERTICES = 12;

/** Feromônios iguais em todas as arestas; diagonal sempre zero. */
export function createPheromoneMatrix(vertexCount, initialPheromone) {
  if (!Number.isInteger(vertexCount) || vertexCount < ACO_MIN_VERTICES || vertexCount > ACO_MAX_VERTICES) {
    throw new RangeError(`A quantidade de vértices deve ser um inteiro de ${ACO_MIN_VERTICES} a ${ACO_MAX_VERTICES}.`);
  }
  if (typeof initialPheromone !== "number" || !Number.isFinite(initialPheromone)
      || initialPheromone < 0.01 || initialPheromone > 100) {
    throw new RangeError("O feromônio inicial (τ₀) deve ser um número entre 0,01 e 100.");
  }
  return Array.from({ length: vertexCount }, (_, i) =>
    Array.from({ length: vertexCount }, (_, j) => i === j ? 0 : initialPheromone));
}

/** Verifica se uma matriz é válida para decisões da formiga. */
export function validatePheromoneMatrix(matrix, vertexCount) {
  if (!Array.isArray(matrix) || matrix.length !== vertexCount ||
      matrix.some((row) => !Array.isArray(row) || row.length !== vertexCount)) {
    throw new RangeError("A matriz de feromônios deve ser quadrada e corresponder aos vértices.");
  }
  for (let i = 0; i < vertexCount; i += 1) {
    if (matrix[i][i] !== 0) {
      throw new RangeError("Não deve existir feromônio na diagonal da matriz.");
    }
    for (let j = i + 1; j < vertexCount; j += 1) {
      const a = matrix[i][j];
      const b = matrix[j][i];
      if (typeof a !== "number" || !Number.isFinite(a) || a < 1e-12 ||
          typeof b !== "number" || !Number.isFinite(b) || b < 1e-12 || a !== b) {
        throw new RangeError("A matriz de feromônios deve ser positiva e simétrica fora da diagonal.");
      }
    }
  }
  return true;
}

function validateExponent(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 5) {
    throw new RangeError(`${label} deve ser um número entre 0 e 5.`);
  }
}

/**
 * Pesos w(i,j) = τ(i,j)^α × (1/d(i,j))^β.
 * Recebe a rota parcialmente visitada como array de IDs, incluindo o atual.
 * Mantém a ordem de graph.vertices, essencial à reprodutibilidade.
 */
export function calculateTransitionWeights(graph, pheromoneMatrix, currentId, visitedIds, alpha, beta) {
  if (!graph || !Array.isArray(graph.vertices) || !Array.isArray(graph.distanceMatrix)) {
    throw new TypeError("Informe um grafo válido.");
  }
  const vertexCount = graph.vertices.length;
  if (vertexCount < ACO_MIN_VERTICES || vertexCount > ACO_MAX_VERTICES) {
    throw new RangeError("O grafo deve possuir de 4 a 12 vértices.");
  }
  validatePheromoneMatrix(pheromoneMatrix, vertexCount);
  validateExponent(alpha, "α");
  validateExponent(beta, "β");

  const identifiers = graph.vertices.map(({ id }) => id);
  const currentIndex = identifiers.indexOf(currentId);
  if (currentIndex < 0) throw new RangeError("O vértice atual não pertence ao grafo.");
  if (!Array.isArray(visitedIds) || new Set(visitedIds).size !== visitedIds.length ||
      !visitedIds.includes(currentId) || visitedIds.some((id) => !identifiers.includes(id))) {
    throw new RangeError("Os vértices visitados devem ser únicos, válidos e incluir o vértice atual.");
  }
  const visitedSet = new Set(visitedIds);
  const results = [];
  for (let j = 0; j < vertexCount; j += 1) {
    const id = identifiers[j];
    if (visitedSet.has(id)) continue;

    const distance = graph.distanceMatrix[currentIndex]?.[j];
    const pheromone = pheromoneMatrix[currentIndex][j];
    if (typeof distance !== "number" || !Number.isFinite(distance) || distance <= 0) {
      throw new RangeError(`Distância inválida na aresta ${currentId} → ${id}.`);
    }
    const weight = (pheromone ** alpha) * ((1 / distance) ** beta);
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new RangeError(`Peso numérico inválido na aresta ${currentId} → ${id}.`);
    }
    results.push({ id, distance, pheromone, weight });
  }
  return results;
}

/** Normalização probabilística exclusivamente entre os candidatos permitidos. */
export function calculateProbabilities(weightedCandidates) {
  if (!Array.isArray(weightedCandidates) || weightedCandidates.length === 0) {
    throw new RangeError("É necessário pelo menos um candidato para calcular probabilidades.");
  }
  if (new Set(weightedCandidates.map((item) => item?.id)).size !== weightedCandidates.length ||
      weightedCandidates.some((item) => !item || typeof item.id !== "string" ||
        typeof item.weight !== "number" || !Number.isFinite(item.weight) || item.weight <= 0)) {
    throw new RangeError("Os candidatos devem possuir IDs únicos e pesos positivos e finitos.");
  }
  // Dividir antes pelo maior peso evita transbordamento da soma, sem arredondar.
  const maxWeight = Math.max(...weightedCandidates.map(({ weight }) => weight));
  const scaledWeights = weightedCandidates.map(({ weight }) => weight / maxWeight);
  const totalScaled = scaledWeights.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(totalScaled) || totalScaled <= 0) {
    throw new RangeError("Não foi possível normalizar os pesos.");
  }
  return weightedCandidates.map((item, index) => ({
    ...item,
    probability: scaledWeights[index] / totalScaled,
  }));
}

/**
 * Sorteio por distribuição cumulativa (NÃO é argmax).
 * Retorna o candidato, seu índice e o número sorteado para permitir auditoria.
 * rng é a instância produzida por createSeededRandom.
 */
export function weightedRandomChoice(candidates, probabilities, rng) {
  if (!Array.isArray(candidates) || candidates.length === 0 ||
      !Array.isArray(probabilities) || candidates.length !== probabilities.length) {
    throw new RangeError("Candidatos e probabilidades devem ser arrays não vazios do mesmo tamanho.");
  }
  if (probabilities.some((p) => typeof p !== "number" || !Number.isFinite(p) || p < 0) ||
      Math.abs(probabilities.reduce((sum, p) => sum + p, 0) - 1) > 1e-9) {
    throw new RangeError("Probabilidades devem ser não negativas e somar 1.");
  }
  if (!rng || typeof rng.next !== "function") {
    throw new TypeError("Forneça um gerador pseudoaleatório com método next().");
  }
  const randomValue = rng.next();
  if (typeof randomValue !== "number" || !Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new RangeError("O gerador deve produzir números no intervalo [0, 1).");
  }
  let cumulative = 0;
  let lastPositiveIndex = -1;
  for (let i = 0; i < candidates.length; i += 1) {
    if (probabilities[i] === 0) continue;
    cumulative += probabilities[i];
    lastPositiveIndex = i;
    if (randomValue < cumulative) {
      return { candidate: candidates[i], index: i, randomValue };
    }
  }
  // Fallback apenas para pequenas imprecisões de ponto flutuante na soma.
  return { candidate: candidates[lastPositiveIndex], index: lastPositiveIndex, randomValue };
}

/** Integra os cálculos de uma única decisão, sem construir uma rota. */
export function previewTransition(graph, pheromoneMatrix, currentId, visitedIds, alpha, beta, rng) {
  const candidates = calculateProbabilities(calculateTransitionWeights(
    graph, pheromoneMatrix, currentId, visitedIds, alpha, beta,
  ));
  const choice = weightedRandomChoice(
    candidates, candidates.map(({ probability }) => probability), rng,
  );
  return { candidates, choice };
}
