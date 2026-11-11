
/** Renderização dos campos de configuração. */

export function renderInitialVertices(tableBody, depotSelect, vertices, depotId) {
  tableBody.replaceChildren();
  depotSelect.replaceChildren();

  for (const vertex of vertices) {
    const row = document.createElement("tr");
    const idCell = document.createElement("td");
    const xCell = document.createElement("td");
    const yCell = document.createElement("td");
    const badgeCell = document.createElement("td");
    const dot = document.createElement("span");

    dot.className = vertex.id === depotId
      ? "vertex-mark vertex-mark--depot"
      : "vertex-mark";

    dot.setAttribute("aria-hidden", "true");
    idCell.append(dot, document.createTextNode(vertex.id));

    xCell.textContent = vertex.x.toLocaleString("pt-BR", {
      maximumFractionDigits: 2
    });

    yCell.textContent = vertex.y.toLocaleString("pt-BR", {
      maximumFractionDigits: 2
    });

    if (vertex.id === depotId) {
      const depotTag = document.createElement("span");
      depotTag.className = "table-tag";
      depotTag.textContent = "Depósito";
      badgeCell.append(depotTag);
    } else {
      badgeCell.textContent = "Entrega";
      badgeCell.className = "secondary-text";
    }

    row.append(idCell, xCell, yCell, badgeCell);
    tableBody.append(row);

    const option = document.createElement("option");
    option.value = vertex.id;
    option.textContent = `Vértice ${vertex.id}`;
    option.selected = vertex.id === depotId;
    depotSelect.append(option);
  }

  depotSelect.disabled = true;
}

export function renderInitialParameters(container, fields, parameters) {
  container.replaceChildren();

  for (const field of fields) {
    const wrapper = document.createElement("div");
    wrapper.className = "parameter-field";

    const label = document.createElement("label");
    const id = `parameter-${field.key}`;

    label.htmlFor = id;
    label.textContent = field.label;

    const inputShell = document.createElement("div");
    inputShell.className = "input-shell";

    const input = document.createElement("input");
    input.type = "number";
    input.id = id;
    input.name = field.key;
    input.value = parameters[field.key];
    input.step = field.step;

    if (field.min !== undefined) {
      input.min = String(field.min);
    }

    if (field.max !== undefined) {
      input.max = String(field.max);
    }

    input.disabled = false;
    input.setAttribute("aria-describedby", "params-note");

    inputShell.append(input);

    if (field.suffix) {
      const suffix = document.createElement("span");
      suffix.className = "input-suffix";
      suffix.textContent = field.suffix;
      inputShell.append(suffix);
    }

    wrapper.append(label, inputShell);
    container.append(wrapper);
  }
}

export function renderEditableVertices(
  tableBody,
  depotSelect,
  vertices,
  depotId
) {
  tableBody.replaceChildren();
  depotSelect.replaceChildren();

  for (const vertex of vertices) {
    const row = document.createElement("tr");

    for (const [field, value] of [
      ["id", vertex.id],
      ["x", vertex.x],
      ["y", vertex.y]
    ]) {
      const cell = document.createElement("td");
      const input = document.createElement("input");

      input.className = "vertex-input";
      input.dataset.field = field;
      input.value = value;
      input.required = true;

      if (field !== "id") {
        input.type = "number";
        input.min = "0";
        input.max = "1000";
        input.step = "0.01";
      }

      cell.append(input);
      row.append(cell);
    }

    const type = document.createElement("td");
    type.textContent = vertex.id === depotId
      ? "Depósito"
      : "Entrega";

    row.append(type);

    const action = document.createElement("td");
    const remove = document.createElement("button");

    remove.type = "button";
    remove.className = "btn btn-remove";
    remove.textContent = "Remover";
    remove.dataset.remove = vertex.id;

    action.append(remove);
    row.append(action);
    tableBody.append(row);

    const option = document.createElement("option");
    option.value = vertex.id;
    option.textContent = `Vértice ${vertex.id}`;
    option.selected = vertex.id === depotId;

    depotSelect.append(option);
  }

  depotSelect.disabled = false;
}

export function readVertexInputs(tableBody) {
  return Array.from(
    tableBody.querySelectorAll("tr"),
    row => {
      const value = field =>
        row.querySelector(`[data-field="${field}"]`).value;

      return {
        id: value("id"),
        x: value("x").trim() === ""
          ? NaN
          : Number(value("x")),
        y: value("y").trim() === ""
          ? NaN
          : Number(value("y"))
      };
    }
  );
}

export function readParameterInputs(container, fields) {
  return Object.fromEntries(
    fields.map(field => {
      const input = container.querySelector(
        `[name="${field.key}"]`
      );

      if (!input || input.value.trim() === "") {
        throw new Error(`Preencha ${field.label}.`);
      }

      if (!input.checkValidity()) {
        throw new Error(`Valor inválido em ${field.label}.`);
      }

      return [field.key, Number(input.value)];
    })
  );
}
