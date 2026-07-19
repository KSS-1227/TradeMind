export default function AuthLayout({ mode, onSwitchMode, children }) {
  const isForgot = mode === "forgot";

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-block">
            <div className="brand-mark">T</div>
            <div>
              <h1>TradeMind</h1>
              <p>
                {isForgot
                  ? "Password recovery"
                  : mode === "signin"
                  ? "Sign in to your account"
                  : "Create an account"}
              </p>
            </div>
          </div>

          {/* Hide tab switcher on the forgot-password screen */}
          {!isForgot && (
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                className={`tab ${mode === "signin" ? "active" : ""}`}
                onClick={() => onSwitchMode("signin")}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={`tab ${mode === "signup" ? "active" : ""}`}
                onClick={() => onSwitchMode("signup")}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
