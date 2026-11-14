
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
  readParameterInputs,
  syncDepotOptions
} from "./ui/forms.js";

import {
  renderInitialGraphPreview,
  formatPheromone
} from "./ui/graph-view.js";

import { renderConvergenceChart } from "./ui/convergence-chart.js";

import {
  renderDistanceMatrix
} from "./ui/distance-matrix.js";

import {
  renderInitialDashboard
} from "./ui/dashboard.js";

import {
  renderInitialProbabilityPreview
} from "./ui/probability-preview.js";

import { initTabs } from "./ui/tabs.js";

const format = value => value.toLocaleString(
  "pt-BR",
  { maximumFractionDigits: 4 }
);

const formatSig = value => value.toLocaleString(
  "pt-BR",
  { maximumSignificantDigits: 6 }
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

  function syncExecutionControls(state = engine.getSummary()) {
  const stateLabel = state.finished
    ? "Finalizada"
    : running
      ? "Executando"
      : state.iteration
        ? "Pausada"
        : "Não iniciada";

  get("simulation-state").textContent = hasPendingChanges
    ? `${stateLabel} — alterações pendentes`
    : stateLabel;

  get("run-button").disabled =
    running || state.finished || hasPendingChanges;

  get("pause-button").disabled = !running;

  get("step-button").disabled =
    running || state.finished || hasPendingChanges;

  get("params-note").textContent = hasPendingChanges
    ? "Alterações pendentes. Clique em Aplicar e reiniciar para continuar."
    : "Alterações em vértices ou parâmetros exigem reinício da simulação.";
}

  function markPendingChanges() {
    const wasRunning = running;
    if (wasRunning) stop();

    hasPendingChanges = true;
    syncExecutionControls();

    status(wasRunning
      ? "Simulação pausada: alterações pendentes. Clique em Aplicar e reiniciar."
      : "Alterações pendentes. Clique em Aplicar e reiniciar para continuar."
    );
  }

  let uiHistory = [];
  let viewEngine = null;
  let historyBody = null;

  function clearHistoryViews() {
    uiHistory = [];
    historyBody = null;

    get("history-container").replaceChildren(
      el("p", "Nenhuma iteração ainda. Clique em Executar ou em Avançar uma iteração.")
    );

    get("logs-container").replaceChildren(
      el("p", "O registro de cada iteração aparece aqui depois que ela termina.")
    );
  }

  function createHistoryTable() {
    const table = el("table");
    table.className = "distance-table history-table";

    const head = el("thead");
    const header = el("tr");

    for (const text of [
      "Iteração",
      "Menor",
      "Melhor rota da iteração",
      "Média",
      "Melhor acumulada"
    ]) {
      header.append(el("th", text));
    }

    head.append(header);
    historyBody = el("tbody");
    table.append(head, historyBody);

    const wrapper = el("div");
    wrapper.className = "distance-table-wrap";
    wrapper.append(table);

    get("history-container").replaceChildren(wrapper);
  }

  function appendHistoryRows(entries) {
    if (!entries.length) return;
    if (!historyBody) createHistoryTable();

    for (const item of entries) {
      const row = el("tr");

      for (const value of [
        item.iteration,
        format(item.iterationBestLength),
        item.iterationBestRoute.join(" → "),
        format(item.meanLength),
        format(item.bestLength)
      ]) {
        row.append(el("td", String(value)));
      }

      historyBody.append(row);
    }
  }

  function buildLogContent(entry) {
    const fragment = document.createDocumentFragment();

    const antsDetails = el("details");
    antsDetails.open = entry.antRoutes.length <= 10;
    antsDetails.append(
      el("summary", `Rotas das ${entry.antRoutes.length} formiga(s)`)
    );

    const list = el("ol");

    entry.antRoutes.forEach((ant, index) => {
      const isBest = ant.length === entry.iterationBestLength;
      list.append(
        el(
          "li",
          `Formiga ${index + 1}: ${ant.route.join(" → ")}, comprimento ${format(ant.length)}${isBest ? " (menor da iteração)" : ""}`
        )
      );
    });

    antsDetails.append(list);
    fragment.append(antsDetails);

    const ant = entry.antRoutes[0];

    fragment.append(
      el(
        "p",
        `Construção da rota da Formiga 1 (w = τ^α × (1/d)^β; p = w / Σw):`
      )
    );

    for (const step of ant.steps) {
      if (step.returnToDepot) {
        fragment.append(
          el(
            "p",
            `Em ${step.currentId}, todos os vértices foram visitados. Retorno obrigatório: ${step.currentId} → ${step.chosenId}.`
          )
        );
        continue;
      }

      const candidates = step.candidates
        .map(candidate =>
          `${candidate.id} (τ ${formatPheromone(candidate.pheromone)}; d ${format(candidate.distance)}; w ${formatSig(candidate.weight)}; p ${format(candidate.probability * 100)}%)`
        )
        .join("; ");

      fragment.append(
        el(
          "p",
          `Em ${step.currentId}, candidatos: ${candidates}. Valor sorteado ${formatSig(step.randomValue)}, escolhido ${step.chosenId}.`
        )
      );
    }

    fragment.append(
      el("p", `Comprimento da rota da Formiga 1: ${format(ant.length)}`)
    );

    const edgeDetails = el("details");

    edgeDetails.append(
      el("summary", "Evaporação e depósitos por aresta")
    );

    for (const edge of entry.edgeLogs) {
      edgeDetails.append(
        el(
          "p",
          `${edge.fromId}–${edge.toId}: anterior ${formatPheromone(edge.previous)}; após evaporação ${formatPheromone(edge.afterEvaporation)}; depósito ${formatPheromone(edge.totalDeposit)}; final ${formatPheromone(edge.final)}`
        )
      );
    }

    fragment.append(edgeDetails);
    return fragment;
  }

  function appendLogEntries(entries) {
    if (!entries.length) return;

    const container = get("logs-container");

    if (uiHistory.length === entries.length) {
      container.replaceChildren();
    }

    for (const entry of entries) {
      const details = el("details");
      details.className = "iteration-log";

      details.append(
        el(
          "summary",
          `Iteração ${entry.iteration}: menor ${format(entry.iterationBestLength)}, média ${format(entry.meanLength)}`
        )
      );

      details.addEventListener("toggle", () => {
        if (details.open && !details.dataset.loaded) {
          details.dataset.loaded = "true";
          details.append(buildLogContent(entry));
        }
      });

      container.append(details);
    }
  }

  function syncHistory(summary) {
    if (
      engine !== viewEngine ||
      summary.historyLength < uiHistory.length
    ) {
      clearHistoryViews();
      viewEngine = engine;
    }

    if (summary.historyLength > uiHistory.length) {
      const entries = engine.getHistorySince(uiHistory.length);
      uiHistory.push(...entries);
      appendHistoryRows(entries);
      appendLogEntries(entries);
    }

    get("history-count").textContent =
      `${uiHistory.length} registro(s)`;

    get("logs-count").textContent =
      `${uiHistory.length} iteração(ões)`;
  }

  function renderState(state = engine.getSummary()) {
    syncHistory(state);

    get("current-iteration").textContent =
      `${state.iteration} / ${config.iterations}`;

    const progress = get("iteration-progress");
    progress.max = config.iterations;
    progress.value = state.iteration;

    get("best-distance").textContent =
      state.bestLength === null
        ? "Ainda não calculada"
        : format(state.bestLength);

    get("best-distance").classList.toggle(
      "is-empty",
      state.bestLength === null
    );

    const latest = uiHistory.at(-1);

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
        : "Ainda não calculada";

    syncExecutionControls(state);

    const { maxPheromone } = renderInitialGraphPreview(
      get("graph-preview"),
      graph,
      state.pheromoneMatrix,
      state.bestRoute
    );

    let scaleText =`Escala atual: espessura máxima = τ ${formatPheromone(maxPheromone)}.`;

    if (latest) {
      const previousMax = Math.max(
        ...latest.edgeLogs.map(edge => edge.previous)
      );

      const changed =
        Math.abs(maxPheromone - previousMax) >
        1e-3 * Math.max(maxPheromone, previousMax);

      if (changed) {
        const direction = maxPheromone < previousMax
          ? "diminuiu"
          : "aumentou";

        scaleText +=
          ` A escala mudou: o τ máximo ${direction} em relação à ` +
          `iteração anterior (τ ${formatPheromone(previousMax)}). Uma aresta pode ` +
          `parecer mais grossa mesmo tendo perdido feromônio; consulte ` +
          `os valores numéricos.`;
      } else {
        scaleText += " Escala igual à da iteração anterior.";
      }
    }

    get("pheromone-scale").textContent = scaleText;
    get("pheromone-max").textContent =`τ ${formatPheromone(maxPheromone)}`;

    renderConvergenceChart(
      get("convergence-chart"),
      uiHistory
    );
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
      `${graph.vertices.length} vértices e ${expectedEdgeCount(graph.vertices.length)} arestas`;

    const example = [
      graph.depotId,
      ...graph.vertices
        .filter(v => v.id !== graph.depotId)
        .map(v => v.id),
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

  function canContinue() {
    if (!hasPendingChanges) return true;

    status("Alterações pendentes. Clique em Aplicar e reiniciar antes de executar.");
    return false;
  }

  function tick() {
    if (!running) return;

    safe(() => {
      const summary = engine.stepSummary();

      if (summary.finished) {
        stop();
        renderState(summary);
        status("Simulação concluída.");
      } else {
        renderState(summary);
        timer = setTimeout(tick, 180);
      }
    });
  }

  get("run-button").addEventListener(
    "click",
    () => safe(() => {
      if (!canContinue() || engine.getSummary().finished) return;

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
      if (!canContinue()) return;

      stop();
      renderState(engine.stepSummary());
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
        viewEngine = null;
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

      markPendingChanges();

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

      markPendingChanges();
    })
  );

  body.addEventListener(
    "input",
    event => {
      // Renomear um vértice atualiza a lista de depósitos na hora.
      if (event.target.dataset.field === "id") {
        syncDepotOptions(body, depot);
      }

      markPendingChanges();
    }
  );

  depot.addEventListener(
    "change",
    () => {
      syncDepotOptions(body, depot);
      markPendingChanges();
    }
  );

  params.addEventListener("input", markPendingChanges);

  initTabs(root.querySelector(".tabs"));

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
