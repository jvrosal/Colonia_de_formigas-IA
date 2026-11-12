
const SVG_NS = "http://www.w3.org/2000/svg";

const WIDTH = 760;
const HEIGHT = 300;
const MARGIN = { top: 20, right: 24, bottom: 48, left: 96 };

function svgNode(name, attributes = {}, text = "") {
  const node = document.createElementNS(SVG_NS, name);

  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }

  if (text !== "") node.textContent = text;
  return node;
}

function format(value) {
  return Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 2
  });
}

function makePath(values, x, y) {
  return values.map((value, index) => {
    const command = index === 0 ? "M" : "L";
    return `${command} ${x(index)} ${y(value)}`;
  }).join(" ");
}

export function renderConvergenceChart(container, history) {
  container.replaceChildren();

  if (!Array.isArray(history) || history.length === 0) {
    const message = document.createElement("p");
    message.className = "helper-text";
    message.textContent = "O gráfico será preenchido após a primeira iteração.";
    container.append(message);
    return;
  }

  const bestValues = history.map(item => item.bestLength);
  const meanValues = history.map(item => item.meanLength);
  const allValues = [...bestValues, ...meanValues];

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const spread = rawMax - rawMin;
  const padding = spread === 0
    ? Math.max(rawMax * 0.08, 1)
    : spread * 0.12;

  const minY = Math.max(0, rawMin - padding);
  const maxY = rawMax + padding;

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = index => history.length === 1
    ? MARGIN.left + plotWidth / 2
    : MARGIN.left + (index / (history.length - 1)) * plotWidth;

  const y = value =>
    MARGIN.top + ((maxY - value) / (maxY - minY || 1)) * plotHeight;

  const svg = svgNode("svg", {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    role: "img",
    "aria-label": "Gráfico da melhor distância acumulada e da distância média por iteração"
  });

  const gridCount = 4;

  for (let i = 0; i <= gridCount; i++) {
    const value = minY + ((maxY - minY) * i) / gridCount;
    const positionY = y(value);

    svg.append(svgNode("line", {
      x1: MARGIN.left,
      y1: positionY,
      x2: WIDTH - MARGIN.right,
      y2: positionY,
      class: "chart-grid-line"
    }));

    svg.append(svgNode("text", {
      x: MARGIN.left - 10,
      y: positionY + 4,
      "text-anchor": "end",
      class: "chart-axis-label"
    }, format(value)));
  }

  const xTicks = Math.min(history.length, 6);
  const tickIndices = new Set();

  for (let i = 0; i < xTicks; i++) {
    const index = xTicks === 1
      ? 0
      : Math.round((i * (history.length - 1)) / (xTicks - 1));

    tickIndices.add(index);
  }

  for (const index of tickIndices) {
    svg.append(svgNode("text", {
      x: x(index),
      y: HEIGHT - 20,
      "text-anchor": "middle",
      class: "chart-axis-label"
    }, String(history[index].iteration)));
  }

  svg.append(svgNode("path", {
    d: makePath(meanValues, x, y),
    class: "chart-line chart-line--mean"
  }));

  svg.append(svgNode("path", {
    d: makePath(bestValues, x, y),
    class: "chart-line chart-line--best"
  }));

  history.forEach((item, index) => {
    svg.append(svgNode("circle", {
      cx: x(index),
      cy: y(item.bestLength),
      r: 3.5,
      class: "chart-point chart-point--best"
    }));

    if (history.length <= 30) {
      svg.append(svgNode("circle", {
        cx: x(index),
        cy: y(item.meanLength),
        r: 3,
        class: "chart-point chart-point--mean"
      }));
    }
  });

  svg.append(svgNode("text", {
    x: MARGIN.left + plotWidth / 2,
    y: HEIGHT - 2,
    "text-anchor": "middle",
    class: "chart-axis-title"
  }, "Iteração"));

  svg.append(svgNode("text", {
    x: 17,
    y: MARGIN.top + plotHeight / 2,
    transform: `rotate(-90 17 ${MARGIN.top + plotHeight / 2})`,
    "text-anchor": "middle",
    class: "chart-axis-title"
  }, "Distância"));

  container.append(svg);
}
