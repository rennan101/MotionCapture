const OPTIONS = [
  { id: "auto", label: "Auto", available: true },
  { id: "mediapipe", label: "MediaPipe", available: true },
  { id: "rtmpose", label: "RTMPose", available: false },
  { id: "nvidia", label: "NVIDIA RTX", available: false },
  { id: "custom", label: "Modelo personalizado", available: false },
];

export function renderProviderSelector({ value, onSelect, providers, activeProvider }) {
  const resolvedActiveId = activeProvider ?? "auto";

  const fieldset = document.createElement("fieldset");
  fieldset.className = "mf-provider-selector";
  fieldset.style.border = "none";
  fieldset.style.padding = "0";
  fieldset.style.margin = "0";

  const legend = document.createElement("legend");
  legend.className = "mf-provider-legend";
  legend.textContent = "Motor de captura";
  fieldset.appendChild(legend);

  const group = document.createElement("div");
  group.className = "mf-provider-group";

  OPTIONS.forEach((option) => {
    const effective = providers?.find((p) => p.id === option.id);
    const effectiveAvailable =
      effective === undefined ? option.available : effective.available;
    const isChecked = value === option.id;
    const isCurrentlyActive =
      value === "auto" ? resolvedActiveId === option.id : value === option.id;
    const disabled = !effectiveAvailable && option.id !== value;

    const label = document.createElement("label");
    label.className = "mf-provider-label";
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";
    label.style.padding = "6px 8px";
    label.style.borderRadius = "6px";
    label.style.background = "#26262b";
    label.style.cursor = disabled ? "not-allowed" : "pointer";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "provider";
    radio.value = option.id;
    radio.checked = isChecked;
    radio.disabled = disabled;
    radio.style.accentColor = "#7fe3b4";
    radio.addEventListener("change", () => {
      if (!radio.disabled) onSelect(option.id);
    });

    const caption = document.createElement("span");
    caption.className = "mf-provider-caption";
    caption.style.fontSize = "13px";
    caption.style.color = "#e7e7e7";
    caption.textContent = option.label;

    label.appendChild(radio);
    label.appendChild(caption);

    if (!effectiveAvailable) {
      const unavailable = document.createElement("span");
      unavailable.className = "mf-provider-unavailable";
      unavailable.style.marginLeft = "auto";
      unavailable.style.fontSize = "11px";
      unavailable.style.color = "#f0888a";
      unavailable.textContent = "não disponível";
      label.appendChild(unavailable);
    }

    if (isCurrentlyActive) {
      const activeInd = document.createElement("span");
      activeInd.className = "mf-provider-active-indicator";
      activeInd.style.marginLeft = "auto";
      activeInd.style.fontSize = "10px";
      activeInd.style.color = "#7fe3b4";
      activeInd.style.fontWeight = "600";
      activeInd.textContent = "ativo";
      label.appendChild(activeInd);
    }

    group.appendChild(label);
  });

  fieldset.appendChild(group);
  return fieldset;
}
