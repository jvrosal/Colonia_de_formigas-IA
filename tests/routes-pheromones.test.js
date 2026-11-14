
import test from "node:test";
import assert from "node:assert/strict";

import { createGraph } from "../js/core/graph.js";

import {
  createSeededRandom
} from "../js/core/random.js";

import {
  createPheromoneMatrix,
  buildAntRoute,
  updatePheromones
} from "../js/core/ant-system.js";

// Instância de referência do professor.
const graph = createGraph(
  [
    { id: "A", x: 0, y: 0 },
    { id: "B", x: 3, y: 0 },
    { id: "C", x: 3, y: 4 },
    { id: "D", x: 0, y: 4 }
  ],
  "A"
);

const tau = () => createPheromoneMatrix(4, 1);

const route = ["A", "B", "C", "D", "A"];

const close = (a, b) => {
  assert.ok(
    Math.abs(a - b) <= 1e-6,
    `${a} !== ${b}`
  );
};

//Construção de rota completa.
test("Rota completa válida", () => {
  const ant = buildAntRoute(
    graph,
    tau(),
    1,
    2,
    createSeededRandom(42)
  );

  assert.equal(ant.route.length, 5);
  assert.equal(ant.route[0], "A");
  assert.equal(ant.route.at(-1), "A");

  assert.equal(
    new Set(ant.route.slice(0, -1)).size,
    4
  );

  assert.ok(
    [14, 16, 18].includes(ant.length)
  );

  assert.equal(ant.steps.length, 4);

  assert.equal(
    ant.steps.at(-1).returnToDepot,
    true
  );
});

//Reprodutibilidade.
test("Mesma semente, mesma rota", () => {
  const matrix = tau();

  const a = buildAntRoute(
    graph,
    matrix,
    1,
    2,
    createSeededRandom(42)
  );

  const b = buildAntRoute(
    graph,
    matrix,
    1,
    2,
    createSeededRandom(42)
  );

  assert.deepEqual(a, b);

  // A construção não altera os feromônios.
  assert.deepEqual(matrix, tau());
});

//Primeira atualização.
test("Evaporação e depósito", () => {
  const result = updatePheromones(
    graph,
    tau(),
    [route],
    0.5,
    14
  );

  for (
    const [i, j] of [
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 3]
    ]
  ) {
    close(result.matrix[i][j], 1.5);
  }

  for (
    const [i, j] of [
      [0, 2],
      [1, 3]
    ]
  ) {
    close(result.matrix[i][j], 0.5);
  }

  const ab = result.edgeLogs.find(
    (edge) =>
      edge.fromId === "A" &&
      edge.toId === "B"
  );

  assert.deepEqual(ab, {
    fromId: "A",
    toId: "B",
    previous: 1,
    afterEvaporation: 0.5,
    totalDeposit: 1,
    final: 1.5
  });
});

//Segunda iteração.
test("Segunda iteração", () => {
  const first = updatePheromones(
    graph,
    tau(),
    [route],
    0.5,
    14
  );

  const second = updatePheromones(
    graph,
    first.matrix,
    [route],
    0.5,
    14
  );

  close(second.matrix[0][1], 1.75);
  close(second.matrix[0][2], 0.25);
});

//Duas formigas.
test("Depósito de duas formigas", () => {
  const original = tau();

  const result = updatePheromones(
    graph,
    original,
    [route, route],
    0.5,
    14
  );

  close(result.matrix[0][1], 2.5);
  close(result.matrix[0][2], 0.5);

  assert.deepEqual(original, tau());
});

//Evaporação zero e simetria.
test("Evaporação zero", () => {
  const result = updatePheromones(
    graph,
    tau(),
    [route],
    0,
    14
  );

  close(result.matrix[0][1], 2);
  close(result.matrix[0][2], 1);

  for (let i = 0; i < 4; i++) {
    assert.equal(result.matrix[i][i], 0);

    for (let j = 0; j < 4; j++) {
      assert.equal(
        result.matrix[i][j],
        result.matrix[j][i]
      );
    }
  }
});

//Entradas inválidas.
test("Rejeita entradas inválidas", () => {
  assert.throws(() =>
    updatePheromones(
      graph,
      tau(),
      [["A", "B", "C", "A"]],
      0.5,
      14
    )
  );

  assert.throws(() =>
    updatePheromones(
      graph,
      tau(),
      [route],
      50,
      14
    )
  );

  assert.throws(() =>
    updatePheromones(
      graph,
      tau(),
      [route],
      0.5,
      0
    )
  );
});
