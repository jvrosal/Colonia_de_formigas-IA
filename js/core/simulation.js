
import {
  buildAntRoute,
  createPheromoneMatrix,
  updatePheromones
} from "./ant-system.js";

import { createSeededRandom } from "./random.js";

function validateParameters(params) {
  if (!params || typeof params !== "object") {
    throw new TypeError("Informe os parâmetros da simulação.");
  }

  const integerFields = [
    ["ants", 1, 100],
    ["iterations", 1, 200]
  ];

  for (const [key, min, max] of integerFields) {
    if (
      !Number.isInteger(params[key]) ||
      params[key] < min ||
      params[key] > max
    ) {
      throw new RangeError(
        `${key} deve ser um inteiro entre ${min} e ${max}.`
      );
    }
  }

  const numberFields = [
    ["alpha", 0, 5],
    ["beta", 0, 5],
    ["evaporationPercent", 0, 90],
    ["initialPheromone", 0.01, 100],
    ["depositConstant", 0.01, 10000]
  ];

  for (const [key, min, max] of numberFields) {
    if (
      typeof params[key] !== "number" ||
      !Number.isFinite(params[key]) ||
      params[key] < min ||
      params[key] > max
    ) {
      throw new RangeError(
        `${key} deve estar entre ${min} e ${max}.`
      );
    }
  }

  if (!Number.isSafeInteger(params.seed)) {
    throw new RangeError(
      "A semente deve ser um inteiro seguro."
    );
  }
}

// Controla a execução sem depender da interface.
export function createSimulation(graph, parameters) {
  if (
    !graph ||
    !Array.isArray(graph.vertices) ||
    !graph.vertices.some((v) => v.id === graph.depotId)
  ) {
    throw new TypeError(
      "Informe um grafo válido com depósito."
    );
  }

  const config = { ...parameters };
  validateParameters(config);

  const rng = createSeededRandom(config.seed);

  const initialMatrix = () =>
    createPheromoneMatrix(
      graph.vertices.length,
      config.initialPheromone
    );

  let state;

  // Reinicia a simulação e o gerador aleatório.
  function reset() {
    rng.reset();

    state = {
      iteration: 0,
      pheromoneMatrix: initialMatrix(),
      bestRoute: null,
      bestLength: null,
      history: []
    };

    return getState();
  }

  // Retorna uma cópia do estado atual.
  function getState() {
    return structuredClone({
      ...state,
      finished: state.iteration >= config.iterations
    });
  }

  function getSummary() {
    return {
      iteration: state.iteration,
      finished: state.iteration >= config.iterations,
      pheromoneMatrix: state.pheromoneMatrix.map(row => [...row]),
      bestRoute: state.bestRoute ? [...state.bestRoute] : null,
      bestLength: state.bestLength,
      historyLength: state.history.length
    };
  }

  function getHistorySince(startIndex = 0) {
    return structuredClone(state.history.slice(startIndex));
  }

  function advance() {
    if (state.iteration >= config.iterations) {
      return;
    }

    const routes = [];

    // Todas as formigas utilizam os mesmos feromônios.
    for (let i = 0; i < config.ants; i++) {
      const ant = buildAntRoute(
        graph,
        state.pheromoneMatrix,
        config.alpha,
        config.beta,
        rng
      );

      routes.push(ant);
    }

    // Melhor formiga da iteração.
    const bestAnt = routes.reduce(
      (best, ant) =>
        ant.length < best.length ? ant : best
    );

    // Distância média das formigas.
    const totalLength = routes.reduce(
      (sum, ant) => sum + ant.length,
      0
    );

    const meanLength = totalLength / routes.length;

    // Atualiza feromônios após todas as rotas.
    const update = updatePheromones(
      graph,
      state.pheromoneMatrix,
      routes,
      config.evaporationPercent / 100,
      config.depositConstant
    );

    // Melhor solução encontrada até agora.
    if (
      state.bestLength === null ||
      bestAnt.length < state.bestLength
    ) {
      state.bestLength = bestAnt.length;
      state.bestRoute = [...bestAnt.route];
    }

    state.iteration += 1;
    state.pheromoneMatrix = update.matrix;

    // Histórico para exibição futura na interface.
    state.history.push({
      iteration: state.iteration,
      iterationBestRoute: [...bestAnt.route],
      iterationBestLength: bestAnt.length,
      meanLength,
      bestRoute: [...state.bestRoute],
      bestLength: state.bestLength,
      antRoutes: routes,
      edgeLogs: update.edgeLogs
    });
  }

  // Executa uma iteração e devolve uma cópia do estado completo.
  function step() {
    advance();
    return getState();
  }

  // Executa uma iteração e devolve apenas o resumo (usado pela interface).
  function stepSummary() {
    advance();
    return getSummary();
  }

  // Executa todas as iterações restantes.
  function runAll() {
    while (state.iteration < config.iterations) {
      advance();
    }

    return getState();
  }

  reset();

  return Object.freeze({
    step,
    stepSummary,
    runAll,
    reset,
    getState,
    getSummary,
    getHistorySince
  });
}
