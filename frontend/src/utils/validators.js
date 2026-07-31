// src/utils/validators.js — Centralised validation rules for forms

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
const fullNameRegex = /^[A-Za-zÀ-ÿ' -]{2,60}$/;

export function normalizeWhatsAppNumber(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits[2])) return `+${digits}`;
  return null;
}

export function validateWhatsAppNumber(raw) {
  if (!raw || !raw.trim()) return "WhatsApp number is required.";
  const normalized = normalizeWhatsAppNumber(raw.trim());
  if (!normalized) return "Please enter a valid WhatsApp number.";
  return null;
}

export function passwordStrengthErrors(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password || "")) errors.push("one uppercase letter");
  if (!/[a-z]/.test(password || "")) errors.push("one lowercase letter");
  if (!/\d/.test(password || "")) errors.push("one number");
  if (!/[^A-Za-z0-9]/.test(password || "")) errors.push("one special character");
  return errors;
}

export function validateLogin({ email, password }) {
  const normalized = email ? email.trim() : "";
  if (!normalized) return { field: "email", message: "Email is required." };
  if (!emailRegex.test(normalized)) return { field: "email", message: "Please enter a valid email address." };
  if (!password) return { field: "password", message: "Password is required." };
  if (password.length < 6) return { field: "password", message: "Password must be at least 6 characters." };
  return null;
}

export function validateSignup({ fullName, username, email, whatsappNumber, password, confirmPassword, acceptTerms }) {
  const normalized = email ? email.trim() : "";
  const trimmedName = fullName ? fullName.trim() : "";

  if (!trimmedName) return { field: "fullName", message: "Full name is required." };
  if (!fullNameRegex.test(trimmedName)) return { field: "fullName", message: "Name may only contain letters, spaces, hyphens (2–60 chars)." };

  if (!username || !username.trim()) return { field: "username", message: "Username is required." };
  if (!usernameRegex.test(username.trim())) return { field: "username", message: "Username must be 3-20 characters." };

  if (!normalized) return { field: "email", message: "Email is required." };
  if (!emailRegex.test(normalized)) return { field: "email", message: "Please enter a valid email address." };

  const waError = validateWhatsAppNumber(whatsappNumber);
  if (waError) return { field: "whatsappNumber", message: waError };

  if (!password) return { field: "password", message: "Password is required." };
  const pwErrors = passwordStrengthErrors(password);
  if (pwErrors.length > 0) return { field: "password", message: `Password needs ${pwErrors.join(", ")}.` };

  if (password !== confirmPassword) return { field: "confirmPassword", message: "Passwords do not match." };
  if (!acceptTerms) return { field: "acceptTerms", message: "Please accept the terms to continue." };

  return null;
}
