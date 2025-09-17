/**
 * HOOKS UNIFICADOS DE AUTENTICACIÓN
 * Funciona tanto en React Native como en Next.js
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthManager, AuthUser, UserProfile, AuthSession } from '../utils/authManager';

/**
 * Hook principal de autenticación
 */
export function useAuth(supabaseClient: any) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manager = useMemo(() => new AuthManager(supabaseClient), [supabaseClient]);

  const loadUserData = useCallback(async (currentUser: AuthUser | null) => {
    if (!currentUser) {
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setRoles([]);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      const [profileData, adminStatus, userRoles] = await Promise.all([
        manager.getUserProfile(currentUser.id),
        manager.isAdmin(currentUser.id),
        manager.getUserRoles(currentUser.id)
      ]);

      setUser(currentUser);
      setProfile(profileData);
      setIsAdmin(adminStatus);
      setRoles(userRoles);
    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message || 'Error al cargar datos del usuario');
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [manager]);

  const checkAuth = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      const currentSession = await manager.getCurrentSession();
      setSession(currentSession);

      if (currentSession?.user) {
        await loadUserData(currentSession.user);
      } else {
        await loadUserData(null);
      }
    } catch (err: any) {
      console.error('Error checking auth:', err);
      
      // Reintentar en caso de error de red
      if (err.message === 'Failed to fetch' && retryCount < 3) {
        setTimeout(() => checkAuth(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      setError(err.message || 'Error de autenticación');
      setLoading(false);
      setInitialized(true);
    }
  }, [manager, loadUserData]);

  useEffect(() => {
    checkAuth();

    // Configurar listener para cambios de autenticación
    const { data: { subscription } } = manager.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      setSession(session);
      
      if (event === 'SIGNED_OUT' || !session) {
        await loadUserData(null);
      } else if (session?.user) {
        await loadUserData(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuth, loadUserData, manager]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { user: signedInUser, session: newSession, error: signInError } = await manager.signInWithPassword(email, password);
      
      if (signInError) {
        throw signInError;
      }

      // Los datos se actualizarán automáticamente via onAuthStateChange
      return { user: signedInUser, session: newSession, error: null };
    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
      return { user: null, session: null, error: err };
    }
  }, [manager]);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    metadata?: { full_name?: string; phone?: string; [key: string]: any }
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { user: newUser, session: newSession, error: signUpError } = await manager.signUp(email, password, metadata);
      
      if (signUpError) {
        throw signUpError;
      }

      // Los datos se actualizarán automáticamente via onAuthStateChange
      return { user: newUser, session: newSession, error: null };
    } catch (err: any) {
      console.error('Error signing up:', err);
      setError(err.message || 'Error al registrarse');
      setLoading(false);
      return { user: null, session: null, error: err };
    }
  }, [manager]);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: signOutError } = await manager.signOut();
      
      if (signOutError) {
        throw signOutError;
      }

      // Los datos se actualizarán automáticamente via onAuthStateChange
      return { error: null };
    } catch (err: any) {
      console.error('Error signing out:', err);
      setError(err.message || 'Error al cerrar sesión');
      setLoading(false);
      return { error: err };
    }
  }, [manager]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    try {
      const updatedProfile = await manager.updateProfile(user.id, updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user, manager]);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await manager.updatePassword(newPassword);
      
      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Error updating password:', error);
      return { error };
    }
  }, [manager]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await manager.resetPassword(email);
      return { error };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { error };
    }
  }, [manager]);

  const refreshSession = useCallback(async () => {
    try {
      const newSession = await manager.refreshSession();
      setSession(newSession);
      
      if (newSession?.user) {
        await loadUserData(newSession.user);
      }
      
      return newSession;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
  }, [manager, loadUserData]);

  const refresh = useCallback(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    // Estado
    user,
    profile,
    session,
    isAdmin,
    roles,
    loading,
    initialized,
    error,
    
    // Acciones
    signIn,
    signUp,
    signOut,
    updateProfile,
    updatePassword,
    resetPassword,
    refreshSession,
    refresh,
    
    // Helpers
    isAuthenticated: !!user,
    hasRole: useCallback((role: string) => roles.includes(role), [roles])
  };
}

/**
 * Hook simplificado para verificar autenticación
 */
export function useAuthStatus(supabaseClient: any) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const manager = useMemo(() => new AuthManager(supabaseClient), [supabaseClient]);

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const user = await manager.getCurrentUser();
        
        if (!isMounted) return;

        if (user) {
          setIsAuthenticated(true);
          setUserId(user.id);
          
          const adminStatus = await manager.isAdmin(user.id);
          if (isMounted) {
            setIsAdmin(adminStatus);
          }
        } else {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUserId(null);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUserId(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkStatus();

    const { data: { subscription } } = manager.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserId(null);
        setLoading(false);
      } else if (session?.user) {
        checkStatus();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [manager]);

  return {
    isAuthenticated,
    isAdmin,
    loading,
    userId
  };
}
