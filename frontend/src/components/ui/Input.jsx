import React from "react";
import { Search, AlertCircle, CheckCircle2 } from "lucide-react";

/* Standard Text Input Component */
export function Input({
  label,
  error,
  success,
  icon: IconComponent,
  disabled = false,
  className = "",
  containerStyle = {},
  style = {},
  ...props
}) {
  return (
    <div style={{ width: "100%", ...containerStyle }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: "6px",
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {IconComponent && (
          <div
            style={{
              position: "absolute",
              left: "12px",
              color: "var(--text-muted)",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <IconComponent size={16} />
          </div>
        )}

        <input
          disabled={disabled}
          style={{
            width: "100%",
            background: "var(--bg-elevated)",
            border: `1.5px solid ${
              error
                ? "var(--danger)"
                : success
                ? "var(--success)"
                : "var(--border)"
            }`,
            borderRadius: "var(--radius-input)",
            padding: IconComponent ? "10px 36px 10px 36px" : "10px 14px",
            color: "var(--text-primary)",
            fontSize: "14px",
            fontFamily: "var(--font-sans)",
            outline: "none",
            boxSizing: "border-box",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "text",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            ...style,
          }}
          onFocus={e => {
            e.target.style.borderColor = error ? "var(--danger)" : "var(--color-teal)";
            e.target.style.boxShadow   = error
              ? "0 0 0 3px rgba(239,68,68,0.12)"
              : "0 0 0 3px rgba(0,201,167,0.12)";
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? "var(--danger)" : success ? "var(--success)" : "var(--border)";
            e.target.style.boxShadow   = "none";
          }}
          className={`ui-input ${className}`.trim()}
          {...props}
        />

        {error ? (
          <div style={{ position: "absolute", right: "12px", color: "var(--danger)" }}>
            <AlertCircle size={16} />
          </div>
        ) : success ? (
          <div style={{ position: "absolute", right: "12px", color: "var(--success)" }}>
            <CheckCircle2 size={16} />
          </div>
        ) : null}
      </div>

      {error && (
        <div style={{ fontSize: "11.5px", color: "var(--danger)", marginTop: "4px" }}>
          {error}
        </div>
      )}
    </div>
  );
}

/* SearchBar Component */
export function SearchBar({ placeholder = "Search stocks, signals, indicators...", ...props }) {
  return <Input icon={Search} placeholder={placeholder} {...props} />;
}

/* Textarea Component */
export function Textarea({ label, error, rows = 4, disabled = false, style = {}, ...props }) {
  return (
    <div style={{ width: "100%" }}>
      {label && (
        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
          {label}
        </label>
      )}
      <textarea
        disabled={disabled}
        rows={rows}
        style={{
          width: "100%",
          background: "var(--bg-surface)",
          border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
          borderRadius: "var(--radius-input)",
          padding: "10px 14px",
          color: "var(--text-primary)",
          fontSize: "14px",
          fontFamily: "var(--font-sans)",
          outline: "none",
          boxSizing: "border-box",
          resize: "vertical",
          opacity: disabled ? 0.5 : 1,
          ...style,
        }}
        {...props}
      />
      {error && <div style={{ fontSize: "11.5px", color: "var(--danger)", marginTop: "4px" }}>{error}</div>}
    </div>
  );
}

/* Dropdown Component */
export function Dropdown({ label, options = [], value, onChange, disabled = false, error, ...props }) {
  return (
    <div style={{ width: "100%" }}>
      {label && (
        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: "100%",
          background: "var(--bg-surface)",
          border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
          borderRadius: "var(--radius-input)",
          padding: "10px 14px",
          color: "var(--text-primary)",
          fontSize: "14px",
          outline: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value || opt} value={opt.value || opt} style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
            {opt.label || opt}
          </option>
        ))}
      </select>
      {error && <div style={{ fontSize: "11.5px", color: "var(--danger)", marginTop: "4px" }}>{error}</div>}
    </div>
  );
}

/* Checkbox Component */
export function Checkbox({ label, checked, onChange, disabled = false, ...props }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ width: 16, height: 16, accentColor: "var(--color-teal)", cursor: "pointer" }}
        {...props}
      />
      {label && <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>}
    </label>
  );
}

/* Switch Component */
export function Switch({ label, checked, onChange, disabled = false }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <div
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 12,
          background: checked ? "var(--color-teal)" : "var(--bg-elevated)",
          border: "1px solid var(--border)",
          position: "relative",
          transition: "background-color 0.2s ease",
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: checked ? "#04241D" : "var(--text-secondary)",
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            transition: "left 0.2s ease",
          }}
        />
      </div>
      {label && <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>}
    </label>
  );
}

/* Radio Component */
export function Radio({ label, name, value, checked, onChange, disabled = false }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ width: 16, height: 16, accentColor: "var(--color-teal)", cursor: "pointer" }}
      />
      {label && <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>}
    </label>
  );
}

/* Slider Component */
export function Slider({ label, min = 0, max = 100, step = 1, value, onChange, disabled = false }) {
  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{label}</span>
          <span className="mono" style={{ fontSize: 12, color: "var(--color-teal)" }}>{value}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{ width: "100%", accentColor: "var(--color-teal)", cursor: disabled ? "not-allowed" : "pointer" }}
      />
    </div>
  );
}
