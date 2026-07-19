// auth/validators.js — centralised validation rules for LoginForm & SignupForm

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Full name: letters (including accented), spaces, hyphens, apostrophes.
 * Min 2, max 60 characters.  No digits.
 */
const fullNameRegex = /^[A-Za-zÀ-ÿ' -]{2,60}$/;

/**
 * Indian mobile number validator.
 * Accepts: 9876543210 | 919876543210 | +919876543210
 * Normalises to E.164: +919876543210
 */
export function normalizeWhatsAppNumber(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits[2])) return `+${digits}`;
  return null; // invalid
}

export function validateWhatsAppNumber(raw) {
  if (!raw || !raw.trim()) return "WhatsApp number is required.";
  const normalized = normalizeWhatsAppNumber(raw.trim());
  if (!normalized) return "Please enter a valid WhatsApp number.";
  return null; // valid
}

/**
 * Strong password — must contain:
 *   • at least 8 characters
 *   • one uppercase letter
 *   • one lowercase letter
 *   • one digit
 *   • one special character
 */
export function passwordStrengthErrors(password) {
  const errors = [];
  if (password.length < 8)             errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password))         errors.push("one uppercase letter");
  if (!/[a-z]/.test(password))         errors.push("one lowercase letter");
  if (!/\d/.test(password))            errors.push("one number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("one special character");
  return errors; // empty array → valid
}

/**
 * Validates the sign-in form.
 * Returns { field, message } on the first error, or null if valid.
 */
export function validateLogin({ email, password }) {
  const normalized = email.trim();

  if (!normalized) return { field: "email", message: "Email is required." };
  if (!emailRegex.test(normalized))
    return { field: "email", message: "Please enter a valid email address." };
  if (!password) return { field: "password", message: "Password is required." };
  if (password.length < 6)
    return { field: "password", message: "Password must be at least 6 characters." };

  return null;
}

/**
 * Validates the sign-up form (including whatsappNumber).
 * Returns { field, message } on the first error, or null if valid.
 */
export function validateSignup({ fullName, username, email, whatsappNumber, password, confirmPassword, acceptTerms }) {
  const normalized  = email.trim();
  const trimmedName = fullName.trim();

  if (!trimmedName)
    return { field: "fullName", message: "Full name is required." };
  if (!fullNameRegex.test(trimmedName))
    return {
      field: "fullName",
      message: "Name may only contain letters, spaces, hyphens, or apostrophes (2–60 chars).",
    };

  if (!username.trim()) return { field: "username", message: "Username is required." };
  if (!usernameRegex.test(username.trim()))
    return {
      field: "username",
      message: "Username must be 3-20 characters using letters, numbers, or underscores.",
    };

  if (!normalized) return { field: "email", message: "Email is required." };
  if (!emailRegex.test(normalized))
    return { field: "email", message: "Please enter a valid email address." };

  const waError = validateWhatsAppNumber(whatsappNumber);
  if (waError) return { field: "whatsappNumber", message: waError };

  if (!password) return { field: "password", message: "Password is required." };
  const pwErrors = passwordStrengthErrors(password);
  if (pwErrors.length > 0)
    return {
      field: "password",
      message: `Password needs ${pwErrors.join(", ")}.`,
    };

  if (password !== confirmPassword)
    return { field: "confirmPassword", message: "Passwords do not match." };
  if (!acceptTerms)
    return { field: "acceptTerms", message: "Please accept the terms to continue." };

  return null;
}
