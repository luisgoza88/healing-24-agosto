/**
 * SISTEMA UNIFICADO DE AUTENTICACIÓN
 * Este archivo estandariza la autenticación entre mobile y web
 */

// Tipos unificados
export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    phone?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role?: 'client' | 'admin' | 'super_admin' | 'manager' | 'professional';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

/**
 * Clase unificada para manejo de autenticación
 */
export class AuthManager {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Obtiene la sesión actual del usuario
   */
  async getCurrentSession(): Promise<AuthSession | null> {
    console.log('[AuthManager] Getting current session...');
    try {
      // Primero intentar obtener la sesión del almacenamiento local
      const { data: { session }, error } = await this.supabase.auth.getSession();
      console.log('[AuthManager] Session result:', { session: session?.user?.email, error });
      
      if (error) {
        console.error('Error getting current session:', error);
        // Si hay error, intentar refresh
        const { data: { session: refreshedSession }, error: refreshError } = await this.supabase.auth.refreshSession();
        if (!refreshError && refreshedSession) {
          console.log('[AuthManager] Session refreshed successfully');
          return refreshedSession;
        }
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }

  /**
   * Obtiene el usuario actual
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting current user:', error);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Obtiene el perfil completo del usuario
   */
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    try {
      const targetUserId = userId || (await this.getCurrentUser())?.id;
      
      if (!targetUserId) {
        return null;
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Verifica si el usuario actual es administrador
   */
  async isAdmin(userId?: string): Promise<boolean> {
    try {
      const targetUserId = userId || (await this.getCurrentUser())?.id;
      
      if (!targetUserId) {
        return false;
      }

      // Usar la función de base de datos unificada
      const { data, error } = await this.supabase.rpc('is_admin', {
        user_uuid: targetUserId
      });

      if (error) {
        console.error('Error checking admin status:', error);
        // Si hay error, verificar directamente en profiles como fallback
        const profile = await this.getUserProfile(targetUserId);
        return profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'manager';
      }

      return data === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Obtiene los roles del usuario
   */
  async getUserRoles(userId?: string): Promise<string[]> {
    try {
      const targetUserId = userId || (await this.getCurrentUser())?.id;
      
      if (!targetUserId) {
        return [];
      }

      // Intentar usar la función RPC si existe
      try {
        const { data, error } = await this.supabase.rpc('get_user_roles', {
          user_uuid: targetUserId
        });

        if (!error && data) {
          return data;
        }
      } catch (rpcError) {
        console.log('RPC get_user_roles not available, using profile role');
      }

      // Fallback: obtener role desde profiles
      const profile = await this.getUserProfile(targetUserId);
      return profile?.role ? [profile.role] : [];
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Inicia sesión con email y contraseña
   */
  async signInWithPassword(email: string, password: string): Promise<{
    user: AuthUser | null;
    session: AuthSession | null;
    error: any;
  }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      return {
        user: data.user,
        session: data.session,
        error
      };
    } catch (error) {
      console.error('Error signing in:', error);
      return {
        user: null,
        session: null,
        error
      };
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async signUp(
    email: string, 
    password: string, 
    metadata?: { full_name?: string; phone?: string; [key: string]: any }
  ): Promise<{
    user: AuthUser | null;
    session: AuthSession | null;
    error: any;
  }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {}
        }
      });

      return {
        user: data.user,
        session: data.session,
        error
      };
    } catch (error) {
      console.error('Error signing up:', error);
      return {
        user: null,
        session: null,
        error
      };
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  async signOut(): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Error signing out:', error);
      return { error };
    }
  }

  /**
   * Actualiza el perfil del usuario
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Cambia la contraseña del usuario
   */
  async updatePassword(newPassword: string): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      return { error };
    } catch (error) {
      console.error('Error updating password:', error);
      return { error };
    }
  }

  /**
   * Envía email de reseteo de contraseña
   */
  async resetPassword(email: string): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      console.error('Error sending password reset:', error);
      return { error };
    }
  }

  /**
   * Configura listener para cambios de autenticación
   */
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Refresca la sesión actual
   */
  async refreshSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await this.supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
  }
}

// Funciones de conveniencia
export const getCurrentUser = async (supabaseClient: any): Promise<AuthUser | null> => {
  const manager = new AuthManager(supabaseClient);
  return manager.getCurrentUser();
};

export const isAdmin = async (supabaseClient: any, userId?: string): Promise<boolean> => {
  const manager = new AuthManager(supabaseClient);
  return manager.isAdmin(userId);
};

export const getUserProfile = async (supabaseClient: any, userId?: string): Promise<UserProfile | null> => {
  const manager = new AuthManager(supabaseClient);
  return manager.getUserProfile(userId);
};






