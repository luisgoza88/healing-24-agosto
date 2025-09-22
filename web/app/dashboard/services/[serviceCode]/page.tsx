'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Calendar, Clock, CreditCard, Users, AlertCircle, Loader2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabase } from '@/lib/supabase';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/ui/button';
import ServiceDashboard from '@/components/ServiceDashboard';

interface SubService {
  id: string;
  name: string;
  description?: string;
  price: number;
  price_note?: string;
  duration_minutes: number;
  max_capacity?: number;
}

interface Service {
  id: string;
  code: string;
  name: string;
  description?: string;
  category_name?: string;
  sub_services?: SubService[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes}min`;
};

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useSupabase();
  const serviceCode = params.serviceCode as string;
  
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    loadServiceDetails();
  }, [serviceCode]);

  const loadServiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener detalles del servicio usando el código
      const { data, error: fetchError } = await supabase
        .rpc('get_services_with_details')
        .eq('service_code', serviceCode)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        throw new Error('Servicio no encontrado');
      }

      setService({
        id: data.service_id,
        code: data.service_code,
        name: data.service_name,
        description: data.service_description,
        category_name: data.category_name,
        sub_services: data.sub_services || [],
      });
    } catch (err) {
      console.error('Error loading service details:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const handleSubServiceClick = (subService: SubService) => {
    // Navegar al calendario con el subservicio preseleccionado
    router.push(`/dashboard/appointments/new?serviceId=${service?.id}&subServiceId=${subService.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-gray-600">Cargando servicio...</span>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'No se pudo cargar el servicio'}
          </AlertDescription>
        </Alert>
        <Link
          href="/dashboard/services"
          className="inline-flex items-center mt-4 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver a servicios
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header con navegación */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Link
          href="/dashboard/services"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver a servicios
        </Link>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{service.name}</h1>
            {service.category_name && (
              <p className="text-lg text-muted-foreground mt-1">{service.category_name}</p>
            )}
            {service.description && (
              <p className="text-muted-foreground mt-3 max-w-3xl">{service.description}</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowDashboard(!showDashboard)}
            leftIcon={<BarChart3 className="h-4 w-4" />}
          >
            {showDashboard ? 'Ver servicios' : 'Ver dashboard'}
          </Button>
        </div>
      </motion.div>

      {/* Dashboard or Services */}
      {showDashboard ? (
        <ServiceDashboard
          serviceId={service.id}
          serviceName={service.name}
          serviceCode={service.code}
        />
      ) : (
        <>
          {/* Lista de subservicios */}
          {service.sub_services && service.sub_services.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Selecciona un servicio específico
              </h2>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {service.sub_services.map((subService, index) => (
                  <motion.div
                    key={subService.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1"
                      onClick={() => handleSubServiceClick(subService)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">{subService.name}</CardTitle>
                        {subService.description && (
                          <p className="text-sm text-muted-foreground">{subService.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-muted-foreground">
                              <Clock className="h-4 w-4 mr-2" />
                              <span className="text-sm">{formatDuration(subService.duration_minutes)}</span>
                            </div>
                            <div className="flex items-center text-foreground">
                              <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="text-sm font-medium">{formatCurrency(subService.price)}</span>
                            </div>
                          </div>
                          
                          {subService.price_note && (
                            <p className="text-xs text-muted-foreground italic">{subService.price_note}</p>
                          )}
                          
                          {subService.max_capacity && (
                            <div className="flex items-center text-muted-foreground">
                              <Users className="h-4 w-4 mr-2" />
                              <span className="text-sm">Capacidad máxima: {subService.max_capacity}</span>
                            </div>
                          )}
                          
                          <Button className="w-full mt-3" leftIcon={<Calendar className="h-4 w-4" />}>
                            Ver calendario
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-yellow-500/20 bg-yellow-500/10">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-yellow-800 dark:text-yellow-300 font-medium">
                        Este servicio no tiene subservicios configurados
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                        Contacta al administrador para configurar los subservicios disponibles.
                      </p>
                      <Button
                        onClick={() => router.push(`/dashboard/appointments/new?serviceId=${service.id}`)}
                        className="mt-3"
                        leftIcon={<Calendar className="h-4 w-4" />}
                      >
                        Ir al calendario general
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}