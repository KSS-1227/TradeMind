import { MdOutlineEmail, MdLockOutline } from "react-icons/md";
import InputField from "./InputField";
import Spinner from "./Spinner";

export default function LoginForm({
  form,
  onChange,
  onSubmit,
  onForgotPassword,
  loading,
  success,
  fieldError,
}) {
  return (
    <form
      className="auth-form"
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <InputField
        label="Email"
        name="email"
        type="email"
        value={form.email}
        onChange={onChange}
        placeholder="you@example.com"
        autoComplete="email"
        icon={<MdOutlineEmail size={16} />}
        error={fieldError?.field === "email" ? fieldError.message : ""}
      />

      <InputField
        label="Password"
        name="password"
        type="password"
        value={form.password}
        onChange={onChange}
        placeholder="Enter your password"
        autoComplete="current-password"
        icon={<MdLockOutline size={16} />}
        error={fieldError?.field === "password" ? fieldError.message : ""}
      />

      <div className="auth-row">
        <label className="checkbox-row">
          <input
            type="checkbox"
            name="rememberMe"
            checked={form.rememberMe}
            onChange={onChange}
          />
          <span>Remember Me</span>
        </label>
        <button type="button" className="link-button" onClick={onForgotPassword}>
          Forgot Password?
        </button>
      </div>

      <button
        type="submit"
        className={`auth-button ${loading ? "is-loading" : ""}`}
        disabled={loading}
      >
        {loading ? (
          <>
            <Spinner />
            <span>Signing in…</span>
          </>
        ) : success ? (
          <>
            <span className="check-mark">✓</span>
            <span>Welcome Back</span>
          </>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}
