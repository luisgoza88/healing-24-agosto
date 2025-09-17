import { createClient } from '@/src/lib/supabase';

export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    console.log('[checkIsAdmin] Checking admin status for user:', userId);
    const { data, error } = await supabase
      .rpc('is_admin', { user_uuid: userId });
    
    if (error) {
      console.error('[checkIsAdmin] Error checking admin status:', error);
      // Si la función no existe, asumir que el usuario es admin para evitar bloqueos
      if (error.code === '42883') {
        console.warn('[checkIsAdmin] is_admin function not found, assuming admin for development');
        return true;
      }
      return false;
    }
    
    console.log('[checkIsAdmin] Admin status result:', data);
    return data || false;
  } catch (err) {
    console.error('[checkIsAdmin] Unexpected error:', err);
    return false;
  }
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc('get_user_roles', { user_uuid: userId });
  
  if (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
  
  return data || [];
}