import { useState } from "react";
import toast from "react-hot-toast";
import { MdOutlineEmail } from "react-icons/md";
import { useAuth } from "../AuthContext";
import InputField from "./InputField";
import Spinner from "./Spinner";

/**
 * ForgotPassword — standalone screen inside the auth card.
 * Shown when the user clicks "Forgot Password?" on the login form.
 * onBack() returns to sign-in.
 */
export default function ForgotPassword({ onBack }) {
  const { forgotPassword } = useAuth();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalized = email.trim();

    if (!normalized) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const { error } = await forgotPassword(normalized);
    setLoading(false);

    if (error) {
      toast.error("Could not send the reset link. Please try again.");
    } else {
      setSent(true);
      toast.success("Reset link sent — check your inbox.");
    }
  };

  return (
    <div className="forgot-screen">
      {/* Back link */}
      <button type="button" className="forgot-back" onClick={onBack}>
        ← Back to Sign In
      </button>

      <div className="forgot-header">
        <div className="forgot-icon" aria-hidden="true">🔑</div>
        <h2 className="forgot-title">Reset your password</h2>
        <p className="forgot-sub">
          Enter the email linked to your account and we'll send you a reset link.
        </p>
      </div>

      {sent ? (
        <div className="forgot-success">
          <span className="forgot-success-icon">✉️</span>
          <p>
            A reset link was sent to <strong>{email.trim()}</strong>.
            <br />
            Check your inbox (and spam folder, just in case).
          </p>
          <button type="button" className="auth-button" style={{ marginTop: 16 }} onClick={onBack}>
            Back to Sign In
          </button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <InputField
            label="Email"
            name="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            icon={<MdOutlineEmail size={16} />}
          />

          <button
            type="submit"
            className={`auth-button ${loading ? "is-loading" : ""}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner />
                <span>Sending…</span>
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
