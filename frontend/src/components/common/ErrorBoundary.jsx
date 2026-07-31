import React, { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/Button";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            margin: "20px 0",
          }}
        >
          <AlertTriangle size={36} color="var(--color-danger)" style={{ marginBottom: "12px" }} />
          <h2 style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "8px" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
            {this.state.error?.message || "An unhandled UI exception occurred."}
          </p>
          <Button onClick={() => window.location.reload()} variant="primary">
            Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
