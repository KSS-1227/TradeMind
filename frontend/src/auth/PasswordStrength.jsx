export default function PasswordStrength({ password }) {
  const score =
    Number(password.length >= 8) +
    Number(/[A-Z]/.test(password)) +
    Number(/[a-z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));

  const getLabel = () => {
    if (score <= 2) return { label: "Weak", tone: "weak" };
    if (score <= 4) return { label: "Medium", tone: "medium" };
    return { label: "Strong", tone: "strong" };
  };

  const status = getLabel();

  if (!password) return null;

  return (
    <div className="password-strength" aria-live="polite">
      <div className="password-strength-header">
        <span>Password strength</span>
        <span className={`strength-badge ${status.tone}`}>{status.label}</span>
      </div>
      <div className="strength-bar">
        <div className={`strength-fill ${status.tone}`} style={{ width: `${(score / 5) * 100}%` }} />
      </div>
    </div>
  );
}
