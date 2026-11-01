/**
 * Etapas 00–02 — cenário e configurações iniciais.
 * O núcleo probabilístico existe, mas ainda não há execução de rotas.
 */
export const INITIAL_VERTICES = Object.freeze([
  Object.freeze({ id: "A", x: 100, y: 100 }),
  Object.freeze({ id: "B", x: 300, y: 100 }),
  Object.freeze({ id: "C", x: 450, y: 300 }),
  Object.freeze({ id: "D", x: 300, y: 500 }),
  Object.freeze({ id: "E", x: 100, y: 400 }),
]);

export const INITIAL_DEPOT_ID = "A";

export const DEFAULT_PARAMETERS = Object.freeze({
  ants: 10,
  iterations: 30,
  alpha: 1,
  beta: 2,
  evaporationPercent: 50,
  initialPheromone: 1,
  depositConstant: 14,
  seed: 42,
});

/**
 * Metadados para a interface. As validações de vértices e depósito são feitas na Etapa 01.
 * A edição da interface e as validações dos controles serão ativadas na Etapa 06.
 */
export const PARAMETER_FIELDS = Object.freeze([
  Object.freeze({ key: "ants", label: "Número de formigas", min: 1, max: 100, step: 1, integer: true }),
  Object.freeze({ key: "iterations", label: "Número de iterações", min: 1, max: 200, step: 1, integer: true }),
  Object.freeze({ key: "alpha", label: "Feromônio (α)", min: 0, max: 5, step: "any" }),
  Object.freeze({ key: "beta", label: "Distância (β)", min: 0, max: 5, step: "any" }),
  Object.freeze({ key: "evaporationPercent", label: "Evaporação (ρ)", min: 0, max: 90, step: "any", suffix: "%" }),
  Object.freeze({ key: "initialPheromone", label: "Feromônio inicial (τ₀)", min: 0.01, max: 100, step: "any" }),
  Object.freeze({ key: "depositConstant", label: "Constante de depósito (Q)", min: 0.01, max: 10000, step: "any" }),
  Object.freeze({ key: "seed", label: "Semente aleatória", step: 1, integer: true }),
]);
