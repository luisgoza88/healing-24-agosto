"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { checkIsAdmin } from "@/src/utils/auth";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();

    // Timeout para evitar que se quede cargando indefinidamente
    const timeout = setTimeout(() => {
      if (loading) {
        console.error('[useAuth] Auth check timeout after 10 seconds');
        setLoading(false);
        router.push('/');
      }
    }, 10000); // 10 segundos

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAdmin(false);
          router.push('/');
        } else if (session?.user) {
          await checkAuth();
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async (retryCount = 0) => {
    try {
      console.log('[useAuth] Checking auth status...');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('[useAuth] Error getting user:', error);
        // Si es un error de red y no hemos excedido los intentos, reintentar
        if (error.message === 'Failed to fetch' && retryCount < 3) {
          console.log(`[useAuth] Retrying auth check... attempt ${retryCount + 1}`);
          setTimeout(() => checkAuth(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        throw error;
      }
      
      if (!user) {
        router.push('/');
        return;
      }

      console.log('[useAuth] User found, checking admin status...');
      const adminStatus = await checkIsAdmin(user.id);
      console.log('[useAuth] Admin status:', adminStatus);
      
      if (!adminStatus) {
        console.log('[useAuth] User is not admin, signing out...');
        setLoading(false);
        await supabase.auth.signOut();
        router.push('/');
        return;
      }

      console.log('[useAuth] Setting user and admin status...');
      setUser(user);
      setIsAdmin(adminStatus);
      setLoading(false);
      console.log('[useAuth] Auth check complete');
    } catch (error) {
      console.error('Error checking auth:', error);
      // Solo redirigir si no es un error temporal de red
      if (error.message !== 'Failed to fetch') {
        router.push('/');
      }
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return {
    user,
    isAdmin,
    loading,
    signOut
  };
}