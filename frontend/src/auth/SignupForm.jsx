import { MdOutlineEmail, MdLockOutline, MdPersonOutline, MdBadge } from "react-icons/md";
import InputField from "./InputField";
import PasswordStrength from "./PasswordStrength";
import Spinner from "./Spinner";

export default function SignupForm({
  form,
  onChange,
  onSubmit,
  loading,
  success,
  fieldError,
}) {
  return (
    <form
      className="auth-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <InputField
        label="Full Name"
        name="fullName"
        value={form.fullName}
        onChange={onChange}
        placeholder="John Smith"
        autoComplete="name"
        icon={<MdPersonOutline size={16} />}
        error={fieldError?.field === "fullName" ? fieldError.message : ""}
      />

      <InputField
        label="Username"
        name="username"
        value={form.username}
        onChange={onChange}
        placeholder="johndoe"
        autoComplete="username"
        icon={<MdBadge size={16} />}
        hint="3-20 characters, letters, numbers, or underscore"
        error={fieldError?.field === "username" ? fieldError.message : ""}
      />

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
        placeholder="Create a strong password"
        autoComplete="new-password"
        icon={<MdLockOutline size={16} />}
        error={fieldError?.field === "password" ? fieldError.message : ""}
      />
      <PasswordStrength password={form.password} />

      <InputField
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        value={form.confirmPassword}
        onChange={onChange}
        placeholder="Repeat your password"
        autoComplete="new-password"
        icon={<MdLockOutline size={16} />}
        error={fieldError?.field === "confirmPassword" ? fieldError.message : ""}
      />

      <label className="checkbox-row checkbox-row-large">
        <input
          type="checkbox"
          name="acceptTerms"
          checked={form.acceptTerms}
          onChange={onChange}
        />
        <span>
          I accept the{" "}
          <button type="button" className="link-button">
            Terms of Service
          </button>
        </span>
      </label>
      {fieldError?.field === "acceptTerms" && (
        <div className="field-error" role="alert">
          {fieldError.message}
        </div>
      )}

      <button
        type="submit"
        className={`auth-button ${loading ? "is-loading" : ""}`}
        disabled={loading}
      >
        {loading ? (
          <>
            <Spinner />
            <span>Creating account…</span>
          </>
        ) : success ? (
          <>
            <span className="check-mark">✓</span>
            <span>Account Ready</span>
          </>
        ) : (
          "Create Account"
        )}
      </button>
    </form>
  );
}
