/**
 * vibeflow-meta:
 * id: apps/dashboard/components/AgentView.tsx
 * task: REBUILD-V5
 * regions:
 *   - id: agent-view
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:agent-view */
import React from "react";
import { AgentSnapshot } from "@core/types";

interface AgentViewProps {
  agents: AgentSnapshot[];
}

const AgentView: React.FC<AgentViewProps> = ({ agents }) => {
  if (agents.length === 0) {
    return <div>No agents reporting status.</div>;
  }

  return (
    <div className="feed-list">
      {agents.map((agent) => (
        <div className="feed-item" key={agent.id}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <strong>{agent.name}</strong>
            <span className="status-chip">{agent.status}</span>
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>{agent.summary}</div>
          <div style={{ marginTop: 6, fontSize: "0.7rem", opacity: 0.6 }}>
            Last heartbeat: {new Date(agent.updatedAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentView;
/* @endeditable */
