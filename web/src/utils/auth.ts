import { createClient, useSupabase } from '@/lib/supabase';

export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = useSupabase();
    console.log('[checkIsAdmin] Checking admin status for user:', userId);
    
    // Usar solo consulta directa por ahora para evitar problemas con RPC
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    console.log('[checkIsAdmin] Profile query result:', { profileData, profileError });
    
    if (profileError) {
      console.error('[checkIsAdmin] Error fetching profile:', profileError);
      return false;
    }
    
    const isAdmin = profileData && ['admin', 'super_admin', 'manager'].includes(profileData.role);
    console.log('[checkIsAdmin] Admin check result:', isAdmin, 'Role:', profileData?.role);
    
    return isAdmin;
  } catch (err) {
    console.error('[checkIsAdmin] Unexpected error:', err);
    return false;
  }
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const supabase = useSupabase();
  const { data, error } = await supabase
    .rpc('get_user_roles', { user_uuid: userId });
  
  if (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
  
  return data || [];
}