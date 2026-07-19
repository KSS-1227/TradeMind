// frontend/src/AuthContext.js
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); // true until we've checked
                                                  // for an existing session
                                                  // once on page load

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      // Not fatal — most commonly means the profiles table/migration
      // hasn't been set up yet. Log it but don't block the UI on it.
      console.warn("Could not load profile:", error.message);
      setProfile(null);
    } else {
      setProfile(data);
    }
  }, []);

  useEffect(() => {
    // Check for an existing session on first load (e.g. user refreshed
    // the page — Supabase persists the session in localStorage for us).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Keep session state in sync with sign-in/sign-out/token-refresh
    // events that happen anywhere in the app.
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

  const signUp = async ({ fullName, username, email, password }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            full_name: fullName,
            username,
            email,
          });

        if (profileError) throw profileError;
      }

      return {
        success: true,
        data,
      };
    } catch (err) {
      return {
        success: false,
        error: err,
      };
    }
  };

  const signIn = async (email, password, rememberMe = true) => {
    // Supabase persists sessions in localStorage by default.
    // When rememberMe is false we sign in normally but immediately
    // downgrade the session to sessionStorage-only via a custom flag
    // that consumers can read.  Full ephemeral-session support would
    // require initialising the Supabase client with
    // `auth: { persistSession: false }`, which is a singleton concern.
    // For now we store the preference so the UI can surface it later.
    if (!rememberMe) {
      sessionStorage.setItem("tm_no_persist", "1");
    } else {
      sessionStorage.removeItem("tm_no_persist");
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    sessionStorage.removeItem("tm_no_persist");
    await supabase.auth.signOut();
  };

  const forgotPassword = async (email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
  };

  const refreshProfile = async () => {
    if (!session?.user) return;

    await fetchProfile(session.user.id);
  };

  const updatePassword = async (password) => {
    return supabase.auth.updateUser({
      password,
    });
  };

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
  if (!ctx) {
    throw new Error("useAuth() must be used inside <AuthProvider>");
  }
  return ctx;
}