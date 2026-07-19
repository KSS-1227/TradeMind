// frontend/src/AuthContext.js
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

// ─────────────────────────────────────────────────────────────
// Supabase error → user-facing message map
// We match on the raw message string because Supabase JS v2 does
// not expose a stable numeric error code for auth errors.
// ─────────────────────────────────────────────────────────────
export function mapSupabaseAuthError(error) {
  if (!error) return "An unexpected error occurred. Please try again.";

  const msg = (error.message || "").toLowerCase();

  // ── Sign-up errors ───────────────────────────────────────
  if (msg.includes("user already registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (msg.includes("email rate limit") || msg.includes("over_email_send_rate_limit"))
    return "Too many signup attempts. Please wait a few minutes before trying again.";
  if (msg.includes("signup is disabled") || msg.includes("signups not allowed"))
    return "New signups are currently disabled. Please contact support.";
  if (msg.includes("email already in use") || msg.includes("email taken"))
    return "This email is already registered. Please sign in or use a different email.";
  if (msg.includes("password should be at least"))
    return "Your password is too short. Please use at least 8 characters.";
  if (msg.includes("unable to validate email address"))
    return "This email address doesn't appear to be valid.";

  // ── Sign-in errors ───────────────────────────────────────
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials"))
    return "Incorrect email or password. Please try again.";
  if (msg.includes("email not confirmed"))
    return "Please confirm your email before signing in. Check your inbox.";
  if (msg.includes("too many requests") || msg.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";

  // ── Generic fallback — show the raw message so we can debug ─
  return error.message || "An unexpected error occurred. Please try again.";
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── fetchProfile ─────────────────────────────────────────
  // Uses .maybeSingle() instead of .single() so that a missing
  // row returns { data: null, error: null } instead of a
  // PGRST116 error — safe for new users with no profile yet.
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[AuthContext] fetchProfile failed:", error.code, error.message);
      setProfile(null);
    } else {
      setProfile(data ?? null);
    }
  }, []);

  // ── Session bootstrap ─────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchProfile]);

  // ── createProfile ─────────────────────────────────────────
  // Separated so it can be called after confirmed sign-in too.
  // NEVER throws — profile failure must not block auth flow.
  const createProfile = async ({ userId, fullName, username, email }) => {
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id:        userId,
        full_name: fullName,
        username,
        email,
      });

    if (error) {
      // Log for debugging but do NOT surface this as a signup failure.
      console.error(
        "[AuthContext] Profile upsert failed — auth account still created.",
        { code: error.code, status: error.status, message: error.message }
      );
    }
  };

  // ── signUp ────────────────────────────────────────────────
  // Production-safe flow:
  //
  // Case A — email confirmation DISABLED (session returned immediately):
  //   → Create profile right away (session exists, RLS passes).
  //
  // Case B — email confirmation ENABLED (session is null):
  //   → Skip profile creation entirely.
  //   → Profile is created on first sign-in via onAuthStateChange
  //     → fetchProfile (and a separate ensureProfile call if needed).
  //
  // Profile failure in Case A is LOGGED but does NOT fail signup.
  const signUp = async ({ fullName, username, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // Stored in auth.users.raw_user_meta_data — available before
          // the profiles row exists.
          full_name: fullName,
          username,
        },
      },
    });

    if (error) {
      console.error("[AuthContext] signUp error:", {
        code:    error.code,
        status:  error.status,
        message: error.message,
      });
      return { success: false, error };
    }

    // Case A — auto-confirm or email confirmation disabled.
    // data.session is non-null, meaning the user is already authenticated.
    // RLS allows the insert because auth.uid() == data.user.id.
    if (data.session) {
      await createProfile({
        userId:   data.user.id,
        fullName,
        username,
        email,
      });
    }
    // Case B — confirmation email sent, no session yet.
    // Profile will be created on first successful sign-in (see signIn below).

    return { success: true, data };
  };

  // ── signIn ────────────────────────────────────────────────
  const signIn = async (email, password, rememberMe = true) => {
    if (!rememberMe) {
      sessionStorage.setItem("tm_no_persist", "1");
    } else {
      sessionStorage.removeItem("tm_no_persist");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("[AuthContext] signIn error:", {
        code:    error.code,
        status:  error.status,
        message: error.message,
      });
      return { data: null, error };
    }

    // Ensure profile exists — covers:
    //   • Users who signed up with email confirmation (profile skipped at signup)
    //   • Users whose profile insert failed at signup
    if (data.user) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!existing) {
        // Profile is missing — create it now that we have a valid session.
        await createProfile({
          userId:   data.user.id,
          fullName: data.user.user_metadata?.full_name  ?? "",
          username: data.user.user_metadata?.username   ?? "",
          email:    data.user.email                     ?? email,
        });
      }
    }

    return { data, error: null };
  };

  // ── signOut ───────────────────────────────────────────────
  const signOut = async () => {
    sessionStorage.removeItem("tm_no_persist");
    await supabase.auth.signOut();
  };

  // ── forgotPassword ────────────────────────────────────────
  const forgotPassword = async (email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
  };

  // ── updatePassword ────────────────────────────────────────
  const updatePassword = async (password) => {
    return supabase.auth.updateUser({ password });
  };

  // ── updateProfile ─────────────────────────────────────────
  const updateProfile = async (fields) => {
    if (!session?.user) return { error: new Error("Not signed in") };
    const { data, error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", session.user.id)
      .select()
      .single();
    if (!error) setProfile(data);
    return { data, error };
  };

  // ── refreshProfile ────────────────────────────────────────
  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  const value = {
    session,
    user:            session?.user ?? null,
    profile,
    loading,
    isAuthenticated: !!session,

    signIn,
    signUp,
    signOut,

    forgotPassword,
    updatePassword,

    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used inside <AuthProvider>");
  return ctx;
}
