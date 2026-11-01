/**
 * Etapa 02 — gerador pseudoaleatório determinístico Mulberry32.
 * Todos os sorteios do Ant System deverão usar UMA instância por execução.
 * O fluxo da interface não pode compartilhar/consumir essa instância.
 *
 * A semente é um inteiro seguro de JavaScript; a sequência utiliza os seus
 * 32 bits menos significativos (normalização módulo 2^32).
 */
export function createSeededRandom(seed) {
  if (!Number.isSafeInteger(seed)) {
    throw new TypeError("A semente deve ser um número inteiro seguro.");
  }
  const originalState = seed >>> 0;
  let state = originalState;

  return Object.freeze({
    next() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    reset() {
      state = originalState;
    },
    getState() {
      return state;
    },
  });
}
