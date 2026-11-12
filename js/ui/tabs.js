/**
 * Abas acessíveis (padrão WAI-ARIA): clique ou setas esquerda/direita,
 * Home e End. Os painéis ocultos continuam no documento.
 */
export function initTabs(tablist) {
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

  function select(tab, focus = false) {
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;

      const panel = document.getElementById(
        item.getAttribute("aria-controls")
      );

      if (panel) panel.hidden = !selected;
    }

    if (focus) tab.focus();
  }

  tablist.addEventListener("click", event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tab);
  });

  tablist.addEventListener("keydown", event => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;

    const moves = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1
    };

    if (event.key in moves) {
      event.preventDefault();
      select(tabs[moves[event.key]], true);
    }
  });
}
