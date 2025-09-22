import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useNotificationCount() {
  const [count, setCount] = useState(0);
  const { user } = useAuth();
  const supabase = useSupabase();

  useEffect(() => {
    if (!user) return;

    // Función para obtener el conteo inicial
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (!error && count !== null) {
        setCount(count);
      }
    };

    fetchCount();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refrescar el conteo cuando haya cambios
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return count;
}