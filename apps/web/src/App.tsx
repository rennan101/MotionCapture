import "./App.css";
import { useAppStore } from "./store.ts";
import { Viewport } from "./components/Viewport.tsx";
import { StatusBar } from "./components/StatusBar.tsx";

export default function App() {
  const layout = useAppStore((s) => s.layout);

  return (
    <div style={layout}>
      <header style={HEADER}>
        <h1>Motion Forge</h1>
        <StatusBar />
      </header>
      <main style={MAIN}>
        <Viewport />
      </main>
    </div>
  );
}

const HEADER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "12px 16px",
  borderBottom: "1px solid #333",
};

const MAIN: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  minHeight: "calc(100vh - 56px)",
};
