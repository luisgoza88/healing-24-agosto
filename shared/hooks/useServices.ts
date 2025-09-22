/**
 * HOOKS UNIFICADOS DE SERVICIOS
 * Funciona tanto en React Native como en Next.js
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  ServicesManager, 
  Service, 
  ServiceCategory, 
  SubService, 
  Professional,
  ServiceSettings 
} from '../utils/servicesManager';

/**
 * Hook principal para obtener servicios
 */
export function useServices(supabaseClient: any) {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const manager = new ServicesManager(supabaseClient);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [servicesData, categoriesData] = await Promise.all([
        manager.getServicesWithDetails(),
        manager.getCategories()
      ]);

      setServices(servicesData);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Error loading services:', err);
      setError(err.message || 'Error al cargar los servicios');
    } finally {
      setLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getServiceByCode = useCallback(async (code: string) => {
    return manager.getServiceByCode(code);
  }, [manager]);

  const getServiceById = useCallback(async (id: string) => {
    return manager.getServiceById(id);
  }, [manager]);

  const refresh = useCallback(() => {
    manager.clearCache();
    loadData();
  }, [manager, loadData]);

  return {
    services,
    categories,
    loading,
    error,
    getServiceByCode,
    getServiceById,
    refresh
  };
}

/**
 * Hook para un servicio específico
 */
export function useService(supabaseClient: any, serviceCode?: string, serviceId?: string) {
  const [service, setService] = useState<Service | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [settings, setSettings] = useState<ServiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const manager = new ServicesManager(supabaseClient);

  const loadService = useCallback(async () => {
    if (!serviceCode && !serviceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let serviceData: Service | null = null;

      if (serviceCode) {
        serviceData = await manager.getServiceByCode(serviceCode);
      } else if (serviceId) {
        serviceData = await manager.getServiceById(serviceId);
      }

      if (!serviceData) {
        throw new Error('Servicio no encontrado');
      }

      setService(serviceData);

      // Cargar profesionales y configuración
      const [professionalsData, settingsData] = await Promise.all([
        manager.getProfessionalsByService(serviceData.id),
        manager.getServiceSettings(serviceData.id)
      ]);

      setProfessionals(professionalsData);
      setSettings(settingsData);
    } catch (err: any) {
      console.error('Error loading service:', err);
      setError(err.message || 'Error al cargar el servicio');
      setService(null);
    } finally {
      setLoading(false);
    }
  }, [serviceCode, serviceId, manager]);

  useEffect(() => {
    loadService();
  }, [loadService]);

  const updateService = useCallback(async (updates: Partial<Service>) => {
    if (!service) return null;

    try {
      const updated = await manager.updateService(service.id, updates);
      if (updated) {
        setService(updated);
      }
      return updated;
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }, [service, manager]);

  const updateSettings = useCallback(async (updates: Partial<ServiceSettings>) => {
    if (!service) return false;

    try {
      const success = await manager.updateServiceSettings(service.id, updates);
      if (success) {
        const newSettings = await manager.getServiceSettings(service.id);
        setSettings(newSettings);
      }
      return success;
    } catch (error) {
      console.error('Error updating service settings:', error);
      return false;
    }
  }, [service, manager]);

  const refresh = useCallback(() => {
    manager.clearCache();
    loadService();
  }, [manager, loadService]);

  return {
    service,
    professionals,
    settings,
    loading,
    error,
    updateService,
    updateSettings,
    refresh
  };
}

/**
 * Hook para profesionales
 */
export function useProfessionals(supabaseClient: any, serviceId?: string) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const manager = new ServicesManager(supabaseClient);

  const loadProfessionals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let data: Professional[];

      if (serviceId) {
        data = await manager.getProfessionalsByService(serviceId);
      } else {
        data = await manager.getAllProfessionals();
      }

      setProfessionals(data);
    } catch (err: any) {
      console.error('Error loading professionals:', err);
      setError(err.message || 'Error al cargar los profesionales');
    } finally {
      setLoading(false);
    }
  }, [serviceId, manager]);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  const assignToService = useCallback(async (
    professionalId: string, 
    serviceId: string, 
    subServiceId?: string,
    isPrimary: boolean = false
  ) => {
    const success = await manager.assignProfessionalToService(
      professionalId, 
      serviceId, 
      subServiceId, 
      isPrimary
    );
    
    if (success) {
      await loadProfessionals();
    }
    
    return success;
  }, [manager, loadProfessionals]);

  const unassignFromService = useCallback(async (
    professionalId: string, 
    serviceId: string,
    subServiceId?: string
  ) => {
    const success = await manager.unassignProfessionalFromService(
      professionalId, 
      serviceId, 
      subServiceId
    );
    
    if (success) {
      await loadProfessionals();
    }
    
    return success;
  }, [manager, loadProfessionals]);

  const refresh = useCallback(() => {
    manager.clearCache();
    loadProfessionals();
  }, [manager, loadProfessionals]);

  return {
    professionals,
    loading,
    error,
    assignToService,
    unassignFromService,
    refresh
  };
}

/**
 * Hook para administración de servicios (solo admins)
 */
export function useServicesAdmin(supabaseClient: any) {
  const [dashboardStats, setDashboardStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const manager = new ServicesManager(supabaseClient);

  const loadDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const stats = await manager.getServiceDashboardStats();
      setDashboardStats(stats);
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.message || 'Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  const createService = useCallback(async (service: Partial<Service>) => {
    try {
      const newService = await manager.createService(service);
      await loadDashboardStats();
      return newService;
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }, [manager, loadDashboardStats]);

  const updateService = useCallback(async (id: string, updates: Partial<Service>) => {
    try {
      const updated = await manager.updateService(id, updates);
      await loadDashboardStats();
      return updated;
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }, [manager, loadDashboardStats]);

  const createSubService = useCallback(async (subService: Partial<SubService>) => {
    try {
      const newSubService = await manager.createSubService(subService);
      await loadDashboardStats();
      return newSubService;
    } catch (error) {
      console.error('Error creating sub-service:', error);
      throw error;
    }
  }, [manager, loadDashboardStats]);

  const updateSubService = useCallback(async (id: string, updates: Partial<SubService>) => {
    try {
      const updated = await manager.updateSubService(id, updates);
      await loadDashboardStats();
      return updated;
    } catch (error) {
      console.error('Error updating sub-service:', error);
      throw error;
    }
  }, [manager, loadDashboardStats]);

  const refresh = useCallback(() => {
    manager.clearCache();
    loadDashboardStats();
  }, [manager, loadDashboardStats]);

  return {
    dashboardStats,
    loading,
    error,
    createService,
    updateService,
    createSubService,
    updateSubService,
    refresh
  };
}

/**
 * Hook para formatear precios
 */
export function useServiceFormatters() {
  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }, []);

  const formatDuration = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}min`;
    }
  }, []);

  const getServiceIcon = useCallback((iconName: string): string => {
    // Mapeo de iconos para diferentes plataformas
    const iconMap: Record<string, string> = {
      'medical-bag': '💼',
      'face-woman-shimmer': '✨',
      'dna': '🧬',
      'medical-services': '💉',
      'face': '😊',
      'spa': '🧘‍♀️',
      'heart-pulse': '💓',
      'fitness': '🏃‍♀️'
    };
    
    return iconMap[iconName] || '📋';
  }, []);

  return {
    formatPrice,
    formatDuration,
    getServiceIcon
  };
}










