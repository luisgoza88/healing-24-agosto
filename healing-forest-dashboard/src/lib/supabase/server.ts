import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createServerClient(url ?? "", anon ?? "", {
    cookies: {
      getAll: () => cookies().getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookies().set(name, value, options));
        } catch {}
      },
    },
    headers: {
      get: (key) => headers().get(key) ?? undefined,
    },
  });
}


