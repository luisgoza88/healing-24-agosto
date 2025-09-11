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

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async (retryCount = 0) => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // Si es un error de red y no hemos excedido los intentos, reintentar
        if (error.message === 'Failed to fetch' && retryCount < 3) {
          console.log(`Retrying auth check... attempt ${retryCount + 1}`);
          setTimeout(() => checkAuth(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        throw error;
      }
      
      if (!user) {
        router.push('/');
        return;
      }

      const adminStatus = await checkIsAdmin(user.id);
      
      if (!adminStatus) {
        await supabase.auth.signOut();
        router.push('/');
        return;
      }

      setUser(user);
      setIsAdmin(adminStatus);
      setLoading(false);
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