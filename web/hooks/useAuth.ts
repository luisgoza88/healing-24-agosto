// Sistema de autenticación unificado para el dashboard administrativo
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

const ADMIN_ROLES = new Set(["admin", "super_admin", "manager"]);

const asErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Ocurrió un error inesperado.";
};

export function useAuth(requireAdmin = false) {
  const router = useRouter();
  const supabase = useSupabase();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc("is_admin", {
        user_id: userId,
      });

      if (!rpcError && typeof data === "boolean") {
        return data;
      }

      if (rpcError && rpcError.code !== "PGRST302") {
        console.warn("[useAuth] RPC is_admin error:", rpcError);
      }
    } catch (rpcException) {
      console.warn("[useAuth] RPC is_admin call failed:", rpcException);
    }

    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.warn("[useAuth] Fallback role check error:", profileError);
        return false;
      }

      if (!data?.role) {
        return false;
      }

      return ADMIN_ROLES.has(data.role);
    } catch (fallbackError) {
      console.error("[useAuth] Unexpected error checking admin role:", fallbackError);
      return false;
    }
  }, [supabase]);

  const loadUserData = useCallback(async (currentUser: User): Promise<boolean> => {
    setUser(currentUser);
    setError(null);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error("[useAuth] Error loading profile:", profileError);
        setProfile(null);
        setIsAdmin(false);
        setError(profileError.message || "No se pudo cargar el perfil del usuario.");
        return false;
      }

      if (!profileData) {
        console.warn("[useAuth] No profile found for user", currentUser.id);
        setProfile(null);
        setIsAdmin(false);
        setError("No se encontró un perfil asociado a tu cuenta.");
        return false;
      }

      setProfile(profileData as Profile);

      const adminStatus = await checkAdminStatus(currentUser.id);
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        setError("Tu usuario no tiene permisos de administrador.");
      }

      return adminStatus;
    } catch (profileException) {
      console.error("[useAuth] Unexpected profile load error:", profileException);
      setProfile(null);
      setIsAdmin(false);
      setError(asErrorMessage(profileException));
      return false;
    }
  }, [checkAdminStatus, supabase]);

  useEffect(() => {
    let isMounted = true;

    const initialise = async () => {
      setLoading(true);
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("[useAuth] Session error:", sessionError);
          setError(sessionError.message);
          return;
        }

        if (!isMounted) {
          return;
        }

        const currentSession = data.session;
        setSession(currentSession);

        if (currentSession?.user) {
          const isElevated = await loadUserData(currentSession.user);
          if (!isElevated) {
            await supabase.auth.signOut();
            if (!isMounted) {
              return;
            }
            setUser(null);
            setSession(null);
          }
        } else {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } catch (initError) {
        console.error("[useAuth] Initialisation error:", initError);
        if (isMounted) {
          setError(asErrorMessage(initError));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialise();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) {
        return;
      }

      if (event === "SIGNED_IN" && newSession?.user) {
        setLoading(true);
        setSession(newSession);
        const hasAccess = await loadUserData(newSession.user);
        if (!hasAccess) {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
        }
        setLoading(false);
        return;
      }

      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setError(null);
        setLoading(false);
        return;
      }

      if (event === "TOKEN_REFRESHED" && newSession) {
        setSession(newSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData, supabase]);

  useEffect(() => {
    if (!requireAdmin || loading) {
      return;
    }

    if (!user) {
      router.push("/");
      return;
    }

    if (!isAdmin) {
      router.push("/");
    }
  }, [requireAdmin, loading, user, isAdmin, router]);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setError(null);
      router.push("/");
      return { success: true } as const;
    } catch (signOutException) {
      console.error("[useAuth] Sign out error:", signOutException);
      setError(asErrorMessage(signOutException));
      return { success: false, error: signOutException } as const;
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (!data?.user) {
        throw new Error("No se pudo obtener la sesión del usuario.");
      }

      const hasAccess = await loadUserData(data.user);
      if (!hasAccess) {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        return { success: false, error: new Error("Necesitas una cuenta con permisos de administrador.") } as const;
      }

      setSession(data.session ?? null);
      return { success: true, data } as const;
    } catch (signInException) {
      console.error("[useAuth] Sign in error:", signInException);
      const message = asErrorMessage(signInException);
      setError(message);
      return { success: false, error: new Error(message) } as const;
    } finally {
      setLoading(false);
    }
  }, [loadUserData, supabase]);

  return {
    user,
    profile,
    session,
    isAdmin,
    loading,
    error,
    signOut,
    signIn,
    isAuthenticated: Boolean(user),
    hasRole: (role: string) => profile?.role === role,
  };
}

export function useAuthStatus() {
  const supabase = useSupabase();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session?.user) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          return;
        }

        setIsAuthenticated(true);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileData?.role) {
          setIsAdmin(ADMIN_ROLES.has(profileData.role));
        } else {
          setIsAdmin(false);
        }
      } catch (statusError) {
        console.error("[useAuthStatus] Error:", statusError);
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [supabase]);

  return { isAuthenticated, isAdmin, loading };
}
