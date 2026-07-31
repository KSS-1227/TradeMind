import React from "react";
import { Card } from "../ui/Card";

export function AgentLoader({ step = 0 }) {
  const steps = [
    "Research Agent — fetching price + news",
    "Signal Agent — running ML model",
    "Explainer Agent — generating reasons",
  ];

  return (
    <Card style={{ marginBottom: "14px" }}>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span>🤖</span> Analysing with AI Agents...
      </div>
      {steps.map((s, i) => {
        const isDone = i < step;
        const isActive = i === step;

        return (
          <div
            key={i}
            className={`agent-step ${isDone ? "done" : isActive ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "7px 0",
              fontSize: "12.5px",
              color: isDone
                ? "var(--color-teal)"
                : isActive
                ? "var(--text-primary)"
                : "var(--text-muted)",
              transition: "color 0.3s ease",
            }}
          >
            {isDone ? (
              <span className="dot-done" />
            ) : isActive ? (
              <span className="dot-pulse" />
            ) : (
              <span className="dot-idle" />
            )}
            <span>{s}</span>
          </div>
        );
      })}
    </Card>
  );
}
