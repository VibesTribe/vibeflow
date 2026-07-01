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
import "./styles/hexagon-overview.css";
import "./styles/kanban-board.css";
import "./styles/project-intake.css";
import React from "react";
import { createRoot } from "react-dom/client";
import VibesMissionControl from "./components/VibesMissionControl";
import HexagonOverview from "./components/HexagonOverview";

/**
 * Simple hash-based routing:
 *   #/                     → Hexagon overview (all projects)
 *   #/p/:slug              → Project dashboard
 *   No hash / legacy       → Project dashboard (backward compat)
 */

function getRoute(): { view: "overview" | "dashboard"; slug?: string } {
  const hash = window.location.hash.replace(/^#/, "");
  const match = hash.match(/^\/p\/([\w-]+)/);
  if (match) {
    return { view: "dashboard", slug: match[1] };
  }
  if (hash === "/" || hash === "") {
    return { view: "overview" };
  }
  // Default to overview for safety
  return { view: "overview" };
}

function App() {
  const [route, setRoute] = React.useState(getRoute());

  React.useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigateToDashboard = React.useCallback((slug: string) => {
    window.location.hash = `/p/${slug}`;
  }, []);

  const navigateToOverview = React.useCallback(() => {
    window.location.hash = "/";
  }, []);

  if (route.view === "overview") {
    return (
      <HexagonOverview
        onSelectProject={navigateToDashboard}
        selectedSlug={route.slug}
      />
    );
  }

  return (
    <VibesMissionControl
      key={route.slug}
      initialProjectSlug={route.slug}
      onBackToOverview={navigateToOverview}
    />
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
