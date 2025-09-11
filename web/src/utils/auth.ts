import { supabase } from '@/src/lib/supabase';

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('is_admin', { user_uuid: userId });
  
  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
  
  return data || false;
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .rpc('get_user_roles', { user_uuid: userId });
  
  if (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
  
  return data || [];
}