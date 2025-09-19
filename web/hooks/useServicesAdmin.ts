import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminService {
  id: string;
  code: string;
  name: string;
  description?: string;
  base_price: number;
  duration_minutes: number;
  color: string;
  icon: string;
  category_name?: string | null;
  category_code?: string | null;
  active: boolean;
  sub_service_count?: number;
  professional_count?: number;
  total_appointments?: number;
  upcoming_appointments?: number;
}

export interface AdminSubService {
  id?: string;
  service_id?: string;
  name: string;
  price: number;
  duration_minutes: number;
  price_note?: string | null;
  order_index?: number;
  active?: boolean;
}

interface RpcServiceRow {
  service_id: string;
  service_code: string;
  service_name: string;
  service_description?: string | null;
  base_price?: number | null;
  duration_minutes?: number | null;
  color?: string | null;
  icon?: string | null;
  category_name?: string | null;
  category_code?: string | null;
  sub_services?: Array<{ name: string }>;
}

interface DashboardViewRow {
  id: string;
  total_appointments?: number | null;
  upcoming_appointments?: number | null;
  professional_count?: number | null;
  sub_service_count?: number | null;
  active?: boolean | null;
}

const normalizeService = (
  base: RpcServiceRow,
  stats?: DashboardViewRow | null
): AdminService => ({
  id: base.service_id,
  code: base.service_code,
  name: base.service_name,
  description: base.service_description ?? undefined,
  base_price: Number(base.base_price ?? 0),
  duration_minutes: Number(base.duration_minutes ?? 0),
  color: base.color ?? '#000000',
  icon: base.icon ?? 'medical-bag',
  category_name: base.category_name ?? null,
  category_code: base.category_code ?? null,
  active: Boolean(stats?.active ?? true),
  sub_service_count:
    stats?.sub_service_count ?? base.sub_services?.length ?? 0,
  professional_count: stats?.professional_count ?? 0,
  total_appointments: stats?.total_appointments ?? 0,
  upcoming_appointments: stats?.upcoming_appointments ?? 0,
});

const pickServicePayload = (service: Partial<AdminService>) => {
  const payload: Record<string, unknown> = {
    name: service.name,
    code: service.code,
    description: service.description ?? null,
    base_price: service.base_price ?? 0,
    duration_minutes: service.duration_minutes ?? 0,
    color: service.color ?? '#000000',
    icon: service.icon ?? 'medical-bag',
    active: service.active ?? true,
  };

  if (typeof service.category_code !== 'undefined') {
    payload.category_code = service.category_code;
  }

  return payload;
};

const pickSubServicePayload = (subService: Partial<AdminSubService>) => ({
  name: subService.name,
  service_id: subService.service_id,
  price: subService.price ?? 0,
  duration_minutes: subService.duration_minutes ?? 0,
  price_note: subService.price_note ?? null,
  order_index: subService.order_index ?? 0,
  active: subService.active ?? true,
});

export function useServicesAdmin(supabase: SupabaseClient) {
  const [dashboardStats, setDashboardStats] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [{ data: servicesData, error: servicesError }, { data: viewData, error: viewError }] =
        await Promise.all([
          supabase.rpc('get_services_with_details'),
          supabase.from('service_dashboard_view').select('*'),
        ]);

      if (servicesError) {
        throw servicesError;
      }
      if (viewError) {
        throw viewError;
      }

      const statsMap = new Map<string, DashboardViewRow>();
      (viewData ?? []).forEach((row: any) => {
        if (row?.id) {
          statsMap.set(row.id, row);
        }
      });

      const computed = (servicesData ?? []).map((service: any) =>
        normalizeService(service as RpcServiceRow, statsMap.get(service.service_id))
      );

      setDashboardStats(computed);
    } catch (err: any) {
      console.error('[useServicesAdmin] Error loading dashboard stats:', err);
      setError(err?.message ?? 'Error al cargar los servicios.');
      setDashboardStats([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadDashboardStats();
  }, [loadDashboardStats]);

  const createService = useCallback(
    async (service: Partial<AdminService>) => {
      const payload = pickServicePayload(service);
      const { data, error: insertError } = await supabase
        .from('services')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      await loadDashboardStats();
      return data;
    },
    [supabase, loadDashboardStats]
  );

  const updateService = useCallback(
    async (id: string, updates: Partial<AdminService>) => {
      const payload = pickServicePayload(updates);
      const { data, error: updateError } = await supabase
        .from('services')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      await loadDashboardStats();
      return data;
    },
    [supabase, loadDashboardStats]
  );

  const createSubService = useCallback(
    async (subService: Partial<AdminSubService>) => {
      const payload = pickSubServicePayload(subService);
      const { data, error: insertError } = await supabase
        .from('sub_services')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      await loadDashboardStats();
      return data;
    },
    [supabase, loadDashboardStats]
  );

  const updateSubService = useCallback(
    async (id: string, updates: Partial<AdminSubService>) => {
      const payload = pickSubServicePayload(updates);
      const { data, error: updateError } = await supabase
        .from('sub_services')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      await loadDashboardStats();
      return data;
    },
    [supabase, loadDashboardStats]
  );

  const refresh = useCallback(() => {
    void loadDashboardStats();
  }, [loadDashboardStats]);

  return {
    dashboardStats,
    loading,
    error,
    createService,
    updateService,
    createSubService,
    updateSubService,
    refresh,
  };
}
