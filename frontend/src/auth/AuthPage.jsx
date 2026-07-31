import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth, mapSupabaseAuthError } from "../context/AuthContext";
import AuthLayout from "./AuthLayout";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import ForgotPassword from "./ForgotPassword";
import { validateLogin, validateSignup } from "./validators";
import "../auth.css";

const initialForm = {
  fullName: "",
  username: "",
  email: "",
  whatsappNumber: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
  rememberMe: false,
};

export default function AuthPage() {
  const { signUp, signIn } = useAuth();

  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState(null);

  const normalizedEmail = useMemo(() => form.email.trim().toLowerCase(), [form.email]);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (fieldError) setFieldError(null);
  };

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setFieldError(null);
    setSuccess(false);
  };

  const handleForgotPassword = () => {
    setMode("forgot");
    setFieldError(null);
  };

  const handleSubmit = async () => {
    const validationError =
      mode === "signup"
        ? validateSignup({ ...form, email: normalizedEmail })
        : validateLogin({ email: normalizedEmail, password: form.password });

    if (validationError) {
      setFieldError(validationError);
      toast.error(validationError.message);
      return;
    }

    setLoading(true);
    setFieldError(null);
    setSuccess(false);

    try {
      if (mode === "signup") {
        const result = await signUp({
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          email: normalizedEmail,
          password: form.password,
          whatsappNumber: form.whatsappNumber.trim(),
        });

        if (!result.success) {
          const friendly = mapSupabaseAuthError(result.error);
          toast.error(friendly);
          return;
        }

        setSuccess(true);
      } else {
        const { error } = await signIn(normalizedEmail, form.password, form.rememberMe);

        if (error) {
          const friendly = mapSupabaseAuthError(error);
          toast.error(friendly);
          return;
        }

        setSuccess(true);
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
