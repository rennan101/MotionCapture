import type { ReactNode } from "react";

const SECTION: React.CSSProperties = {
  background: "#1a1a1f",
  border: "1px solid #333",
  borderRadius: 10,
  overflow: "hidden",
};

const HEADER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  borderBottom: "1px solid #333",
};

const TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "#b9b9c4",
};

const ACTIONS: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const BODY: React.CSSProperties = {
  padding: "10px 12px",
};

interface PanelProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Panel({ title, children, actions }: PanelProps) {
  return (
    <section style={SECTION}>
      <div style={HEADER}>
        <h2 style={TITLE}>{title}</h2>
        {actions && <div style={ACTIONS}>{actions}</div>}
      </div>
      <div style={BODY}>{children}</div>
    </section>
  );
}
