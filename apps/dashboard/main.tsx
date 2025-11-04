import "./styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import VibesMissionControl from "./components/VibesMissionControl";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <VibesMissionControl />
  </React.StrictMode>
);
