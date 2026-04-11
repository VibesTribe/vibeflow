// apps/dashboard/VibesPreview.tsx
// ✅ Clean TypeScript version for GitHub Pages preview
// Loads full Mission Control dashboard when ?view=vibes is present

import React from "react";
import VibesMissionControl from "./components/VibesMissionControl";

export default function VibesPreview() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (view === "vibes") {
    return <VibesMissionControl />;
  }

  return (
    <div
      style={{
        padding: 24,
        color: "#cbd5e1",
        background: "#0a0d17",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        Vibeflow
      </h1>
      <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>
        Append <code>?view=vibes</code> to the URL to open Mission Control.
      </p>
      <p style={{ fontSize: 12, opacity: 0.6, marginTop: 12 }}>
        Example:{" "}
        <a
          href="?view=vibes"
          style={{ color: "#38bdf8", textDecoration: "underline" }}
        >
          https://vibestribe.github.io/vibeflow/?view=vibes
        </a>
      </p>
    </div>
  );
}
