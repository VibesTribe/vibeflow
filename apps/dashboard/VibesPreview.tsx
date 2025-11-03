// apps/dashboard/VibesPreview.tsx
import React from "react";
import VibesMissionControl from "./components/VibesMissionControl";

export default function VibesPreview() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (view === "vibes") {
    return <VibesMissionControl />;
  }

  return (
    <div style={{ padding: 24, color: "#cbd5e1", background: "#0a0d17" }}>
      <h1 style={{ fontSize: 16, fontWeight: 600 }}>Vibeflow</h1>
      <p style={{ fontSize: 12, opacity: 0.8 }}>
        Append <code>?view=vibes</code> to the URL to open Mission Control.
      </p>
    </div>
  );
}
