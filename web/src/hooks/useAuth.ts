"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth as useUnifiedAuth } from "../../../shared/hooks/useAuth";
import { createClient } from "@/src/lib/supabase";

export function useAuth(requireAdmin = false) {
  const router = useRouter();
  const supabase = createClient();
  const {
    user,
    profile,
    session,
    isAdmin,
    loading,
    initialized,
    error,
    signOut: baseSignOut,
    ...rest
  } = useUnifiedAuth(supabase);

  // Wrapper para signOut que redirige a la página principal
  const signOut = async () => {
    const result = await baseSignOut();
    router.push('/');
    return result;
  };

  // Redirigir si se requiere admin y no lo es
  useEffect(() => {
    if (requireAdmin && initialized && user && !isAdmin && !loading) {
      console.log('User is not admin, redirecting...');
      router.push('/');
    }
  }, [requireAdmin, initialized, user, isAdmin, loading, router]);

  return {
    user,
    profile,
    session,
    isAdmin,
    loading: loading || !initialized,
    error,
    signOut,
    ...rest
  };
}