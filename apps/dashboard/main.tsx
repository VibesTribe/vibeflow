import "./tokens.css";
// Modular CSS: one file per component, one @media block per file
import "./styles/base.css";
import "./styles/mission-root.css";
import "./styles/mission-header.css";
import "./styles/rails.css";
import "./styles/slice-hub.css";
import "./styles/slice-orbit.css";
import "./styles/agent-hangar.css";
import "./styles/agent-panel.css";
import "./styles/task-card.css";
import "./styles/review.css";
import "./styles/modals.css";
import "./styles/model-panel.css";
import "./styles/admin.css";
import "./styles/roi-panel.css";
import "./styles/mission-log.css";
import "./styles/chat.css";
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
