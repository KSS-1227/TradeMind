import { useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

/**
 * InputField
 *
 * Floating-label behaviour (Stripe / Vercel / Linear pattern):
 *   Empty + not focused  → label sits centred, acts as placeholder
 *   Focused OR has value → label floats to top-left (small, uppercase)
 *   Focused              → label is teal
 *   Has value, not focused → label stays floated but turns muted grey
 *
 * Props:
 *   icon      — React node for the left icon
 *   hint      — helper text shown below the field
 *   error     — error string; replaces hint when present
 */
export default function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  onKeyDown,
  hint,
  icon,
}) {
  const [focused,    setFocused]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [autofilled, setAutofilled] = useState(false);

  const isPassword = type === "password";
  const inputType  = isPassword ? (showPass ? "text" : "password") : type;
  const hasValue   = Boolean(value && value.length > 0);
  // Float the label if: focused, has a React-controlled value, OR browser autofilled
  const isFloated  = focused || hasValue || autofilled;

  return (
    <div className={`field-group ${error ? "field-group--error" : ""}`}>
      <div
        className={[
          "input-wrapper",
          focused          ? "input-wrapper--focused" : "",
          error            ? "input-wrapper--error"   : "",
        ].filter(Boolean).join(" ")}
      >
        {/* ── Left icon ── */}
        {icon && (
          <span
            className={`input-icon ${focused ? "input-icon--active" : ""}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        {/* ── Floating label ── */}
        {label && (
          <label
            htmlFor={name}
            className={[
              "floating-label",
              icon            ? "floating-label--with-icon"  : "",
              isFloated       ? "floating-label--active"     : "",
              /* When floated but NOT focused, use the muted colour variant */
              isFloated && !focused ? "floating-label--filled" : "",
            ].filter(Boolean).join(" ")}
          >
            {label}
          </label>
        )}

        {/* ── Input ── */}
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          /* Detect browser autofill — Chrome fires a CSS animation on
             :-webkit-autofill which we can catch here to float the label
             before React's value state catches up.                      */
          onAnimationStart={(e) => {
            if (e.animationName === "autofillStart") setAutofilled(true);
            if (e.animationName === "autofillEnd")   setAutofilled(false);
          }}
          placeholder={focused ? placeholder : ""}
          autoComplete={autoComplete}
          className={[
            "auth-input",
            icon       ? "auth-input--with-icon"   : "",
            isPassword ? "auth-input--with-toggle" : "",
          ].filter(Boolean).join(" ")}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${name}-error` : hint ? `${name}-hint` : undefined
          }
        />

        {/* ── Password show / hide toggle ── */}
        {isPassword && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "Hide password" : "Show password"}
            aria-pressed={showPass}
          >
            {showPass
              ? <AiOutlineEyeInvisible size={20} />
              : <AiOutlineEye size={20} />}
          </button>
        )}
      </div>

      {/* Hint — only shown when there's no error */}
      {hint && !error && (
        <div id={`${name}-hint`} className="field-hint">
          {hint}
        </div>
      )}

      {/* Error */}
      {error && (
        <div id={`${name}-error`} className="field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
