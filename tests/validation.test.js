import test from "node:test";
import assert from "node:assert/strict";
import {
  hasAtMostTwoDecimals, validateVertices, validateDepot, validateRoute,
} from "../js/core/validation.js";
import { INITIAL_VERTICES, INITIAL_DEPOT_ID } from "../js/core/constants.js";

const rectangle = [
  { id: "A", x: 0, y: 0 },
  { id: "B", x: 3, y: 0 },
  { id: "C", x: 3, y: 4 },
  { id: "D", x: 0, y: 4 },
];
const change = (index, key, value, vertices = rectangle) =>
  vertices.map((vertex, i) => i === index ? { ...vertex, [key]: value } : { ...vertex });
const checkCode = (validation, code) => {
  assert.equal(validation.valid, false, `Esperado erro: ${code}`);
  assert.ok(validation.errors.some((item) => item.code === code), JSON.stringify(validation.errors));
  assert.ok(validation.errors.every((item) => item.message?.length > 0));
};

test("cenários de 4 e 12 vértices são aceitos", () => {
  assert.equal(validateVertices(rectangle).valid, true);
  assert.equal(validateVertices(INITIAL_VERTICES, { minVertices: 5 }).valid, true);
  const twelve = Array.from({ length: 12 }, (_, i) => ({ id: `P${i}`, x: i, y: i * 2 }));
  assert.equal(validateVertices(twelve).valid, true);
});

test("cenário inicial deve ter pelo menos 5 vértices", () => {
  checkCode(validateVertices(rectangle, { minVertices: 5 }), "vertices.count");
});

test("quantidade menor que 4 ou maior que 12 é rejeitada", () => {
  checkCode(validateVertices(rectangle.slice(0, 3)), "vertices.count");
  const thirteen = Array.from({ length: 13 }, (_, i) => ({ id: String(i), x: i, y: i }));
  checkCode(validateVertices(thirteen), "vertices.count");
});

test("argumento de vértices inválido é tratado sem exceção", () => {
  checkCode(validateVertices(null), "vertices.type");
  checkCode(validateVertices("não é um array"), "vertices.type");
  checkCode(validateVertices([{}, {}, null, {}]), "vertex.type");
});

test("identificadores ausentes, repetidos ou com espaços externos são rejeitados", () => {
  checkCode(validateVertices(change(1, "id", "")), "vertex.id.required");
  checkCode(validateVertices(change(1, "id", " ")), "vertex.id.required");
  checkCode(validateVertices(change(1, "id", 12)), "vertex.id.required");
  checkCode(validateVertices(change(1, "id", " A")), "vertex.id.whitespace");
  checkCode(validateVertices(change(1, "id", "A")), "vertex.id.duplicate");
});

test("coordenadas precisam ser números finitos", () => {
  for (const value of [null, undefined, "3", NaN, Infinity, -Infinity]) {
    checkCode(validateVertices(change(1, "x", value)), "vertex.coordinate.finite");
    checkCode(validateVertices(change(1, "y", value)), "vertex.coordinate.finite");
  }
});

test("limites inclusivos 0 e 1000 e proibição de extrapolação", () => {
  assert.equal(validateVertices(change(1, "x", 1000)).valid, true);
  assert.equal(validateVertices(change(1, "x", 0)).valid, false); // coincidiria com A (0,0)
  const validZero = change(1, "x", 0).map((vertex, i) => i === 1 ? { ...vertex, y: 0.01 } : vertex);
  assert.equal(validateVertices(validZero).valid, true); // o limite zero é permitido
  assert.equal(validateVertices(change(1, "y", 1000)).valid, true);
  checkCode(validateVertices(change(1, "x", -0.01)), "vertex.coordinate.range");
  checkCode(validateVertices(change(1, "x", 1000.01)), "vertex.coordinate.range");
  checkCode(validateVertices(change(1, "y", -2)), "vertex.coordinate.range");
});

test("duas casas decimais: valores decimais reais aceitos e terceira casa rejeitada", () => {
  for (const value of [0, 0.1, 0.29, 3.05, 999.99, 1000]) {
    assert.equal(hasAtMostTwoDecimals(value), true, `${value} deveria ser aceito`);
  }
  for (const value of [0.001, 0.125, 999.999, NaN]) {
    assert.equal(hasAtMostTwoDecimals(value), false, `${value} deveria ser rejeitado`);
  }
  checkCode(validateVertices(change(1, "x", 3.001)), "vertex.coordinate.precision");
});

test("coordenadas duplicadas, mesmo com IDs diferentes, são rejeitadas", () => {
  const duplicate = change(1, "x", 0).map((v, i) => i === 1 ? { ...v, y: 0 } : v);
  checkCode(validateVertices(duplicate), "vertex.position.duplicate");
  checkCode(validateVertices(change(1, "x", 0)), "vertex.position.duplicate");
});

test("um ponto a distância muito curta mas legal não é tratado como duplicado", () => {
  assert.equal(validateVertices(change(1, "x", 0.01)).valid, true);
});

test("depósito precisa existir e estar preenchido", () => {
  assert.equal(validateDepot(INITIAL_VERTICES, INITIAL_DEPOT_ID).valid, true);
  assert.equal(validateDepot(rectangle, "C").valid, true);
  checkCode(validateDepot(rectangle, "Z"), "depot.notFound");
  checkCode(validateDepot(rectangle, ""), "depot.required");
  checkCode(validateDepot(rectangle, null), "depot.required");
  checkCode(validateDepot(null, "A"), "depot.vertices");
});

test("rota correta e reversa são aceitas", () => {
  assert.equal(validateRoute(["A", "B", "C", "D", "A"], rectangle, "A").valid, true);
  assert.equal(validateRoute(["A", "D", "C", "B", "A"], rectangle, "A").valid, true);
});

test("rota inválida: falta entrega, repetição, origem errada, desconhecidos", () => {
  checkCode(validateRoute(["A", "B", "C", "A"], rectangle, "A"), "route.length");
  checkCode(validateRoute(["A", "B", "B", "D", "A"], rectangle, "A"), "route.repeated");
  checkCode(validateRoute(["A", "B", "A", "D", "A"], rectangle, "A"), "route.depot.repeated");
  checkCode(validateRoute(["B", "C", "D", "A", "B"], rectangle, "A"), "route.endpoints");
  checkCode(validateRoute(["A", "B", "Z", "D", "A"], rectangle, "A"), "route.unknown");
  checkCode(validateRoute(["A", "B", "C", "D", "A"], rectangle, "Z"), "route.depot");
  checkCode(validateRoute(null, rectangle, "A"), "route.type");
});
