
import test from "node:test";
import assert from "node:assert/strict";

import { initializeApp } from "../js/app.js";
import { createGraph } from "../js/core/graph.js";
import {
  renderInitialGraphPreview,
  formatPheromone
} from "../js/ui/graph-view.js";
import {
  criarDocumentoSimulado
} from "./helpers/dom-simulado.js";

function iniciar() {
  const document = criarDocumentoSimulado();
  globalThis.document = document;

  const app = initializeApp(document);
  const get = id => document.getElementById(id);

  const acionar = id =>
    get(id).dispatchEvent({ type: "click" });

  const editar = (element, value, type = "input") => {
    element.value = value;
    element.dispatchEvent({ type });
  };

  const parametro = name =>
    get("parameter-fields").querySelector(`[name="${name}"]`);

  const vertice = (index, field) =>
    get("vertices-body").children[index]
      .querySelector(`[data-field="${field}"]`);

  return {
    app,
    document,
    get,
    acionar,
    editar,
    parametro,
    vertice
  };
}

test("Interface: inicialização apresenta grafo e controles válidos", () => {
  const { get } = iniciar();

  assert.match(
    get("graph-summary").textContent,
    /5 vértices e 10 arestas/
  );

  assert.equal(get("current-iteration").textContent, "0 / 30");
  assert.equal(get("best-distance").textContent, "Ainda não calculada");

  assert.equal(
    get("graph-preview").querySelectorAll("line[data-edge]").length,
    10
  );

  assert.equal(get("run-button").disabled, false);
  assert.equal(get("pause-button").disabled, true);
});

test("Interface: mudar depósito produz rota ilustrativa válida e execução no novo depósito", () => {
  const { app, get, acionar, editar } = iniciar();

  editar(get("depot-select"), "C", "change");
  assert.equal(get("run-button").disabled, true);

  acionar("apply-scenario");

  assert.equal(
    get("example-route").textContent,
    "C → A → B → D → E → C"
  );

  assert.ok(
    Number.isFinite(
      Number(
        get("example-distance").textContent
          .replaceAll(".", "")
          .replace(",", ".")
      )
    )
  );

  acionar("step-button");

  const state = app.getState();

  assert.equal(state.iteration, 1);
  assert.equal(state.bestRoute.at(0), "C");
  assert.equal(state.bestRoute.at(-1), "C");
  assert.equal(new Set(state.bestRoute.slice(0, -1)).size, 5);
});

test("Interface: formata feromônios pequenos sem arredondar para zero", () => {
  assert.equal(formatPheromone(0), "0");
  assert.equal(formatPheromone(0.5), "0,5");
  assert.equal(formatPheromone(1e-12), "1.000e-12");
  assert.equal(formatPheromone(7.25e-9), "7.250e-9");

  const { get } = iniciar();

  const vertices = [
    { id: "A", x: 0, y: 0 },
    { id: "B", x: 3, y: 0 },
    { id: "C", x: 3, y: 4 },
    { id: "D", x: 0, y: 4 }
  ];

  const graph = createGraph(vertices, "A");

  const pheromones = Array.from(
    { length: 4 },
    (_, i) => Array.from(
      { length: 4 },
      (_, j) => i === j ? 0 : 1e-12
    )
  );

  renderInitialGraphPreview(
    get("graph-preview"),
    graph,
    pheromones
  );

  const titles = get("graph-preview")
    .querySelectorAll("title")
    .map(n => n.textContent);

  assert.equal(
    titles.filter(t => t.includes("Feromônio: 1.000e-12")).length,
    6
  );

  assert.ok(
    titles.every(t => !t.includes("Feromônio: 0\n"))
  );
});

test("Interface: avançar e reiniciar preserva a coerência do histórico", () => {
  const { app, get, acionar } = iniciar();

  acionar("step-button");

  assert.equal(app.getState().iteration, 1);
  assert.equal(get("history-count").textContent, "1 registro(s)");

  assert.notEqual(
    get("best-distance").textContent,
    "Ainda não calculada"
  );

  acionar("reset-button");

  assert.equal(app.getState().iteration, 0);
  assert.equal(get("history-count").textContent, "0 registro(s)");

  assert.equal(
    get("best-distance").textContent,
    "Ainda não calculada"
  );

  assert.equal(get("step-button").disabled, false);
});

test("Interface: editar parâmetro durante execução pausa e bloqueia a continuação", async () => {
  const {
    app,
    get,
    acionar,
    editar,
    parametro
  } = iniciar();

  acionar("step-button");
  const iteration = app.getState().iteration;

  acionar("run-button");

  assert.equal(
    get("simulation-state").textContent,
    "Executando"
  );

  editar(parametro("beta"), "3");

  assert.equal(get("run-button").disabled, true);
  assert.equal(get("step-button").disabled, true);
  assert.equal(get("pause-button").disabled, true);

  assert.match(
    get("simulation-state").textContent,
    /alterações pendentes/
  );

  assert.match(
    get("app-status").textContent,
    /pausada/
  );

  await new Promise(resolve => setTimeout(resolve, 220));

  assert.equal(app.getState().iteration, iteration);
  assert.equal(get("history-count").textContent, "1 registro(s)");
});

test("Interface: aplicar novas configurações reinicia histórico e desbloqueia botões", () => {
  const {
    app,
    get,
    acionar,
    editar,
    parametro
  } = iniciar();

  acionar("step-button");
  editar(parametro("beta"), "4");

  assert.equal(get("run-button").disabled, true);

  acionar("apply-scenario");

  assert.equal(app.getState().iteration, 0);
  assert.equal(get("history-count").textContent, "0 registro(s)");
  assert.equal(get("run-button").disabled, false);
  assert.equal(get("step-button").disabled, false);

  acionar("step-button");
  assert.equal(app.getState().iteration, 1);
});

test("Interface: valor inválido não destrói resultados anteriores", () => {
  const {
    app,
    get,
    acionar,
    editar,
    parametro
  } = iniciar();

  acionar("step-button");

  const oldRoute = app.getState().bestRoute;

  editar(parametro("ants"), "101");
  acionar("apply-scenario");

  assert.match(
    get("app-status").textContent,
    /entre 1 e 100/
  );

  assert.equal(app.getState().iteration, 1);
  assert.deepEqual(app.getState().bestRoute, oldRoute);
  assert.equal(get("run-button").disabled, true);
});

test("Interface: editar coordenadas e renomear vértice exige aplicação", () => {
  const {
    app,
    get,
    acionar,
    editar,
    vertice
  } = iniciar();

  editar(vertice(1, "x"), "29");

  assert.equal(get("step-button").disabled, true);

  acionar("apply-scenario");
  assert.equal(app.getState().iteration, 0);

  editar(vertice(1, "id"), "Z");

  assert.ok(
    Array.from(get("depot-select").children)
      .some(o => o.value === "Z")
  );

  acionar("apply-scenario");

  assert.match(get("example-route").textContent, /Z/);

  acionar("step-button");
  assert.ok(app.getState().bestRoute.includes("Z"));
});

test("Interface: adicionar e remover vértices preserva limites e exige aplicação", () => {
  const { app, get, acionar } = iniciar();

  acionar("add-vertex");

  assert.equal(get("vertices-body").children.length, 6);
  assert.equal(get("run-button").disabled, true);

  acionar("apply-scenario");

  assert.equal(
    get("graph-preview").querySelectorAll("line[data-edge]").length,
    15
  );

  const remove = get("vertices-body")
    .children[5]
    .querySelector("button[data-remove]");

  remove.dispatchEvent({ type: "click" });

  assert.equal(get("vertices-body").children.length, 5);

  acionar("apply-scenario");
  acionar("step-button");

  assert.equal(app.getState().bestRoute.length, 6);
});

test("Interface: depósito alterado durante execução interrompe o avanço automático", async () => {
  const {
    app,
    get,
    acionar,
    editar
  } = iniciar();

  acionar("step-button");
  acionar("run-button");

  editar(get("depot-select"), "D", "change");

  const iteration = app.getState().iteration;

  assert.equal(get("pause-button").disabled, true);
  assert.equal(get("run-button").disabled, true);

  await new Promise(resolve => setTimeout(resolve, 220));

  assert.equal(app.getState().iteration, iteration);

  acionar("apply-scenario");
  assert.equal(app.getState().iteration, 0);

  acionar("step-button");
  assert.equal(app.getState().bestRoute[0], "D");
});

test("Interface: reiniciar repõe semente e reproduz o histórico de sorteios", () => {
  const { app, acionar } = iniciar();

  for (let i = 0; i < 4; i++) {
    acionar("step-button");
  }

  const history = app.getState().history;

  acionar("reset-button");

  for (let i = 0; i < 4; i++) {
    acionar("step-button");
  }

  assert.deepEqual(app.getState().history, history);
});

test("Interface: logs apresentam feromônio pequeno de uma execução real", () => {
  const {
    app,
    get,
    acionar,
    editar,
    parametro
  } = iniciar();

  for (const [name, value] of [
    ["ants", "1"],
    ["iterations", "60"],
    ["evaporationPercent", "90"],
    ["depositConstant", "0.01"],
    ["alpha", "5"],
    ["beta", "5"]
  ]) {
    editar(parametro(name), value);
  }

  acionar("apply-scenario");

  for (let i = 0; i < 45; i++) {
    acionar("step-button");
  }

  const state = app.getState();

  const index = state.history.findIndex(entry =>
    entry.edgeLogs.some(
      edge => edge.final > 0 && edge.final < 1e-6
    )
  );

  assert.ok(
    index >= 0,
    "A execução deve produzir um feromônio pequeno"
  );

  const edge = state.history[index].edgeLogs.find(
    e => e.final > 0 && e.final < 1e-6
  );

  const log = get("logs-container").children[index];

  log.open = true;
  log.dispatchEvent({
    type: "toggle",
    bubbles: false
  });

  assert.ok(
    log.textContent.includes(
      `final ${formatPheromone(edge.final)}`
    )
  );

  assert.doesNotMatch(
    log.textContent,
    /final 0(?:;|$)/
  );
});
