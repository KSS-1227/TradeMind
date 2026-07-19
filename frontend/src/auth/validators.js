// auth/validators.js — centralised validation rules for LoginForm & SignupForm

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Full name: letters (including accented), spaces, hyphens, apostrophes.
 * Min 2, max 60 characters.  No digits.
 * Covers:  John-Doe  |  Mary Jane  |  O'Connell  |  José  |  Ångström
 */
const fullNameRegex = /^[A-Za-zÀ-ÿ' -]{2,60}$/;

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
  if (password.length < 8)          errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password))      errors.push("one uppercase letter");
  if (!/[a-z]/.test(password))      errors.push("one lowercase letter");
  if (!/\d/.test(password))         errors.push("one number");
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
 * Validates the sign-up form.
 * Returns { field, message } on the first error, or null if valid.
 */
export function validateSignup({ fullName, username, email, password, confirmPassword, acceptTerms }) {
  const normalized = email.trim();
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
