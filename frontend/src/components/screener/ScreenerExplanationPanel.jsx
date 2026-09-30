import React from "react";
import { BrainCircuit, Sparkles } from "lucide-react";

export function ScreenerExplanationPanel({ explanation }) {
  if (!explanation) return null;

  const drivers = explanation.strengths || [];
  const risks = explanation.risks || [];

  return (
    <section className="sc-explanation" aria-label="Prediction explanation">
      <div className="sc-explanation-header">
        <div className="sc-explanation-title">
          <BrainCircuit size={15} color="var(--color-teal)" />
          <span>TRADEMIND AI EXPLANATION</span>
        </div>
        <span className={explanation.is_fallback ? "sc-explanation-source is-fallback" : "sc-explanation-source"}>
          {explanation.is_fallback ? "TradeMind AI · Model data" : <><Sparkles size={12} /> TradeMind AI</>}
        </span>
      </div>

      <p className="sc-explanation-summary">{explanation.summary}</p>

      {drivers.length > 0 && (
        <div className="sc-explanation-group">
          <h4>Supporting evidence</h4>
          <ul>{drivers.map((driver, index) => <li key={index}>{driver}</li>)}</ul>
        </div>
      )}

      {risks.length > 0 && (
        <div className="sc-explanation-group sc-explanation-risks">
          <h4>Limitations and risks</h4>
          <ul>{risks.map((risk, index) => <li key={index}>{risk}</li>)}</ul>
        </div>
      )}

      {explanation.confidence_note && (
        <p className="sc-explanation-confidence">{explanation.confidence_note}</p>
      )}
    </section>
  );
}

export default ScreenerExplanationPanel;
