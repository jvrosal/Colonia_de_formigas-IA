import test from "node:test";
import assert from "node:assert/strict";
import {
  createPheromoneMatrix, validatePheromoneMatrix, calculateTransitionWeights,
  calculateProbabilities, weightedRandomChoice, previewTransition,
} from "../js/core/ant-system.js";
import { createSeededRandom } from "../js/core/random.js";
import { createGraph } from "../js/core/graph.js";
import { INITIAL_VERTICES, DEFAULT_PARAMETERS, INITIAL_DEPOT_ID } from "../js/core/constants.js";

const graph = createGraph([
  { id: "A", x: 0, y: 0 },
  { id: "B", x: 3, y: 0 },
  { id: "C", x: 3, y: 4 },
  { id: "D", x: 0, y: 4 },
], "A");
const tau = () => createPheromoneMatrix(4, 1);
const weights = (currentId = "A", visited = ["A"], alpha = 1, beta = 2, pheromones = tau()) =>
  calculateTransitionWeights(graph, pheromones, currentId, visited, alpha, beta);
const probs = (currentId = "A", visited = ["A"], alpha = 1, beta = 2, pheromones = tau()) =>
  calculateProbabilities(weights(currentId, visited, alpha, beta, pheromones));
const close = (a, b) => assert.ok(Math.abs(a - b) <= 0.000001, `Obtido ${a}; esperado ${b}`);

test("matriz inicial é quadrada, simétrica e sem feromônio na diagonal", () => {
  for (const n of [4, 5, 12]) {
    const matrix = createPheromoneMatrix(n, 0.01);
    assert.equal(matrix.length, n);
    assert.equal(validatePheromoneMatrix(matrix, n), true);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      assert.equal(matrix[i][j], i === j ? 0 : 0.01);
    }
  }
});

test("alterar uma célula não altera outra linha nem a origem do grafo", () => {
  const matrix = tau();
  matrix[0][1] = 3;
  assert.equal(matrix[1][0], 1);
  assert.equal(graph.distanceMatrix[0][1], 3);
});

test("τ₀ aceita limites 0,01 e 100 e rejeita valores inválidos", () => {
  assert.equal(createPheromoneMatrix(4, 0.01)[0][1], 0.01);
  assert.equal(createPheromoneMatrix(4, 100)[0][1], 100);
  for (const bad of [0, -1, 0.009, 100.001, NaN, Infinity, undefined, "1"]) {
    assert.throws(() => createPheromoneMatrix(4, bad), RangeError);
  }
});

test("quantidade de vértices da matriz deve estar entre 4 e 12 e ser inteira", () => {
  for (const bad of [0, 3, 13, 4.5, NaN, Infinity]) {
    assert.throws(() => createPheromoneMatrix(bad, 1), RangeError);
  }
});

test("matriz com dimensões diferentes, diagonal preenchida ou assimetria é rejeitada", () => {
  const badShape = tau(); badShape.pop();
  assert.throws(() => validatePheromoneMatrix(badShape, 4), RangeError);
  const badDiagonal = tau(); badDiagonal[2][2] = 1;
  assert.throws(() => validatePheromoneMatrix(badDiagonal, 4), RangeError);
  const asymmetric = tau(); asymmetric[1][3] = 2;
  assert.throws(() => validatePheromoneMatrix(asymmetric, 4), RangeError);
  const zeroEdge = tau(); zeroEdge[0][1] = 0; zeroEdge[1][0] = 0;
  assert.throws(() => validatePheromoneMatrix(zeroEdge, 4), RangeError);
});

test("piso numérico 10⁻¹² é aceito; abaixo dele é rejeitado", () => {
  const minimum = tau(); minimum[0][1] = 1e-12; minimum[1][0] = 1e-12;
  assert.equal(validatePheromoneMatrix(minimum, 4), true);
  minimum[0][1] = 1e-13; minimum[1][0] = 1e-13;
  assert.throws(() => validatePheromoneMatrix(minimum, 4), RangeError);
});

test("6.2: pesos esperados em A = 1/9, 1/25, 1/16", () => {
  const result = weights();
  assert.deepEqual(result.map((item) => item.id), ["B", "C", "D"]);
  for (const [i, expected] of [1/9, 1/25, 1/16].entries()) close(result[i].weight, expected);
  assert.deepEqual(result.map(({ distance }) => distance), [3, 5, 4]);
  assert.deepEqual(result.map(({ pheromone }) => pheromone), [1, 1, 1]);
});

test("6.2: probabilidades exatas p(A,B)=400/769, p(A,C)=144/769, p(A,D)=225/769", () => {
  const result = probs();
  for (const [i, expected] of [400/769, 144/769, 225/769].entries()) close(result[i].probability, expected);
  close(result.reduce((sum, item) => sum + item.probability, 0), 1);
});

test("6.2: após visitar B, candidatas C e D têm probabilidades 25/41 e 16/41", () => {
  const result = probs("B", ["A", "B"]);
  assert.deepEqual(result.map(({ id }) => id), ["C", "D"]);
  close(result[0].probability, 25/41);
  close(result[1].probability, 16/41);
});

test("6.2: α = β = 0 gera probabilidades uniformes", () => {
  const modified = tau();
  modified[0][1] = modified[1][0] = 9;
  const p = probs("A", ["A"], 0, 0, modified);
  assert.deepEqual(p.map(({ weight }) => weight), [1, 1, 1]);
  p.forEach(({ probability }) => close(probability, 1/3));
});

test("α = 0 ignora feromônio, mas mantém a distância", () => {
  const modified = tau();
  modified[0][1] = modified[1][0] = 20;
  const a = probs("A", ["A"], 0, 2, modified);
  const b = probs("A", ["A"], 0, 2, tau());
  assert.deepEqual(a.map(({ probability }) => probability), b.map(({ probability }) => probability));
});

test("β = 0 ignora distância, mas continua respeitando feromônio", () => {
  const modified = tau();
  modified[0][1] = modified[1][0] = 4;
  const p = probs("A", ["A"], 1, 0, modified);
  [4/6, 1/6, 1/6].forEach((v, i) => close(p[i].probability, v));
});

test("um único candidato restante recebe probabilidade 1", () => {
  const p = probs("C", ["A", "B", "C"]);
  assert.deepEqual(p.map(({ id, probability }) => [id, probability]), [["D", 1]]);
});

test("nenhum candidato restante rejeita normalização e impede sorteio vazio", () => {
  assert.deepEqual(weights("D", ["A", "B", "C", "D"]), []);
  assert.throws(() => calculateProbabilities([]), RangeError);
  assert.throws(() => weightedRandomChoice([], [], createSeededRandom(1)), RangeError);
});

test("ordem de candidatos acompanha os vértices do grafo, não o Set de visitados", () => {
  assert.deepEqual(weights("C", ["C", "B"]).map(({ id }) => id), ["A", "D"]);
});

test("valida α, β, vértice atual e lista de visitados", () => {
  for (const bad of [-1, 5.001, NaN, Infinity, "1"]) {
    assert.throws(() => weights("A", ["A"], bad, 2), RangeError);
    assert.throws(() => weights("A", ["A"], 1, bad), RangeError);
  }
  assert.throws(() => weights("Z", ["A"]), RangeError);
  for (const visited of [[], ["B"], ["A", "A"], ["A", "Z"], "A"]) {
    assert.throws(() => weights("A", visited), RangeError);
  }
});

test("distâncias inválidas ou matriz de feromônios incompatível são rejeitadas", () => {
  const badGraph = { ...graph, distanceMatrix: graph.distanceMatrix.map((r) => [...r]) };
  badGraph.distanceMatrix[0][1] = 0;
  assert.throws(() => calculateTransitionWeights(badGraph, tau(), "A", ["A"], 1, 2), RangeError);
  assert.throws(() => calculateTransitionWeights(graph, [[0]], "A", ["A"], 1, 2), RangeError);
});

test("pesos normalizados robustamente com valores muito grandes sem overflow da soma", () => {
  const result = calculateProbabilities([{ id: "B", weight: 1e308 }, { id: "C", weight: 1e308 }]);
  close(result[0].probability, 0.5);
  close(result[1].probability, 0.5);
});

test("pesos inválidos e IDs duplicados são rejeitados", () => {
  for (const bad of [NaN, Infinity, 0, -1, "1"]) {
    assert.throws(() => calculateProbabilities([{ id: "B", weight: bad }]), RangeError);
  }
  assert.throws(() => calculateProbabilities([{id:"B",weight:1},{id:"B",weight:2}]), RangeError);
});

test("funções de decisão não modificam entrada, grafo ou matriz", () => {
  const matrix = tau();
  const visited = ["A"];
  const snapshot = JSON.stringify(matrix);
  const graphSnapshot = JSON.stringify(graph);
  const result = probs("A", visited, 1, 2, matrix);
  assert.equal(result.length, 3);
  assert.equal(JSON.stringify(matrix), snapshot);
  assert.equal(JSON.stringify(graph), graphSnapshot);
  assert.deepEqual(visited, ["A"]);
});

test("6.2: o sorteio escolhe candidatos mesmo sem serem o maior peso", () => {
  const candidates = ["B", "C", "D"];
  const probabilities = [400/769, 144/769, 225/769];
  for (const [v, expected] of [[0, "B"], [0.5202, "C"], [0.9, "D"], [0.999999, "D"]]) {
    const choice = weightedRandomChoice(candidates, probabilities, { next: () => v });
    assert.equal(choice.candidate, expected);
    assert.equal(choice.randomValue, v);
  }
});

test("o sorteio ignora candidatos de probabilidade zero inclusive quando r = 0", () => {
  const result = weightedRandomChoice(["B", "C", "D"], [0, 1, 0], { next: () => 0 });
  assert.equal(result.candidate, "C");
});

test("o sorteio rejeita probabilidades inválidas, candidato vazio ou RNG inválido", () => {
  const rng = createSeededRandom(9);
  for (const bad of [[-0.1, 1.1], [0.5, 0.6], [NaN, 1], [Infinity, 0]]) {
    assert.throws(() => weightedRandomChoice(["A", "B"], bad, rng), RangeError);
  }
  assert.throws(() => weightedRandomChoice(["A"], [1], null), TypeError);
  for (const v of [-0.1, 1, NaN, Infinity]) {
    assert.throws(() => weightedRandomChoice(["A"], [1], { next: () => v }), RangeError);
  }
});

test("gerador Mulberry32 repete a mesma sequência com a mesma semente", () => {
  const a = createSeededRandom(42);
  const b = createSeededRandom(42);
  assert.deepEqual(Array.from({length:100},()=>a.next()), Array.from({length:100},()=>b.next()));
});

test("sementes diferentes produzem sequências diferentes", () => {
  const a = createSeededRandom(1);
  const b = createSeededRandom(2);
  assert.notDeepEqual(Array.from({length:10},()=>a.next()), Array.from({length:10},()=>b.next()));
});

test("reiniciar o RNG repõe a sequência, inclusive semente zero ou negativa", () => {
  for (const seed of [0, -42, 42]) {
    const rng = createSeededRandom(seed);
    const initialState = rng.getState();
    const sequence = Array.from({length:30},()=>rng.next());
    assert.notEqual(rng.getState(), initialState);
    rng.reset();
    assert.equal(rng.getState(), initialState);
    assert.deepEqual(sequence, Array.from({length:30},()=>rng.next()));
  }
});

test("gerador permanece dentro de [0,1) e retorna valores finitos", () => {
  const rng = createSeededRandom(42);
  for (let i = 0; i < 10000; i++) {
    const value = rng.next();
    assert.ok(Number.isFinite(value) && value >= 0 && value < 1);
  }
});

test("sementes não inteiras, inseguras ou não numéricas são rejeitadas", () => {
  for (const seed of [0.5, NaN, Infinity, 2**53, "42", null, undefined]) {
    assert.throws(() => createSeededRandom(seed), TypeError);
  }
});

test("um sorteio completo reproduz o mesmo candidato e o mesmo valor após reset", () => {
  const rng = createSeededRandom(42);
  const first = previewTransition(graph, tau(), "A", ["A"], 1, 2, rng);
  rng.reset();
  const second = previewTransition(graph, tau(), "A", ["A"], 1, 2, rng);
  assert.deepEqual(first, second);
  assert.equal(first.candidates.length, 3);
});

test("distribuição empírica do sorteio aproxima as probabilidades, sem seleção gulosa", () => {
  const rng = createSeededRandom(1234);
  const options = probs();
  const tally = new Map(options.map(({id})=>[id,0]));
  for (let i = 0; i < 30000; i++) {
    const draw = weightedRandomChoice(options, options.map(({ probability }) => probability), rng);
    tally.set(draw.candidate.id, tally.get(draw.candidate.id)+1);
  }
  for (const option of options) {
    assert.ok(Math.abs(tally.get(option.id)/30000-option.probability) < 0.015,
      `Frequência de ${option.id} incompatível com probabilidade esperada.`);
  }
  assert.ok(tally.get("B")>0 && tally.get("C")>0 && tally.get("D")>0);
});

test("integração da Etapa 02 funciona no cenário inicial de cinco vértices", () => {
  const initialGraph = createGraph(INITIAL_VERTICES, INITIAL_DEPOT_ID);
  const matrix = createPheromoneMatrix(initialGraph.vertices.length, DEFAULT_PARAMETERS.initialPheromone);
  const result = previewTransition(initialGraph, matrix, initialGraph.depotId, [initialGraph.depotId],
    DEFAULT_PARAMETERS.alpha, DEFAULT_PARAMETERS.beta, createSeededRandom(DEFAULT_PARAMETERS.seed));
  assert.equal(result.candidates.length, 4);
  assert.ok(initialGraph.vertices.some(({id})=>id === result.choice.candidate.id));
  close(result.candidates.reduce((acc,{probability})=>acc+probability,0),1);
  assert.equal(matrix[0][0], 0);
  assert.equal(matrix[0][1], DEFAULT_PARAMETERS.initialPheromone);
});
