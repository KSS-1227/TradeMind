import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../AuthContext";
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
  password: "",
  confirmPassword: "",
  acceptTerms: false,
  rememberMe: false,
};

export default function AuthPage() {
  const { signUp, signIn } = useAuth();
  const [mode,       setMode]       = useState("signin"); // "signin" | "signup" | "forgot"
  const [form,       setForm]       = useState(initialForm);
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [fieldError, setFieldError] = useState(null); // { field, message }

  const normalizedEmail = useMemo(() => form.email.trim(), [form.email]);

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

  // Navigate to the dedicated forgot-password screen
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
      toast.error(validationError.message, { id: "validation" });
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
          email:    normalizedEmail,
          password: form.password,
        });

        if (!result.success) {
          toast.error(result.error?.message || "Could not create your account right now.");
        } else if (result.data?.user && !result.data.session) {
          setSuccess(true);
          toast.success("Account created! Check your email to confirm.", { duration: 6000 });
        } else {
          setSuccess(true);
          toast.success("Account created. Welcome to TradeMind!");
        }
      } else {
        // Pass rememberMe so signIn can honour the persistence preference
        const { error } = await signIn(normalizedEmail, form.password, form.rememberMe);
        if (error) {
          toast.error("Wrong email or password. Please try again.");
        } else {
          setSuccess(true);
          toast.success("Welcome back!");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Forgot-password is its own screen — no inline handler needed here
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
