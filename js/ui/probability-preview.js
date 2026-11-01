/** Etapa 02 — demonstração somente de leitura dos cálculos de UMA escolha. */
import {
  createPheromoneMatrix, previewTransition,
} from "../core/ant-system.js";
import { createSeededRandom } from "../core/random.js";

function formatNumber(value, digits = 6) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}
function make(tag, className = "", content = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content) element.textContent = content;
  return element;
}

/** Inspeciona o estado inicial: ainda NÃO representa uma iteração de ACO. */
export function renderInitialProbabilityPreview(container, graph, parameters) {
  container.replaceChildren();
  const tau = createPheromoneMatrix(graph.vertices.length, parameters.initialPheromone);
  const rng = createSeededRandom(parameters.seed); // instância EXCLUSIVA de demonstração
  const { candidates, choice } = previewTransition(
    graph, tau, graph.depotId, [graph.depotId], parameters.alpha, parameters.beta, rng,
  );

  const section = make("section", "probability-preview");
  section.setAttribute("aria-labelledby", "probability-heading");
  const heading = make("div", "math-preview-heading");
  const title = make("h4", "", "Feromônio inicial e escolha probabilística");
  title.id = "probability-heading";
  heading.append(title, make("span", "read-only-tag", "Prévia · sem iterações"));
  section.append(heading);
  section.append(make("p", "helper-text", `Todos os pares de vértices começam com τ₀ = ${formatNumber(parameters.initialPheromone)}. A diagonal não possui feromônio.`));

  const matrixWrap = make("div", "distance-table-wrap probability-matrix-wrap");
  const table = make("table", "distance-table probability-matrix");
  const caption = make("caption", "sr-only", "Matriz inicial de feromônios");
  const thead = make("thead");
  const topRow = make("tr");
  topRow.append(make("th", "", "τ₀"));
  for (const vertex of graph.vertices) topRow.append(make("th", "", vertex.id));
  thead.append(topRow);
  const tbody = make("tbody");
  tau.forEach((row, i) => {
    const tr = make("tr");
    const th = make("th", "", graph.vertices[i].id);
    th.scope = "row";
    tr.append(th);
    row.forEach((value, j) => {
      const td = make("td", i === j ? "distance-diagonal" : "", formatNumber(value));
      td.dataset.pheromone = String(value);
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(caption, thead, tbody);
  matrixWrap.append(table);
  section.append(matrixWrap);

  const choiceTitle = make("h5", "probability-subtitle", `Próximo passo a partir de ${graph.depotId}`);
  section.append(choiceTitle);
  section.append(make("p", "helper-text", "Pesos w = τ^α × (1/d)^β. Os candidatos são os vértices ainda não visitados; a seleção ocorre por sorteio proporcional, não pelo maior peso."));

  const choicesWrap = make("div", "distance-table-wrap");
  const choicesTable = make("table", "distance-table probability-table");
  const choiceCaption = make("caption", "sr-only", `Probabilidades de sair do depósito ${graph.depotId}`);
  const choiceHead = make("thead");
  const header = make("tr");
  for (const label of ["Destino", "Distância", "Feromônio", "Peso (w)", "Probabilidade"]) {
    const th = make("th", "", label);
    th.scope = "col";
    header.append(th);
  }
  choiceHead.append(header);
  const choiceBody = make("tbody");
  for (const item of candidates) {
    const tr = make("tr", item.id === choice.candidate.id ? "probability-selected" : "");
    tr.dataset.candidate = item.id;
    tr.dataset.probability = String(item.probability);
    for (const value of [item.id, formatNumber(item.distance, 4), formatNumber(item.pheromone),
      formatNumber(item.weight, 10), `${formatNumber(item.probability * 100, 3)}%`]) {
      tr.append(make("td", "", value));
    }
    choiceBody.append(tr);
  }
  choicesTable.append(choiceCaption, choiceHead, choiceBody);
  choicesWrap.append(choicesTable);
  section.append(choicesWrap);

  const description = make("p", "preview-choice");
  description.id = "probability-sample";
  description.dataset.selectedId = choice.candidate.id;
  description.dataset.randomValue = String(choice.randomValue);
  description.textContent = `Exemplo de sorteio (semente ${parameters.seed}): ${graph.depotId} → ${choice.candidate.id} · valor sorteado ${formatNumber(choice.randomValue, 8)}. Esta demonstração usa um gerador separado e NÃO executa uma rota ou consome a semente da futura simulação.`;
  section.append(description);
  container.append(section);
}
