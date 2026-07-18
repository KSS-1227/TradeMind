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

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
    signUp,
    signIn,
    signOut,
    updateProfile,
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