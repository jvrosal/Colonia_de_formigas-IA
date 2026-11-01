/** Etapa 01 — tabela exclusivamente informativa derivada da matriz real. */
function display(value) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

export function renderDistanceMatrix(container, graph) {
  container.replaceChildren();

  const table = document.createElement("table");
  table.className = "distance-table";
  table.setAttribute("aria-label", "Matriz de distâncias euclidianas entre os vértices");
  const caption = document.createElement("caption");
  caption.className = "sr-only";
  caption.textContent = "Matriz de distâncias euclidianas; diagonal igual a zero";
  table.append(caption);

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.scope = "col";
  corner.textContent = "De / Para";
  headerRow.append(corner);
  graph.vertices.forEach(({ id }) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = id;
    headerRow.append(th);
  });
  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  graph.distanceMatrix.forEach((row, i) => {
    const tr = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = graph.vertices[i].id;
    tr.append(label);
    row.forEach((distance, j) => {
      const td = document.createElement("td");
      td.textContent = display(distance);
      td.title = `Distância ${graph.vertices[i].id} → ${graph.vertices[j].id}: ${distance}`;
      if (i === j) td.className = "distance-diagonal";
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  container.append(table);
}
