
import {
  DEFAULT_PARAMETERS,
  INITIAL_DEPOT_ID,
  INITIAL_VERTICES,
  PARAMETER_FIELDS
} from "./core/constants.js";

import {
  createGraph,
  expectedEdgeCount,
  calculateRouteLength
} from "./core/graph.js";

import { createSimulation } from "./core/simulation.js";

import {
  renderInitialParameters,
  renderEditableVertices,
  readVertexInputs,
  readParameterInputs
} from "./ui/forms.js";

import {
  renderInitialGraphPreview
} from "./ui/graph-view.js";

import {
  renderDistanceMatrix
} from "./ui/distance-matrix.js";

import {
  renderInitialDashboard
} from "./ui/dashboard.js";

import {
  renderInitialProbabilityPreview
} from "./ui/probability-preview.js";

const format = value => value.toLocaleString(
  "pt-BR",
  { maximumFractionDigits: 4 }
);

function el(tag, text = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

export function initializeApp(root = document) {
  const get = id => root.getElementById(id);

  const body = get("vertices-body");
  const depot = get("depot-select");
  const params = get("parameter-fields");

  let graph = createGraph(
    INITIAL_VERTICES,
    INITIAL_DEPOT_ID
  );

  let config = { ...DEFAULT_PARAMETERS };
  let engine = createSimulation(graph, config);

  let running = false;
  let timer = null;
  let hasPendingChanges = false;

  function status(message, error = false) {
    get("app-status").textContent = message;

    get("app-status").classList.toggle(
      "status--ready",
      !error
    );

    get("initialization-error").hidden = !error;

    if (error) {
      get("initialization-error").textContent = message;
    }
  }

  function stop() {
    running = false;

    if (timer !== null) {
      clearTimeout(timer);
    }

    timer = null;
  }

  function renderHistory(state) {
    const container = get("history-container");
    container.replaceChildren();

    get("history-count").textContent =
      `${state.history.length} registro(s)`;

    if (!state.history.length) {
      container.append(
        el("p", "Nenhuma iteração concluída.")
      );
      return;
    }

    const table = el("table");
    table.className = "distance-table history-table";

    const head = el("thead");
    const header = el("tr");

    for (const text of [
      "Iteração",
      "Menor",
      "Média",
      "Melhor acumulada"
    ]) {
      header.append(el("th", text));
    }

    head.append(header);

    const tbody = el("tbody");

    for (const item of state.history) {
      const row = el("tr");

      for (const value of [
        item.iteration,
        format(item.iterationBestLength),
        format(item.meanLength),
        format(item.bestLength)
      ]) {
        row.append(el("td", String(value)));
      }

      tbody.append(row);
    }

    table.append(head, tbody);

    const wrapper = el("div");
    wrapper.className = "distance-table-wrap";
    wrapper.append(table);

    container.append(wrapper);
  }

  function renderLogs(state) {
    const container = get("logs-container");
    container.replaceChildren();

    get("logs-count").textContent =
      `${state.history.length} iteração(ões)`;

    if (!state.history.length) {
      container.append(
        el("p", "Nenhuma iteração concluída.")
      );
      return;
    }

    for (const entry of state.history) {
      const details = el("details");
      details.className = "iteration-log";

      details.append(
        el(
          "summary",
          `Iteração ${entry.iteration} · menor distância ${format(entry.iterationBestLength)}`
        )
      );

      const ant = entry.antRoutes[0];

      details.append(
        el(
          "p",
          `Formiga 1: ${ant.route.join(" → ")} · comprimento ${format(ant.length)}`
        )
      );

      for (const step of ant.steps) {
        if (step.returnToDepot) {
          details.append(
            el(
              "p",
              `Retorno obrigatório: ${step.currentId} → ${step.chosenId}`
            )
          );
          continue;
        }

        const candidates = step.candidates
          .map(candidate =>
            `${candidate.id}: ${(candidate.probability * 100).toFixed(2)}%`
          )
          .join("; ");

        details.append(
          el(
            "p",
            `${step.currentId} · candidatos [${candidates}] · escolhido ${step.chosenId}`
          )
        );
      }

      const edgeDetails = el("details");

      edgeDetails.append(
        el("summary", "Evaporação e depósitos por aresta")
      );

      for (const edge of entry.edgeLogs) {
        edgeDetails.append(
          el(
            "p",
            `${edge.fromId}–${edge.toId}: anterior ${format(edge.previous)}; evaporado ${format(edge.afterEvaporation)}; depósito ${format(edge.totalDeposit)}; final ${format(edge.final)}`
          )
        );
      }

      details.append(edgeDetails);
      container.append(details);
    }
  }

  function renderState() {
    const state = engine.getState();

    get("current-iteration").textContent =
      `${state.iteration} / ${config.iterations}`;

    get("best-distance").textContent =
      state.bestLength === null
        ? "Ainda não calculada"
        : format(state.bestLength);

    const latest = state.history.at(-1);

    get("iteration-distance").textContent =
      latest
        ? format(latest.iterationBestLength)
        : "—";

    get("average-distance").textContent =
      latest
        ? format(latest.meanLength)
        : "—";

    get("best-route").textContent =
      state.bestRoute
        ? state.bestRoute.join(" → ")
        : "Nenhuma rota calculada";

    get("simulation-state").textContent =
      state.finished
        ? "Finalizada"
        : running
          ? "Executando"
          : state.iteration
            ? "Pausada"
            : "Não iniciada";

    get("run-button").disabled =
      running || state.finished;

    get("pause-button").disabled = !running;

    get("step-button").disabled =
      running || state.finished;

    renderInitialGraphPreview(
      get("graph-preview"),
      graph,
      state.pheromoneMatrix,
      state.bestRoute
    );

    renderHistory(state);
    renderLogs(state);
  }

  function renderScenario() {
    renderEditableVertices(
      body,
      depot,
      graph.vertices,
      graph.depotId
    );

    renderDistanceMatrix(
      get("distance-matrix"),
      graph
    );

    renderInitialProbabilityPreview(
      get("probability-preview"),
      graph,
      config
    );

    get("vertex-count").textContent =
      String(graph.vertices.length);

    get("graph-summary").textContent =
      `${graph.vertices.length} vértices · ${expectedEdgeCount(graph.vertices.length)} arestas`;

    const example = [
      ...graph.vertices.map(v => v.id),
      graph.depotId
    ];

    get("example-route").textContent =
      example.join(" → ");

    get("example-distance").textContent =
      format(calculateRouteLength(example, graph));

    renderState();
  }

  function applyInputs() {
    const vertices = readVertexInputs(body);

    const newGraph = createGraph(
      vertices,
      depot.value
    );

    const newConfig = readParameterInputs(
      params,
      PARAMETER_FIELDS
    );

    const newEngine = createSimulation(
      newGraph,
      newConfig
    );

    stop();

    graph = newGraph;
    config = newConfig;
    engine = newEngine;

    hasPendingChanges = false;

    renderScenario();

    status(
      "Configuração aplicada. Simulação reiniciada."
    );
  }

  function safe(action) {
    try {
      action();
    } catch (error) {
      stop();

      const message =
        error?.errors?.map(
          item => item.message
        ).join(" ") ||
        error.message ||
        "Dados inválidos.";

      status(message, true);
      renderState();
    }
  }

  function ensureUpdated() {
    if (hasPendingChanges) {
      applyInputs();
    }
  }

  function tick() {
    if (!running) return;

    safe(() => {
      engine.step();
      renderState();

      if (engine.getState().finished) {
        stop();
        renderState();
        status("Simulação concluída.");
      } else {
        timer = setTimeout(tick, 180);
      }
    });
  }

  get("run-button").addEventListener(
    "click",
    () => safe(() => {
      ensureUpdated();

      if (engine.getState().finished) return;

      running = true;
      renderState();

      status("Executando iterações...");

      timer = setTimeout(tick, 0);
    })
  );

  get("pause-button").addEventListener(
    "click",
    () => {
      stop();
      renderState();
      status("Simulação pausada.");
    }
  );

  get("step-button").addEventListener(
    "click",
    () => safe(() => {
      ensureUpdated();
      stop();
      engine.step();
      renderState();

      status("Uma iteração concluída.");
    })
  );

  get("reset-button").addEventListener(
    "click",
    () => safe(() => {
      stop();

      if (hasPendingChanges) {
        applyInputs();
      } else {
        engine.reset();
        renderState();
      }

      status("Simulação reiniciada.");
    })
  );

  get("apply-scenario").addEventListener(
    "click",
    () => safe(applyInputs)
  );

  get("add-vertex").addEventListener(
    "click",
    () => safe(() => {
      const vertices = readVertexInputs(body);

      if (vertices.length >= 12) {
        throw new Error(
          "O limite é de 12 vértices."
        );
      }

      let index = 1;

      while (
        vertices.some(
          v => v.id === `N${index}`
        )
      ) {
        index++;
      }

      const used = new Set(
        vertices.map(v => `${v.x}|${v.y}`)
      );

      let x = 10;
      let y = 10;

      while (used.has(`${x}|${y}`)) {
        x += 10;

        if (x > 1000) {
          x = 10;
          y += 10;
        }
      }

      vertices.push({
        id: `N${index}`,
        x,
        y
      });

      renderEditableVertices(
        body,
        depot,
        vertices,
        depot.value
      );

      hasPendingChanges = true;

      status(
        "Vértice adicionado. Aplique o cenário para validar."
      );
    })
  );

  body.addEventListener(
    "click",
    event => safe(() => {
      const button = event.target.closest(
        "button[data-remove]"
      );

      if (!button) return;

      const vertices = readVertexInputs(body);

      if (vertices.length <= 4) {
        throw new Error(
          "São necessários pelo menos 4 vértices."
        );
      }

      const index = Array.from(
        body.children
      ).indexOf(
        button.closest("tr")
      );

      vertices.splice(index, 1);

      const selected = vertices.some(
        v => v.id === depot.value
      )
        ? depot.value
        : vertices[0].id;

      renderEditableVertices(
        body,
        depot,
        vertices,
        selected
      );

      hasPendingChanges = true;

      status(
        "Vértice removido. Aplique o cenário para validar."
      );
    })
  );

  body.addEventListener(
    "input",
    () => {
      hasPendingChanges = true;
    }
  );

  depot.addEventListener(
    "change",
    () => {
      hasPendingChanges = true;
    }
  );

  params.addEventListener(
    "input",
    () => {
      hasPendingChanges = true;
    }
  );

  renderInitialParameters(
    params,
    PARAMETER_FIELDS,
    config
  );

  renderScenario();

  renderInitialDashboard(
    root,
    graph.vertices.length,
    config.iterations
  );

  renderState();

  status("Pronto para executar.");

  return {
    getState: () => engine.getState()
  };
}

try {
  if (typeof document !== "undefined") {
    initializeApp();
  }
} catch (error) {
  if (typeof document !== "undefined") {
    const banner = document.getElementById(
      "initialization-error"
    );

    if (banner) {
      banner.hidden = false;
      banner.textContent = error.message;
    }
  }

  console.error(
    "Falha ao iniciar a interface:",
    error
  );
}
