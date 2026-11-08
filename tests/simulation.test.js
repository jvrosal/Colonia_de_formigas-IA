
import test from "node:test";
import assert from "node:assert/strict";

import { createGraph } from "../js/core/graph.js";
import { createSimulation } from "../js/core/simulation.js";
import {
  buildAntRoute,
  createPheromoneMatrix
} from "../js/core/ant-system.js";
import { createSeededRandom } from "../js/core/random.js";

const graph = createGraph([
  { id: "A", x: 0, y: 0 },
  { id: "B", x: 3, y: 0 },
  { id: "C", x: 3, y: 4 },
  { id: "D", x: 0, y: 4 }
], "A");

const params = {
  ants: 10,
  iterations: 30,
  alpha: 1,
  beta: 2,
  evaporationPercent: 50,
  initialPheromone: 1,
  depositConstant: 14,
  seed: 42
};

test("executa 30 iterações", () => {
  const result = createSimulation(graph, params).runAll();

  assert.equal(result.iteration, 30);
  assert.equal(result.history.length, 30);
  assert.equal(result.finished, true);
  assert.ok([14, 16, 18].includes(result.bestLength));
  assert.equal(result.bestRoute[0], "A");
  assert.equal(result.bestRoute.at(-1), "A");
  assert.equal(result.history[0].antRoutes.length, 10);
  assert.equal(result.history[0].edgeLogs.length, 6);
});

test("inicia sem rota calculada", () => {
  const state = createSimulation(graph, params).getState();

  assert.equal(state.iteration, 0);
  assert.equal(state.bestLength, null);
  assert.equal(state.bestRoute, null);
  assert.equal(state.history.length, 0);
  assert.equal(state.pheromoneMatrix[0][1], 1);
});

test("repete resultados com a mesma semente", () => {
  const a = createSimulation(graph, params).runAll();
  const b = createSimulation(graph, params).runAll();

  assert.deepEqual(a, b);
});

test("avançar e executar produzem o mesmo resultado", () => {
  const simulation = createSimulation(graph, params);

  simulation.step();
  simulation.step();

  assert.equal(simulation.getState().iteration, 2);
  assert.equal(simulation.getState().history.length, 2);

  const continued = simulation.runAll();
  const complete = createSimulation(graph, params).runAll();

  assert.deepEqual(continued, complete);
});

test("melhor distância acumulada nunca aumenta", () => {
  const { history } = createSimulation(graph, params).runAll();

  for (let i = 1; i < history.length; i++) {
    assert.ok(
      history[i].bestLength <= history[i - 1].bestLength
    );
  }
});

test("formigas usam os feromônios da mesma iteração", () => {
  const config = { ...params, iterations: 1, ants: 3 };

  const state = createSimulation(graph, config).step();
  const rng = createSeededRandom(42);
  const initial = createPheromoneMatrix(4, 1);

  const expected = Array.from({ length: 3 }, () =>
    buildAntRoute(graph, initial, 1, 2, rng)
  );

  assert.deepEqual(state.history[0].antRoutes, expected);

  const mean = expected.reduce(
    (sum, ant) => sum + ant.length,
    0
  ) / 3;

  assert.equal(state.history[0].meanLength, mean);
});

test("reiniciar restaura o estado inicial", () => {
  const simulation = createSimulation(graph, params);

  const first = simulation.step();
  simulation.step();

  simulation.reset();

  assert.equal(simulation.getState().iteration, 0);
  assert.equal(simulation.getState().bestLength, null);
  assert.deepEqual(simulation.step(), first);
});

test("não ultrapassa o limite de iterações", () => {
  const simulation = createSimulation(graph, {
    ...params,
    iterations: 1
  });

  const completed = simulation.step();

  assert.deepEqual(simulation.step(), completed);
});

test("consultar estado não altera a simulação", () => {
  const simulation = createSimulation(graph, {
    ...params,
    iterations: 2
  });

  const snapshot = simulation.step();

  snapshot.pheromoneMatrix[0][1] = 999;
  snapshot.history[0].antRoutes[0].route[0] = "X";

  assert.notEqual(
    simulation.getState().pheromoneMatrix[0][1],
    999
  );

  assert.equal(
    simulation.getState().history[0].antRoutes[0].route[0],
    "A"
  );
});

test("rejeita parâmetros inválidos", () => {
  const invalid = [
    { ants: 0 },
    { ants: 101 },
    { ants: 1.2 },
    { iterations: 201 },
    { alpha: -1 },
    { beta: 6 },
    { evaporationPercent: 91 },
    { initialPheromone: 0 },
    { depositConstant: 10001 },
    { seed: 1.5 }
  ];

  for (const bad of invalid) {
    assert.throws(() =>
      createSimulation(graph, { ...params, ...bad })
    );
  }
});

test("compara beta zero e dois em cinco sementes", () => {
  for (const beta of [0, 2]) {
    const lengths = [1, 2, 3, 4, 5].map(seed =>
      createSimulation(graph, {
        ...params,
        beta,
        seed
      }).runAll().bestLength
    );

    assert.equal(lengths.length, 5);
    assert.ok(
      lengths.every(length => [14, 16, 18].includes(length))
    );

    const mean = lengths.reduce(
      (sum, length) => sum + length,
      0
    ) / lengths.length;

    assert.ok(Number.isFinite(mean));
  }
});
