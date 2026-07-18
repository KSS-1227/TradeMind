// frontend/src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Loud, specific failure instead of a cryptic runtime error deep in
  // the Supabase SDK — this is the #1 thing that goes wrong when setting
  // this up for the first time (see frontend/.env.example).
  console.error(
    "Missing Supabase config. Set REACT_APP_SUPABASE_URL and " +
    "REACT_APP_SUPABASE_ANON_KEY in frontend/.env (see .env.example), " +
    "then restart `npm start` — Create React App only reads .env at boot."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);