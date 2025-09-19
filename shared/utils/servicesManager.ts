/**
 * SISTEMA UNIFICADO DE SERVICIOS
 * Manager centralizado para todos los servicios de la aplicación
 */

// Interfaces unificadas
export interface ServiceCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  order_index: number;
  active: boolean;
}

export interface Service {
  id: string;
  category_id?: string;
  code: string;
  name: string;
  description?: string;
  base_price: number;
  duration_minutes: number;
  color: string;
  icon: string;
  requires_professional: boolean;
  max_advance_days?: number;
  min_advance_hours?: number;
  active: boolean;
  sub_services?: SubService[];
  category?: ServiceCategory;
  professional_count?: number;
  appointment_count?: number;
}

export interface SubService {
  id: string;
  service_id: string;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  price_note?: string;
  order_index: number;
  active: boolean;
}

export interface Professional {
  id: string;
  user_id?: string;
  full_name: string;
  title?: string;
  specialties?: string[];
  bio?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface ProfessionalService {
  id: string;
  professional_id: string;
  service_id: string;
  sub_service_id?: string;
  is_primary: boolean;
  professional?: Professional;
  service?: Service;
  sub_service?: SubService;
}

export interface ServiceSettings {
  id: string;
  service_id: string;
  allow_online_booking: boolean;
  require_deposit: boolean;
  deposit_percentage?: number;
  cancellation_hours: number;
  reminder_hours: number;
  custom_fields?: any;
}

/**
 * Manager unificado de servicios
 */
export class ServicesManager {
  private supabase: any;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutos

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Obtiene todas las categorías de servicios
   */
  async getCategories(): Promise<ServiceCategory[]> {
    const cacheKey = 'categories';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data, error } = await this.supabase
        .from('service_categories')
        .select('*')
        .eq('active', true)
        .order('order_index');

      if (error) throw error;

      this.setCache(cacheKey, data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Obtiene todos los servicios con sus detalles
   */
  async getServicesWithDetails(): Promise<Service[]> {
    const cacheKey = 'services_with_details';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data, error } = await this.supabase.rpc('get_services_with_details');

      if (error) throw error;

      const services = data?.map((item: any) => ({
        id: item.service_id,
        code: item.service_code,
        name: item.service_name,
        description: item.service_description,
        base_price: item.base_price,
        duration_minutes: item.duration_minutes,
        color: item.color,
        icon: item.icon,
        category: {
          name: item.category_name,
          code: item.category_code
        },
        sub_services: item.sub_services || []
      })) || [];

      this.setCache(cacheKey, services);
      return services;
    } catch (error) {
      console.error('Error fetching services with details:', error);
      return [];
    }
  }

  /**
   * Obtiene un servicio por su código
   */
  async getServiceByCode(code: string): Promise<Service | null> {
    const cacheKey = `service_${code}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data, error } = await this.supabase
        .from('services')
        .select(`
          *,
          service_categories (
            id,
            code,
            name,
            color,
            icon
          ),
          sub_services (
            id,
            name,
            description,
            price,
            duration_minutes,
            price_note,
            order_index
          )
        `)
        .eq('code', code)
        .eq('active', true)
        .single();

      if (error) throw error;

      const service = {
        ...data,
        category: data.service_categories,
        sub_services: data.sub_services?.sort((a: SubService, b: SubService) => a.order_index - b.order_index)
      };

      this.setCache(cacheKey, service);
      return service;
    } catch (error) {
      console.error(`Error fetching service ${code}:`, error);
      return null;
    }
  }

  /**
   * Obtiene un servicio por su ID
   */
  async getServiceById(id: string): Promise<Service | null> {
    const cacheKey = `service_id_${id}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data, error } = await this.supabase
        .from('services')
        .select(`
          *,
          service_categories (
            id,
            code,
            name,
            color,
            icon
          ),
          sub_services (
            id,
            name,
            description,
            price,
            duration_minutes,
            price_note,
            order_index
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const service = {
        ...data,
        category: data.service_categories,
        sub_services: data.sub_services?.sort((a: SubService, b: SubService) => a.order_index - b.order_index)
      };

      this.setCache(cacheKey, service);
      return service;
    } catch (error) {
      console.error(`Error fetching service by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Obtiene los profesionales de un servicio
   */
  async getProfessionalsByService(serviceId: string): Promise<Professional[]> {
    const cacheKey = `professionals_service_${serviceId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data, error } = await this.supabase.rpc('get_professionals_by_service', {
        p_service_id: serviceId
      });

      if (error) throw error;

      this.setCache(cacheKey, data || []);
      return data || [];
    } catch (error) {
      console.error(`Error fetching professionals for service ${serviceId}:`, error);
      return [];
    }
  }

  /**
   * Obtiene todos los profesionales
   */
  async getAllProfessionals(): Promise<Professional[]> {
    const cacheKey = 'all_professionals';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data, error } = await this.supabase
        .from('professionals')
        .select('*')
        .eq('active', true)
        .order('full_name');

      if (error) throw error;

      this.setCache(cacheKey, data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching all professionals:', error);
      return [];
    }
  }

  /**
   * Crea un nuevo servicio (solo admins)
   */
  async createService(service: Partial<Service>): Promise<Service | null> {
    try {
      const { data, error } = await this.supabase
        .from('services')
        .insert(service)
        .select()
        .single();

      if (error) throw error;

      this.invalidateCache();
      return data;
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  /**
   * Actualiza un servicio (solo admins)
   */
  async updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
    try {
      const { data, error } = await this.supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      this.invalidateCache();
      return data;
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }

  /**
   * Crea un sub-servicio (solo admins)
   */
  async createSubService(subService: Partial<SubService>): Promise<SubService | null> {
    try {
      const { data, error } = await this.supabase
        .from('sub_services')
        .insert(subService)
        .select()
        .single();

      if (error) throw error;

      this.invalidateCache();
      return data;
    } catch (error) {
      console.error('Error creating sub-service:', error);
      throw error;
    }
  }

  /**
   * Actualiza un sub-servicio (solo admins)
   */
  async updateSubService(id: string, updates: Partial<SubService>): Promise<SubService | null> {
    try {
      const { data, error } = await this.supabase
        .from('sub_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      this.invalidateCache();
      return data;
    } catch (error) {
      console.error('Error updating sub-service:', error);
      throw error;
    }
  }

  /**
   * Asigna un profesional a un servicio
   */
  async assignProfessionalToService(
    professionalId: string, 
    serviceId: string, 
    subServiceId?: string,
    isPrimary: boolean = false
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('professional_services')
        .insert({
          professional_id: professionalId,
          service_id: serviceId,
          sub_service_id: subServiceId,
          is_primary: isPrimary
        });

      if (error) throw error;

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error('Error assigning professional to service:', error);
      return false;
    }
  }

  /**
   * Desasigna un profesional de un servicio
   */
  async unassignProfessionalFromService(
    professionalId: string, 
    serviceId: string,
    subServiceId?: string
  ): Promise<boolean> {
    try {
      let query = this.supabase
        .from('professional_services')
        .delete()
        .eq('professional_id', professionalId)
        .eq('service_id', serviceId);

      if (subServiceId) {
        query = query.eq('sub_service_id', subServiceId);
      }

      const { error } = await query;

      if (error) throw error;

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error('Error unassigning professional from service:', error);
      return false;
    }
  }

  /**
   * Obtiene la configuración de un servicio
   */
  async getServiceSettings(serviceId: string): Promise<ServiceSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('service_settings')
        .select('*')
        .eq('service_id', serviceId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      return data;
    } catch (error) {
      console.error(`Error fetching settings for service ${serviceId}:`, error);
      return null;
    }
  }

  /**
   * Actualiza la configuración de un servicio
   */
  async updateServiceSettings(serviceId: string, settings: Partial<ServiceSettings>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('service_settings')
        .upsert({
          ...settings,
          service_id: serviceId
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error(`Error updating settings for service ${serviceId}:`, error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas del dashboard para servicios
   */
  async getServiceDashboardStats(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('service_dashboard_view')
        .select('*')
        .order('category_code')
        .order('name');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching service dashboard stats:', error);
      return [];
    }
  }

  // Métodos de caché
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry) return false;
    return Date.now() < expiry;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.cacheDuration);
  }

  private invalidateCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Limpia el caché manualmente
   */
  clearCache(): void {
    this.invalidateCache();
  }
}

// Funciones de conveniencia
export const getServicesWithDetails = async (supabaseClient: any): Promise<Service[]> => {
  const manager = new ServicesManager(supabaseClient);
  return manager.getServicesWithDetails();
};

export const getServiceByCode = async (supabaseClient: any, code: string): Promise<Service | null> => {
  const manager = new ServicesManager(supabaseClient);
  return manager.getServiceByCode(code);
};

export const getProfessionalsByService = async (supabaseClient: any, serviceId: string): Promise<Professional[]> => {
  const manager = new ServicesManager(supabaseClient);
  return manager.getProfessionalsByService(serviceId);
};






