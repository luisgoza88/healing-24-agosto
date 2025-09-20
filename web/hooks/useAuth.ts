// Sistema de autenticación simplificado y directo
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

// Roles que tienen acceso admin
const ADMIN_ROLES = ["admin", "super_admin", "manager"];

export function useAuth(requireAdmin = false) {
  const router = useRouter();
  const supabase = useSupabase();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para verificar si es admin
  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    console.log('[useAuth] Checking admin status for:', userId);
    
    try {
      // Primero intentar con la función RPC
      const { data: isAdminRPC, error: rpcError } = await (supabase as any)
        .rpc('is_admin', { user_id: userId });
      
      if (!rpcError && typeof isAdminRPC === 'boolean') {
        console.log('[useAuth] RPC is_admin result:', isAdminRPC);
        return isAdminRPC;
      }
      
      // Si falla RPC, verificar directamente en profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (!profileError && profileData) {
        const role = (profileData as any).role;
        if (role && typeof role === 'string') {
          const hasAdminRole = ADMIN_ROLES.includes(role);
          console.log('[useAuth] Profile role:', role, 'isAdmin:', hasAdminRole);
          return hasAdminRole;
        }
      }
      
      console.log('[useAuth] No admin role found');
      return false;
    } catch (error) {
      console.error('[useAuth] Error checking admin status:', error);
      return false;
    }
  }, [supabase]);

  // Función para cargar datos del usuario
  const loadUserData = useCallback(async (currentUser: User) => {
    console.log('[useAuth] Loading user data for:', currentUser.email);
    
    try {
      // Cargar perfil
      console.log('[useAuth] Fetching profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      if (profileError) {
        console.error('[useAuth] Profile fetch error:', profileError);
      } else if (profileData) {
        console.log('[useAuth] Profile loaded:', profileData.email);
        setProfile(profileData);
      }
      
      // Verificar si es admin
      console.log('[useAuth] Checking admin status...');
      const adminStatus = await checkAdminStatus(currentUser.id);
      setIsAdmin(adminStatus);
      
      console.log('[useAuth] User data loaded. isAdmin:', adminStatus);
    } catch (error) {
      console.error('[useAuth] Error loading user data:', error);
    }
  }, [checkAdminStatus, supabase]);

  // Inicializar autenticación
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initialize = async () => {
      console.log('[useAuth] Initializing...');
      setLoading(true);
      
      // Timeout de seguridad para evitar loading infinito
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('[useAuth] Initialization timeout - forcing completion');
          setLoading(false);
        }
      }, 3000);
      
      try {
        // Obtener sesión actual
        console.log('[useAuth] Getting session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('[useAuth] Session result:', session ? 'Found' : 'Not found');
        
        if (!mounted) return;
        
        if (session?.user) {
          console.log('[useAuth] Session found for:', session.user.email);
          setSession(session);
          setUser(session.user);
          await loadUserData(session.user);
        } else {
          console.log('[useAuth] No session found');
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('[useAuth] Initialization error:', error);
        if (mounted) {
          setError('Error al inicializar autenticación');
        }
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
          console.log('[useAuth] Initialization complete');
        }
      }
    };

    initialize();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] Auth state changed:', event);
      
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        setSession(session);
        setUser(session.user);
        await loadUserData(session.user);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setError(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [loadUserData, supabase]);

  // Redirigir si se requiere admin y no lo es
  useEffect(() => {
    if (!loading && requireAdmin && !isAdmin) {
      console.log('[useAuth] Redirecting - not admin');
      router.push('/');
    }
  }, [loading, requireAdmin, isAdmin, router]);

  // Función para cerrar sesión
  const signOut = useCallback(async () => {
    console.log('[useAuth] Signing out...');
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpiar estado
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setError(null);
      
      // Redirigir a login
      router.push('/');
      return { success: true };
    } catch (error) {
      console.error('[useAuth] Sign out error:', error);
      setError('Error al cerrar sesión');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  // Función para iniciar sesión
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[useAuth] Signing in:', email);
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data?.user) throw new Error('No se pudo obtener la sesión');

      // Cargar datos del usuario
      setSession(data.session);
      setUser(data.user);
      await loadUserData(data.user);
      
      console.log('[useAuth] Sign in successful');
      return { success: true, data };
    } catch (error: any) {
      console.error('[useAuth] Sign in error:', error);
      const message = error.message || 'Error al iniciar sesión';
      setError(message);
      return { success: false, error: new Error(message) };
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

// Hook simplificado para verificar estado de autenticación
export function useAuthStatus() {
  const { user, isAdmin, loading } = useAuth();
  return {
    isAuthenticated: Boolean(user),
    isAdmin,
    loading
  };
}