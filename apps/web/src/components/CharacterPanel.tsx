import React, { useRef } from "react";
import { useAppStore, type DefaultCharacter } from "../store";

export function CharacterPanel() {
  const defaultCharacter = useAppStore((s) => s.defaultCharacter);
  const setDefaultCharacter = useAppStore((s) => s.setDefaultCharacter);
  const setCustomCharacterUrl = useAppStore((s) => s.setCustomCharacterUrl);
  const setCharacterLoaded = useAppStore((s) => s.setCharacterLoaded);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomCharacterUrl(url);
      setCharacterLoaded(true);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label
          style={{
            fontSize: 12,
            color: "#a1a1aa",
            fontWeight: 500,
            display: "block",
            marginBottom: 6,
          }}
        >
          Personagens padrão (Templates)
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => setDefaultCharacter("eric")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: defaultCharacter === "eric" ? "1px solid #6366f1" : "1px solid #3f3f46",
              background: defaultCharacter === "eric" ? "rgba(99, 102, 241, 0.2)" : "#18181b",
              color: defaultCharacter === "eric" ? "#e0e7ff" : "#d4d4d8",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span>🧍</span> Eric (T-Pose)
          </button>
          <button
            type="button"
            onClick={() => setDefaultCharacter("carla")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: defaultCharacter === "carla" ? "1px solid #6366f1" : "1px solid #3f3f46",
              background: defaultCharacter === "carla" ? "rgba(99, 102, 241, 0.2)" : "#18181b",
              color: defaultCharacter === "carla" ? "#e0e7ff" : "#d4d4d8",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span>🧍‍♀️</span> Carla (T-Pose)
          </button>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #27272a", paddingTop: 10 }}>
        <input
          type="file"
          ref={fileInputRef}
          accept=".fbx,.glb,.gltf"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 8,
            border: defaultCharacter === "custom" ? "1px solid #10b981" : "1px dashed #52525b",
            background: defaultCharacter === "custom" ? "rgba(16, 185, 129, 0.15)" : "#18181b",
            color: defaultCharacter === "custom" ? "#a7f3d0" : "#a1a1aa",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {defaultCharacter === "custom" ? "✓ Modelo FBX customizado ativo" : "+ Importar FBX do computador"}
        </button>
      </div>

      <div
        style={{
          background: "#18181b",
          padding: "8px 10px",
          borderRadius: 6,
          fontSize: 11,
          color: "#71717a",
          lineHeight: 1.4,
        }}
      >
        💡 Se nenhum modelo for importado, o Motion Forge carrega automaticamente o template padrão selecionado.
      </div>
    </div>
  );
}
