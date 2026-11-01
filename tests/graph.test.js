import test from "node:test";
import assert from "node:assert/strict";
import {
  GraphValidationError, calculateDistance, createDistanceMatrix,
  createGraph, expectedEdgeCount, getDistance, calculateRouteLength,
} from "../js/core/graph.js";
import { INITIAL_VERTICES, INITIAL_DEPOT_ID } from "../js/core/constants.js";

const rectangle = [
  { id: "A", x: 0, y: 0 },
  { id: "B", x: 3, y: 0 },
  { id: "C", x: 3, y: 4 },
  { id: "D", x: 0, y: 4 },
];

function close(actual, expected, msg = "") {
  assert.ok(Math.abs(actual - expected) <= 0.000001, `${msg}: esperado ${expected}, calculado ${actual}`);
}

test("distância entre vértices A/B/C/D conforme o enunciado (seção 6.1)", () => {
  const graph = createGraph(rectangle, "A");
  const expected = [
    [0, 3, 5, 4],
    [3, 0, 4, 5],
    [5, 4, 0, 3],
    [4, 5, 3, 0],
  ];
  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      close(graph.distanceMatrix[i][j], expected[i][j]);
      close(graph.distanceMatrix[i][j], graph.distanceMatrix[j][i], "simetria");
    }
  }
  assert.equal(graph.edges.length, 6);
  assert.equal(graph.edges.every((edge) => edge.fromId !== edge.toId), true);
});

test("testes das seis rotas possíveis e comprimentos exatos do enunciado (seção 6.1)", () => {
  const graph = createGraph(rectangle, "A");
  const routes = [
    [["A", "B", "C", "D", "A"], 14],
    [["A", "B", "D", "C", "A"], 16],
    [["A", "C", "B", "D", "A"], 18],
    [["A", "C", "D", "B", "A"], 16],
    [["A", "D", "B", "C", "A"], 18],
    [["A", "D", "C", "B", "A"], 14],
  ];
  for (const [route, total] of routes) close(calculateRouteLength(route, graph), total, route.join("→"));
  assert.equal(Math.min(...routes.map(([route]) => calculateRouteLength(route, graph))), 14);
});

test("diagonal zero, simetria, positividade e contagem combinatória para 4, 5 e 12", () => {
  for (const n of [4, 5, 12]) {
    const vertices = Array.from({ length: n }, (_, i) => ({ id: String(i), x: i * 5, y: i * 7 }));
    const graph = createGraph(vertices, "0");
    assert.equal(graph.edges.length, expectedEdgeCount(n));
    for (let i = 0; i < n; i += 1) {
      assert.equal(graph.distanceMatrix[i][i], 0);
      for (let j = i + 1; j < n; j += 1) {
        assert.ok(graph.distanceMatrix[i][j] > 0);
        assert.equal(graph.distanceMatrix[i][j], graph.distanceMatrix[j][i]);
      }
    }
  }
});

test("distância euclidiana usa precisão interna completa", () => {
  close(calculateDistance({ x: 0, y: 0 }, { x: 0.01, y: 0.01 }), Math.sqrt(2) / 100);
  const vertices = [
    { id: "A", x: 0, y: 0 }, { id: "B", x: 0.01, y: 0.01 },
    { id: "C", x: 1, y: 0 }, { id: "D", x: 0, y: 1 },
  ];
  const matrix = createDistanceMatrix(vertices);
  close(matrix[0][1], Math.sqrt(2) / 100);
  assert.ok(matrix[0][1] !== 0.0141, "não arredondar durante o cálculo");
});

test("distância do próprio vértice é zero e consulta por IDs independe de índices", () => {
  const graph = createGraph(rectangle, "D");
  assert.equal(getDistance(graph, "C", "C"), 0);
  assert.equal(getDistance(graph, "B", "D"), 5);
  assert.equal(calculateRouteLength(["D", "C", "B", "A", "D"], graph), 14);
  assert.throws(() => getDistance(graph, "D", "Z"), RangeError);
});

test("cálculo de comprimento inclui obrigatoriamente o retorno ao depósito", () => {
  const graph = createGraph(rectangle, "A");
  assert.equal(getDistance(graph, "D", "A"), 4);
  assert.equal(calculateRouteLength(["A", "B", "C", "D", "A"], graph), 3 + 4 + 3 + 4);
  assert.throws(() => calculateRouteLength(["A", "B", "C", "D"], graph), GraphValidationError);
});

test("rotas com vértices repetidos, ausentes ou desconhecidos são rejeitadas", () => {
  const graph = createGraph(rectangle, "A");
  for (const route of [
    ["A", "B", "C", "A"],
    ["A", "B", "B", "D", "A"],
    ["B", "C", "D", "A", "B"],
    ["A", "B", "X", "D", "A"],
  ]) {
    assert.throws(() => calculateRouteLength(route, graph), GraphValidationError);
  }
});

test("vértices inválidos e depósito inexistente impedem criação do grafo", () => {
  assert.throws(() => createGraph(rectangle.slice(0, 3), "A"), GraphValidationError);
  assert.throws(() => createGraph(rectangle, "Z"), GraphValidationError);
  assert.throws(() => createDistanceMatrix([rectangle[0], rectangle[0], rectangle[2], rectangle[3]]), GraphValidationError);
  assert.throws(() => calculateDistance({ x: NaN, y: 0 }, rectangle[0]), TypeError);
});

test("grafo não altera a fonte original e resultados são somente leitura", () => {
  const vertices = rectangle.map((vertex) => ({ ...vertex }));
  const graph = createGraph(vertices, "A");
  vertices[0].x = 999;
  assert.equal(graph.vertices[0].x, 0);
  assert.equal(graph.distanceMatrix[0][1], 3);
  assert.ok(Object.isFrozen(graph.vertices));
  assert.ok(Object.isFrozen(graph.vertices[0]));
  assert.ok(Object.isFrozen(graph.distanceMatrix[0]));
  assert.ok(Object.isFrozen(graph.edges));
  assert.throws(() => { graph.distanceMatrix[0][1] = 0; }, TypeError);
});

test("cenário da aplicação é válido, com cinco vértices e dez arestas", () => {
  const graph = createGraph(INITIAL_VERTICES, INITIAL_DEPOT_ID);
  assert.equal(graph.vertices.length, 5);
  assert.equal(graph.edges.length, 10);
  assert.equal(graph.distanceMatrix.length, 5);
  const route = [...graph.vertices.map(({ id }) => id), graph.depotId];
  assert.ok(calculateRouteLength(route, graph) > 0);
});

test("contagem de arestas rejeita valores não inteiros ou negativos", () => {
  assert.equal(expectedEdgeCount(0), 0);
  assert.equal(expectedEdgeCount(12), 66);
  assert.throws(() => expectedEdgeCount(-1), RangeError);
  assert.throws(() => expectedEdgeCount(4.3), RangeError);
});
