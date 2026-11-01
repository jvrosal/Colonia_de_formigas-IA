import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  DEFAULT_PARAMETERS, INITIAL_DEPOT_ID, INITIAL_VERTICES, PARAMETER_FIELDS,
} from "../js/core/constants.js";
import { expectedEdgeCount } from "../js/ui/graph-view.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFile(path.join(root, file), "utf8");

function hasAtMostTwoDecimals(value) {
  return Number.isInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
}

test("01 · cenário inicial contém entre 5 e 12 vértices", () => {
  assert.ok(INITIAL_VERTICES.length >= 5 && INITIAL_VERTICES.length <= 12);
});

test("02 · identificadores únicos e não vazios", () => {
  const ids = INITIAL_VERTICES.map((vertex) => vertex.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => typeof id === "string" && id.trim().length > 0));
});

test("03 · coordenadas finitas e dentro dos limites", () => {
  for (const { x, y } of INITIAL_VERTICES) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    assert.ok(x >= 0 && x <= 1000 && y >= 0 && y <= 1000);
  }
});

test("04 · coordenadas têm no máximo duas casas decimais", () => {
  for (const vertex of INITIAL_VERTICES) {
    assert.ok(hasAtMostTwoDecimals(vertex.x));
    assert.ok(hasAtMostTwoDecimals(vertex.y));
  }
});

test("05 · não existem coordenadas duplicadas", () => {
  const coordinates = INITIAL_VERTICES.map(({ x, y }) => `${x},${y}`);
  assert.equal(new Set(coordinates).size, coordinates.length);
});

test("06 · depósito existe no cenário", () => {
  assert.ok(INITIAL_VERTICES.some(({ id }) => id === INITIAL_DEPOT_ID));
});

test("07 · contagem correta de arestas no grafo completo", () => {
  assert.equal(expectedEdgeCount(4), 6);
  assert.equal(expectedEdgeCount(5), 10);
  assert.equal(expectedEdgeCount(12), 66);
  assert.equal(expectedEdgeCount(INITIAL_VERTICES.length), 10);
});

test("08 · parâmetros padrão dentro dos limites", () => {
  for (const field of PARAMETER_FIELDS) {
    const value = DEFAULT_PARAMETERS[field.key];
    assert.ok(Number.isFinite(value), `${field.key}: valor inválido`);
    if (field.integer) assert.ok(Number.isInteger(value), `${field.key}: deve ser inteiro`);
    if (field.min !== undefined) assert.ok(value >= field.min, `${field.key}: abaixo do mínimo`);
    if (field.max !== undefined) assert.ok(value <= field.max, `${field.key}: acima do máximo`);
  }
});

test("09 · oito campos de parâmetro possuem chave única e rótulo", () => {
  const keys = PARAMETER_FIELDS.map((field) => field.key);
  assert.equal(keys.length, 8);
  assert.equal(new Set(keys).size, 8);
  assert.ok(PARAMETER_FIELDS.every((field) => field.label?.length > 0));
});

test("10 · arquivos obrigatórios da fundação existem", async () => {
  const filenames = [
    "index.html", "css/styles.css", "js/app.js", "js/core/constants.js",
    "js/ui/forms.js", "js/ui/graph-view.js", "js/ui/dashboard.js", "README.md", "package.json",
  ];
  for (const filename of filenames) {
    assert.ok((await stat(path.join(root, filename))).isFile(), `${filename} inexistente`);
  }
});

test("11 · HTML carrega CSS e JS via caminhos relativos", async () => {
  const html = await read("index.html");
  assert.match(html, /href="\.\/css\/styles\.css"/);
  assert.match(html, /type="module" src="\.\/js\/app\.js"/);
  assert.doesNotMatch(html, /<script[^>]*src="https?:\/\//);
});

test("12 · painel tem regiões e controles preparados, ainda desabilitados", async () => {
  const html = await read("index.html");
  for (const id of [
    "vertices-body", "depot-select", "parameter-fields", "graph-preview",
    "current-iteration", "best-distance", "iteration-distance", "average-distance",
    "best-route", "history-heading", "logs-heading",
  ]) {
    assert.ok(html.includes(`id="${id}"`), `Faltando #${id}`);
  }
  const buttons = html.match(/<button[^>]*>/g) ?? [];
  assert.equal(buttons.length, 4);
  assert.ok(buttons.every((button) => button.includes("disabled")));
});

test("13 · projeto não usa bibliotecas externas", async () => {
  const html = await read("index.html");
  const jsFiles = ["js/app.js", "js/ui/forms.js", "js/ui/graph-view.js", "js/ui/dashboard.js", "js/core/constants.js"];
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//);
  for (const file of jsFiles) {
    assert.doesNotMatch(await read(file), /\b(?:from|import)\s*\(?\s*["']https?:\/\//, `Importação externa em ${file}`);
  }
});

test("14 · README registra a limitação desta etapa e instruções de uso", async () => {
  const readme = await read("README.md");
  assert.match(readme, /não implementa o algoritmo/i);
  assert.match(readme, /python -m http\.server 8000/);
  assert.match(readme, /node --test/);
});
