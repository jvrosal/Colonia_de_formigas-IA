
// DOM mínimo para testar eventos e renderização sem navegador ou dependências.
class Elemento {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toLowerCase();
    this.ownerDocument = ownerDocument;
    this.parentElement = null;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this._text = "";
    this._value = "";
    this.className = "";
    this.disabled = false;
    this.selected = false;
    this.hidden = false;

    this.classList = {
      add: name => this._setClass(name, true),
      remove: name => this._setClass(name, false),
      toggle: (name, force) => {
        const active = force ??
          !this.className.split(/\s+/).includes(name);
        this._setClass(name, active);
        return active;
      },
      contains: name =>
        this.className.split(/\s+/).includes(name)
    };
  }

  _setClass(name, active) {
    const values = new Set(
      this.className.split(/\s+/).filter(Boolean)
    );

    if (active) {
      values.add(name);
    } else {
      values.delete(name);
    }

    this.className = [...values].join(" ");
  }

  set textContent(text) {
    this.replaceChildren();
    this._text = String(text);
  }

  get textContent() {
    return this._text +
      this.children.map(child => child.textContent).join("");
  }

  set value(value) {
    const text = String(value);

    if (this.tagName === "select") {
      for (const option of this.children) {
        option.selected = option.value === text;
      }
    } else {
      this._value = text;
    }
  }

  get value() {
    if (this.tagName === "select") {
      return this.children.find(option => option.selected)?.value ??
        this.children[0]?.value ??
        "";
    }

    return this._value;
  }

  get selectedIndex() {
    if (this.tagName !== "select") return -1;

    const selected = this.children.findIndex(
      option => option.selected
    );

    return selected < 0 && this.children.length
      ? 0
      : selected;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));

    if (name === "class") {
      this.className = String(value);
    }

    if (name === "id") {
      this.id = String(value);
    }

    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(
        /-([a-z])/g,
        (_, c) => c.toUpperCase()
      );

      this.dataset[key] = String(value);
    }
  }

  getAttribute(name) {
    if (name === "class") return this.className;
    if (name === "id") return this.id ?? null;

    return this.attributes.get(name) ?? null;
  }

  append(...nodes) {
    for (let node of nodes) {
      if (typeof node === "string") {
        node = this.ownerDocument.createTextNode(node);
      }

      if (node.tagName === "#fragment") {
        for (const child of [...node.children]) {
          this.append(child);
        }
        continue;
      }

      if (node.parentElement) {
        const siblings = node.parentElement.children;
        siblings.splice(siblings.indexOf(node), 1);
      }

      node.parentElement = this;
      this.children.push(node);
    }
  }

  replaceChildren(...nodes) {
    for (const child of this.children) {
      child.parentElement = null;
    }

    this.children = [];
    this._text = "";
    this.append(...nodes);
  }

  matches(selector) {
    if (selector.startsWith(".")) {
      return this.classList.contains(selector.slice(1));
    }

    const match =
      /^(?:([a-z][\w-]*)?)\[([\w-]+)(?:="([^"]*)")?\]$/i.exec(selector);

    if (match) {
      const [, tag, attribute, expected] = match;

      const value = attribute.startsWith("data-")
        ? this.dataset[attribute.slice(5)]
        : this[attribute] ?? this.getAttribute(attribute);

      return (
        (!tag || this.tagName === tag.toLowerCase()) &&
        value !== undefined &&
        (expected === undefined || String(value) === expected)
      );
    }

    return this.tagName === selector.toLowerCase();
  }

  querySelectorAll(selector) {
    const result = [];

    const visit = node => {
      for (const child of node.children) {
        if (child.matches(selector)) {
          result.push(child);
        }

        visit(child);
      }
    };

    visit(this);
    return result;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  closest(selector) {
    let current = this;

    while (current) {
      if (current.matches(selector)) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  addEventListener(type, callback) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(callback);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event) {
    if (event.type === "click" && this.disabled) {
      return false;
    }

    const target = event.target ?? this;
    let current = this;

    while (current) {
      for (const callback of current.listeners.get(event.type) ?? []) {
        callback({
          ...event,
          target,
          currentTarget: current
        });
      }

      if (event.bubbles === false) {
        break;
      }

      current = current.parentElement;
    }

    return true;
  }

  checkValidity() {
    if (this.required && this.value.trim() === "") {
      return false;
    }

    if (this.type !== "number") {
      return true;
    }

    const value = Number(this.value);

    if (!Number.isFinite(value)) {
      return false;
    }

    if (this.min !== undefined && value < Number(this.min)) {
      return false;
    }

    if (this.max !== undefined && value > Number(this.max)) {
      return false;
    }

    if (this.step && this.step !== "any") {
      const step = Number(this.step);
      const base = Number(this.min ?? 0);
      const intervals = (value - base) / step;

      if (
        Math.abs(intervals - Math.round(intervals)) > 1e-7
      ) {
        return false;
      }
    }

    return true;
  }
}

export class DocumentoSimulado {
  constructor() {
    this.ids = new Map();
  }

  createElement(tag) {
    return new Elemento(tag, this);
  }

  createElementNS(_namespace, tag) {
    return this.createElement(tag);
  }

  createTextNode(text) {
    const node = this.createElement("#text");
    node.textContent = text;
    return node;
  }

  createDocumentFragment() {
    return this.createElement("#fragment");
  }

  getElementById(id) {
    return this.ids.get(id) ?? null;
  }

  querySelector(_selector) {
    return null; // A navegação entre abas não faz parte dos casos deste teste.
  }

  adicionarId(id, tag = "div") {
    const element = this.createElement(tag);
    element.id = id;
    this.ids.set(id, element);
    return element;
  }
}

export function criarDocumentoSimulado() {
  const doc = new DocumentoSimulado();

  const ids = [
    "vertices-body",
    "depot-select",
    "parameter-fields",
    "app-status",
    "initialization-error",
    "history-container",
    "logs-container",
    "history-count",
    "logs-count",
    "current-iteration",
    "iteration-progress",
    "best-distance",
    "iteration-distance",
    "average-distance",
    "best-route",
    "simulation-state",
    "run-button",
    "pause-button",
    "step-button",
    "reset-button",
    "params-note",
    "graph-preview",
    "pheromone-scale",
    "pheromone-max",
    "convergence-chart",
    "distance-matrix",
    "probability-preview",
    "vertex-count",
    "graph-summary",
    "example-route",
    "example-distance",
    "apply-scenario",
    "add-vertex"
  ];

  for (const id of ids) {
    const tag = id === "depot-select"
      ? "select"
      : id === "vertices-body"
        ? "tbody"
        : id === "graph-preview"
          ? "svg"
          : id === "iteration-progress"
            ? "progress"
            : "div";

    doc.adicionarId(id, tag);
  }

  return doc;
}
