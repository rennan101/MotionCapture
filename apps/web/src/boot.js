import { createApp } from "./app.js";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Motion Forge: #app element not found");
}

createApp(root);
