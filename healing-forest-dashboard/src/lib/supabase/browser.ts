"use client";
import { createBrowserClient } from "@supabase/ssr";

let supabaseBrowser: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (supabaseBrowser) return supabaseBrowser;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.warn("[Supabase] Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  supabaseBrowser = createBrowserClient(url ?? "", anon ?? "", {
    auth: {
      persistSession: true,
      storageKey: "hf-admin-auth",
      autoRefreshToken: true,
    },
  });
  return supabaseBrowser;
}


