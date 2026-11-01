/**
 * Etapa 01 — validações puras dos dados do problema.
 * Nenhuma função altera os dados recebidos ou depende do navegador.
 */
export const MIN_VERTICES = 4;
export const MAX_VERTICES = 12;
export const MAX_COORDINATE = 1000;

function issue(code, message, field = null, index = null) {
  return { code, message, field, index };
}

function result(errors) {
  return { valid: errors.length === 0, errors };
}

/**
 * Tolerância exclusivamente contra erros de ponto flutuante (ex.: 0.29 * 100).
 * Não arredonda coordenadas nem aceita uma terceira casa decimal efetiva.
 */
export function hasAtMostTwoDecimals(value) {
  if (!Number.isFinite(value)) return false;
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) <= 8 * Number.EPSILON * Math.max(1, Math.abs(scaled));
}

/**
 * Retorna { valid, errors }. Cada erro contém code, message, field e index.
 * O mínimo padrão é 4; na verificação do cenário inicial, utilizar minVertices: 5.
 */
export function validateVertices(vertices, { minVertices = MIN_VERTICES, maxVertices = MAX_VERTICES } = {}) {
  const errors = [];

  if (!Array.isArray(vertices)) {
    return result([issue("vertices.type", "A lista de vértices deve ser um array.", "vertices")]);
  }
  if (vertices.length < minVertices || vertices.length > maxVertices) {
    errors.push(issue("vertices.count", `Cadastre entre ${minVertices} e ${maxVertices} vértices.`, "vertices"));
  }

  const ids = new Set();
  const coordinates = new Set();

  vertices.forEach((vertex, index) => {
    if (!vertex || typeof vertex !== "object" || Array.isArray(vertex)) {
      errors.push(issue("vertex.type", `Vértice na posição ${index + 1} inválido.`, "vertices", index));
      return;
    }

    const { id, x, y } = vertex;
    if (typeof id !== "string" || id.trim().length === 0) {
      errors.push(issue("vertex.id.required", `O vértice ${index + 1} precisa de um identificador não vazio.`, "id", index));
    } else if (id !== id.trim()) {
      errors.push(issue("vertex.id.whitespace", `O identificador do vértice ${index + 1} não pode iniciar ou terminar com espaços.`, "id", index));
    } else if (ids.has(id)) {
      errors.push(issue("vertex.id.duplicate", `O identificador "${id}" já está cadastrado.`, "id", index));
    } else {
      ids.add(id);
    }

    for (const [coordinateName, value] of [["x", x], ["y", y]]) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(issue("vertex.coordinate.finite", `A coordenada ${coordinateName} do vértice ${index + 1} deve ser um número finito.`, coordinateName, index));
      } else if (value < 0 || value > MAX_COORDINATE) {
        errors.push(issue("vertex.coordinate.range", `A coordenada ${coordinateName} do vértice ${index + 1} deve estar entre 0 e 1.000.`, coordinateName, index));
      } else if (!hasAtMostTwoDecimals(value)) {
        errors.push(issue("vertex.coordinate.precision", `A coordenada ${coordinateName} do vértice ${index + 1} deve ter no máximo duas casas decimais.`, coordinateName, index));
      }
    }

    // Verifica coincidência apenas entre coordenadas individuais válidas.
    const validCoordinate = (value) => typeof value === "number"
      && Number.isFinite(value) && value >= 0 && value <= MAX_COORDINATE && hasAtMostTwoDecimals(value);
    if (validCoordinate(x) && validCoordinate(y)) {
      const position = `${Math.round(x * 100)},${Math.round(y * 100)}`;
      if (coordinates.has(position)) {
        errors.push(issue("vertex.position.duplicate", `O vértice ${index + 1} possui coordenadas já utilizadas.`, "coordinates", index));
      } else {
        coordinates.add(position);
      }
    }
  });

  return result(errors);
}

/** Verifica apenas a seleção do depósito; chamar validateVertices separadamente. */
export function validateDepot(vertices, depotId) {
  if (!Array.isArray(vertices)) {
    return result([issue("depot.vertices", "A lista de vértices é inválida.", "depot")]);
  }
  if (typeof depotId !== "string" || depotId.trim() === "") {
    return result([issue("depot.required", "Selecione um depósito válido.", "depot")]);
  }
  if (!vertices.some((vertex) => vertex && vertex.id === depotId)) {
    return result([issue("depot.notFound", `O depósito "${depotId}" não corresponde a um vértice cadastrado.`, "depot")]);
  }
  return result([]);
}

/**
 * A rota inclui o depósito tanto no início quanto no final.
 * IDs de vértices são strings e cada entrega aparece uma única vez.
 */
export function validateRoute(route, vertices, depotId) {
  const errors = [];
  if (!Array.isArray(vertices) || !Array.isArray(route)) {
    return result([issue("route.type", "Rota e vértices devem ser arrays.", "route")]);
  }
  const vertexIds = vertices.map((vertex) => vertex?.id);
  if (new Set(vertexIds).size !== vertexIds.length || vertexIds.some((id) => typeof id !== "string")) {
    return result([issue("route.vertices", "O conjunto de vértices deve possuir identificadores únicos e válidos.", "vertices")]);
  }
  if (!vertexIds.includes(depotId)) {
    errors.push(issue("route.depot", "O depósito selecionado não pertence ao grafo.", "depot"));
  }
  if (route.length !== vertices.length + 1) {
    errors.push(issue("route.length", `A rota deve conter ${vertices.length + 1} posições, incluindo o depósito repetido no final.`, "route"));
  }
  if (route[0] !== depotId || route.at(-1) !== depotId) {
    errors.push(issue("route.endpoints", "A rota deve começar e terminar no depósito.", "route"));
  }

  const interior = route.slice(1, -1);
  const expected = vertexIds.filter((id) => id !== depotId);
  if (interior.includes(depotId)) {
    errors.push(issue("route.depot.repeated", "O depósito não pode aparecer no meio da rota.", "route"));
  }
  if (new Set(interior).size !== interior.length) {
    errors.push(issue("route.repeated", "Uma entrega não pode ser visitada mais de uma vez.", "route"));
  }
  if (interior.some((id) => !expected.includes(id))) {
    errors.push(issue("route.unknown", "A rota contém vértices desconhecidos ou indevidos.", "route"));
  }
  if (expected.some((id) => !interior.includes(id))) {
    errors.push(issue("route.missing", "A rota precisa visitar todas as entregas cadastradas.", "route"));
  }
  return result(errors);
}
