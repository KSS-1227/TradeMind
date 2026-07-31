import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import { normalizeWhatsAppNumber } from "../utils/validators";
import { API_BASE_URL } from "../constants/api";

const AuthContext = createContext(null);

export function mapSupabaseAuthError(error) {
  if (!error) return "An unexpected error occurred. Please try again.";
  const msg = (error.message || "").toLowerCase();

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

  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials"))
    return "Incorrect email or password. Please try again.";
  if (msg.includes("email not confirmed"))
    return "Please confirm your email before signing in. Check your inbox.";
  if (msg.includes("too many requests") || msg.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";

  return error.message || "An unexpected error occurred. Please try again.";
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchProfile]);

  const createProfile = async ({ userId, fullName, username, email, whatsappNumber }) => {
    const normalized = whatsappNumber ? normalizeWhatsAppNumber(whatsappNumber) : null;
    const payload = {
      id: userId,
      full_name: fullName,
      username,
      email,
      whatsapp_number: normalized ?? whatsappNumber ?? null,
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[AuthContext] Profile upsert FAILED:", error.message);
    } else {
      setProfile(data);
    }
  };

  const sendWelcomeWhatsApp = async (whatsappNumber) => {
    const normalized = normalizeWhatsAppNumber(whatsappNumber);
    if (!normalized) return;
    try {
      await axios.post(`${API_BASE_URL}/whatsapp/welcome`, { phone: normalized });
    } catch (e) {
      console.warn("[AuthContext] Welcome WhatsApp failed:", e.message);
    }
  };

  const signUp = async ({ fullName, username, email, password, whatsappNumber }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          whatsapp_number: normalizeWhatsAppNumber(whatsappNumber) ?? whatsappNumber,
        },
      },
    });

    if (error) {
      const formattedErr = mapSupabaseAuthError(error);
      toast.error(formattedErr);
      return { success: false, error };
    }

    if (data.session) {
      await createProfile({
        userId: data.user.id,
        fullName,
        username,
        email,
        whatsappNumber,
      });
      await fetchProfile(data.user.id);
      sendWelcomeWhatsApp(whatsappNumber);
      toast.success("Account created successfully!");
    } else {
      toast.info("Signup successful! Please check your email to confirm registration.");
    }

    return { success: true, data };
  };

  const signIn = async (email, password, rememberMe = true) => {
    if (!rememberMe) {
      sessionStorage.setItem("tm_no_persist", "1");
    } else {
      sessionStorage.removeItem("tm_no_persist");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const formattedErr = mapSupabaseAuthError(error);
      toast.error(formattedErr);
      return { data: null, error };
    }

    if (data.user) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!existing) {
        await createProfile({
          userId: data.user.id,
          fullName: data.user.user_metadata?.full_name ?? "",
          username: data.user.user_metadata?.username ?? "",
          email: data.user.email ?? email,
          whatsappNumber: data.user.user_metadata?.whatsapp_number ?? "",
        });
      }
      toast.success("Signed in successfully");
    }

    return { data, error: null };
  };

  const signOut = async () => {
    sessionStorage.removeItem("tm_no_persist");
    await supabase.auth.signOut();
    toast.info("Signed out");
  };

  const forgotPassword = async (email) => {
    const res = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (res.error) {
      toast.error(mapSupabaseAuthError(res.error));
    } else {
      toast.success("Password reset email sent");
    }
    return res;
  };

  const updatePassword = async (password) => {
    const res = await supabase.auth.updateUser({ password });
    if (res.error) {
      toast.error(mapSupabaseAuthError(res.error));
    } else {
      toast.success("Password updated successfully");
    }
    return res;
  };

  const updateProfile = async (fields) => {
    if (!session?.user) return { error: new Error("Not signed in") };
    const { data, error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", session.user.id)
      .select()
      .single();
    if (!error) {
      setProfile(data);
      toast.success("Profile updated");
    } else {
      toast.error("Failed to update profile");
    }
    return { data, error };
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  const value = {
    session,
    user: session?.user ?? null,
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
