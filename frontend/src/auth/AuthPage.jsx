import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../AuthContext";
import { mapSupabaseAuthError } from "../AuthContext";
import AuthLayout from "./AuthLayout";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import ForgotPassword from "./ForgotPassword";
import { validateLogin, validateSignup } from "./validators";
import "../auth.css";

const initialForm = {
  fullName:        "",
  username:        "",
  email:           "",
  password:        "",
  confirmPassword: "",
  acceptTerms:     false,
  rememberMe:      false,
};

export default function AuthPage() {
  const { signUp, signIn } = useAuth();

  const [mode,       setMode]       = useState("signin"); // "signin" | "signup" | "forgot"
  const [form,       setForm]       = useState(initialForm);
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [fieldError, setFieldError] = useState(null); // { field, message }

  const normalizedEmail = useMemo(() => form.email.trim().toLowerCase(), [form.email]);

  // ── Form field change ──────────────────────────────────────
  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (fieldError) setFieldError(null);
  };

  // ── Tab / mode switch ──────────────────────────────────────
  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setFieldError(null);
    setSuccess(false);
  };

  const handleForgotPassword = () => {
    setMode("forgot");
    setFieldError(null);
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    // 1. Client-side validation first
    const validationError =
      mode === "signup"
        ? validateSignup({ ...form, email: normalizedEmail })
        : validateLogin({ email: normalizedEmail, password: form.password });

    if (validationError) {
      setFieldError(validationError);
      toast.error(validationError.message, { id: "validation" });
      return;
    }

    setLoading(true);
    setFieldError(null);
    setSuccess(false);

    try {
      // ── Sign Up ──────────────────────────────────────────
      if (mode === "signup") {
        const result = await signUp({
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          email:    normalizedEmail,
          password: form.password,
        });

        if (!result.success) {
          // Map the raw Supabase error to a human-readable message
          const friendly = mapSupabaseAuthError(result.error);
          console.error("[AuthPage] Signup failed:", {
            code:    result.error?.code,
            status:  result.error?.status,
            message: result.error?.message,
          });
          toast.error(friendly, { duration: 6000 });
          return;
        }

        setSuccess(true);

        if (result.data?.session) {
          // Email confirmation disabled — user is immediately authenticated
          toast.success("Account created. Welcome to TradeMind!", { duration: 5000 });
        } else {
          // Email confirmation enabled — prompt the user to check inbox
          toast.success(
            "Account created! Check your email to confirm your address, then sign in.",
            { duration: 8000 }
          );
        }

      // ── Sign In ──────────────────────────────────────────
      } else {
        const { error } = await signIn(normalizedEmail, form.password, form.rememberMe);

        if (error) {
          const friendly = mapSupabaseAuthError(error);
          console.error("[AuthPage] SignIn failed:", {
            code:    error.code,
            status:  error.status,
            message: error.message,
          });
          toast.error(friendly, { duration: 5000 });
          return;
        }

        setSuccess(true);
        toast.success("Welcome back!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode={mode} onSwitchMode={handleSwitchMode}>
      {mode === "forgot" ? (
        <ForgotPassword onBack={() => handleSwitchMode("signin")} />
      ) : mode === "signin" ? (
        <LoginForm
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onForgotPassword={handleForgotPassword}
          loading={loading}
          success={success}
          fieldError={fieldError}
        />
      ) : (
        <SignupForm
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          loading={loading}
          success={success}
          fieldError={fieldError}
        />
      )}
    </AuthLayout>
  );
}
