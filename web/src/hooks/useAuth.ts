"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

export function useAuth(requireAdmin = false) {
  const router = useRouter();
  const supabase = useSupabase(); // ✅ Usar cliente único
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Obtener sesión actual
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[useAuth] Session error:', sessionError);
          setError(sessionError);
          return;
        }

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Obtener perfil del usuario
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profileError) {
            console.error('[useAuth] Profile error:', profileError);
            // No es crítico si no hay perfil
          } else if (profileData) {
            setProfile(profileData);
            
            // Verificar si es admin
            const adminRoles = ['admin', 'super_admin', 'manager'];
            const userIsAdmin = adminRoles.includes(profileData.role || '');
            setIsAdmin(userIsAdmin);
            
            console.log('[useAuth] User role:', profileData.role, 'Is admin:', userIsAdmin);
          }
        }
      } catch (err) {
        console.error('[useAuth] Init error:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[useAuth] Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession);
        setUser(newSession.user);
        
        // Obtener perfil actualizado
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newSession.user.id)
          .single();
          
        if (profileData) {
          setProfile(profileData);
          const adminRoles = ['admin', 'super_admin', 'manager'];
          setIsAdmin(adminRoles.includes(profileData.role || ''));
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Redirigir si se requiere admin y no lo es
  useEffect(() => {
    if (requireAdmin && initialized && !loading) {
      if (!user) {
        console.log('[useAuth] No user, redirecting to login...');
        router.push('/');
      } else if (!isAdmin) {
        console.log('[useAuth] User is not admin, redirecting...');
        router.push('/');
      }
    }
  }, [requireAdmin, initialized, user, isAdmin, loading, router]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpiar estado
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      
      // Redirigir a login
      router.push('/');
      
      return { success: true };
    } catch (error) {
      console.error('[useAuth] Sign out error:', error);
      return { success: false, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('[useAuth] Sign in error:', error);
      return { success: false, error };
    }
  };

  return {
    user,
    profile,
    session,
    isAdmin,
    loading: loading || !initialized,
    initialized,
    error,
    signOut,
    signIn,
  };
}