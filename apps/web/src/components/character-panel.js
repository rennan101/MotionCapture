export function renderCharacterPanel({ defaultCharacter, setDefaultCharacter, setCustomCharacterUrl, setCharacterLoaded }) {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "12px";

  // Templates section
  const templatesSection = document.createElement("div");

  const templatesLabel = document.createElement("label");
  templatesLabel.style.fontSize = "12px";
  templatesLabel.style.color = "#a1a1aa";
  templatesLabel.style.fontWeight = "500";
  templatesLabel.style.display = "block";
  templatesLabel.style.marginBottom = "6px";
  templatesLabel.textContent = "Personagens padrão (Templates)";
  templatesSection.appendChild(templatesLabel);

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "1fr 1fr";
  grid.style.gap = "8px";

  const ericBtn = document.createElement("button");
  ericBtn.type = "button";
  ericBtn.style.padding = "8px 12px";
  ericBtn.style.borderRadius = "8px";
  ericBtn.style.border = defaultCharacter === "eric" ? "1px solid #6366f1" : "1px solid #3f3f46";
  ericBtn.style.background = defaultCharacter === "eric" ? "rgba(99, 102, 241, 0.2)" : "#18181b";
  ericBtn.style.color = defaultCharacter === "eric" ? "#e0e7ff" : "#d4d4d8";
  ericBtn.style.cursor = "pointer";
  ericBtn.style.fontWeight = "500";
  ericBtn.style.fontSize = "13px";
  ericBtn.style.display = "flex";
  ericBtn.style.alignItems = "center";
  ericBtn.style.justifyContent = "center";
  ericBtn.style.gap = "6px";
  ericBtn.innerHTML = "<span>🧍</span> Eric (T-Pose)";
  ericBtn.addEventListener("click", () => setDefaultCharacter("eric"));
  grid.appendChild(ericBtn);

  const carlaBtn = document.createElement("button");
  carlaBtn.type = "button";
  carlaBtn.style.padding = "8px 12px";
  carlaBtn.style.borderRadius = "8px";
  carlaBtn.style.border = defaultCharacter === "carla" ? "1px solid #6366f1" : "1px solid #3f3f46";
  carlaBtn.style.background = defaultCharacter === "carla" ? "rgba(99, 102, 241, 0.2)" : "#18181b";
  carlaBtn.style.color = defaultCharacter === "carla" ? "#e0e7ff" : "#d4d4d8";
  carlaBtn.style.cursor = "pointer";
  carlaBtn.style.fontWeight = "500";
  carlaBtn.style.fontSize = "13px";
  carlaBtn.style.display = "flex";
  carlaBtn.style.alignItems = "center";
  carlaBtn.style.justifyContent = "center";
  carlaBtn.style.gap = "6px";
  carlaBtn.innerHTML = "<span>🧍‍♀️</span> Carla (T-Pose)";
  carlaBtn.addEventListener("click", () => setDefaultCharacter("carla"));
  grid.appendChild(carlaBtn);

  templatesSection.appendChild(grid);
  container.appendChild(templatesSection);

  // Custom upload divider + button
  const customSection = document.createElement("div");
  customSection.style.borderTop = "1px solid #27272a";
  customSection.style.paddingTop = "10px";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".fbx,.glb,.gltf";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomCharacterUrl(url);
      setCharacterLoaded(true);
    }
  });

  const uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.style.width = "100%";
  uploadBtn.style.padding = "8px 12px";
  uploadBtn.style.borderRadius = "8px";
  uploadBtn.style.border = defaultCharacter === "custom" ? "1px solid #10b981" : "1px dashed #52525b";
  uploadBtn.style.background = defaultCharacter === "custom" ? "rgba(16, 185, 129, 0.15)" : "#18181b";
  uploadBtn.style.color = defaultCharacter === "custom" ? "#a7f3d0" : "#a1a1aa";
  uploadBtn.style.cursor = "pointer";
  uploadBtn.style.fontSize = "12px";
  uploadBtn.style.fontWeight = "500";
  uploadBtn.textContent = defaultCharacter === "custom" ? "✓ Modelo FBX customizado ativo" : "+ Importar FBX do computador";
  uploadBtn.addEventListener("click", () => fileInput.click());
  customSection.appendChild(uploadBtn);
  container.appendChild(customSection);

  // Hint
  const hint = document.createElement("div");
  hint.style.background = "#18181b";
  hint.style.padding = "8px 10px";
  hint.style.borderRadius = "6px";
  hint.style.fontSize = "11px";
  hint.style.color = "#71717a";
  hint.style.lineHeight = "1.4";
  hint.textContent = "💡 Se nenhum modelo for importado, o Motion Forge carrega automaticamente o template padrão selecionado.";
  container.appendChild(hint);

  return container;
}
