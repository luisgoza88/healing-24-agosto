/**
 * HOOK DE SERVICIOS PARA REACT NATIVE
 * Usa el sistema unificado de servicios
 */

import { supabase } from '../lib/supabase';
import { 
  useServices as useUnifiedServices,
  useService as useUnifiedService,
  useProfessionals as useUnifiedProfessionals,
  useServicesAdmin as useUnifiedServicesAdmin,
  useServiceFormatters as useUnifiedServiceFormatters
} from '../../shared/hooks/useServices';

// Re-exportar tipos desde el sistema unificado
export type {
  Service,
  ServiceCategory,
  SubService,
  Professional,
  ServiceSettings
} from '../../shared/utils/servicesManager';

/**
 * Hook para obtener todos los servicios
 */
export function useServices() {
  return useUnifiedServices(supabase);
}

/**
 * Hook para obtener un servicio específico
 */
export function useService(serviceCode?: string, serviceId?: string) {
  return useUnifiedService(supabase, serviceCode, serviceId);
}

/**
 * Hook para obtener profesionales
 */
export function useProfessionals(serviceId?: string) {
  return useUnifiedProfessionals(supabase, serviceId);
}

/**
 * Hook para administración de servicios
 */
export function useServicesAdmin() {
  return useUnifiedServicesAdmin(supabase);
}

/**
 * Hook para formatear servicios
 */
export function useServiceFormatters() {
  return useUnifiedServiceFormatters();
}

// Funciones de conveniencia específicas para React Native
export { 
  getServicesWithDetails, 
  getServiceByCode, 
  getProfessionalsByService 
} from '../../shared/utils/servicesManager';
