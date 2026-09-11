export function createPanel({ title, children, actions }) {
  const section = document.createElement("section");
  section.className = "mf-panel";

  const header = document.createElement("div");
  header.className = "mf-panel-header";

  const h2 = document.createElement("h2");
  h2.className = "mf-panel-title";
  h2.textContent = title;
  header.appendChild(h2);

  if (actions) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "mf-panel-actions";
    if (typeof actions === "string") {
      actionsDiv.textContent = actions;
    } else if (actions instanceof HTMLElement) {
      actionsDiv.appendChild(actions);
    } else if (Array.isArray(actions)) {
      actions.forEach((el) => actionsDiv.appendChild(el));
    }
    header.appendChild(actionsDiv);
  }

  section.appendChild(header);

  const body = document.createElement("div");
  body.className = "mf-panel-body";
  if (typeof children === "string") {
    body.innerHTML = children;
  } else if (children instanceof HTMLElement) {
    body.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach((el) => body.appendChild(el));
  }
  section.appendChild(body);

  return section;
}
