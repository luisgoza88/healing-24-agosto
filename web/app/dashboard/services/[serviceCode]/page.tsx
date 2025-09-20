'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Calendar, Clock, CreditCard, Users, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabase } from '@/lib/supabase';
import Link from 'next/link';

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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header con navegación */}
      <div className="mb-6">
        <Link
          href="/dashboard/services"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver a servicios
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{service.name}</h1>
            {service.category_name && (
              <p className="text-lg text-gray-600 mt-1">{service.category_name}</p>
            )}
            {service.description && (
              <p className="text-gray-700 mt-3 max-w-3xl">{service.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Lista de subservicios */}
      {service.sub_services && service.sub_services.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Selecciona un servicio específico
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {service.sub_services.map((subService) => (
              <Card
                key={subService.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-gray-200"
                onClick={() => handleSubServiceClick(subService)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{subService.name}</CardTitle>
                  {subService.description && (
                    <CardDescription>{subService.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span className="text-sm">{formatDuration(subService.duration_minutes)}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <CreditCard className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">{formatCurrency(subService.price)}</span>
                      </div>
                    </div>
                    
                    {subService.price_note && (
                      <p className="text-xs text-gray-500 italic">{subService.price_note}</p>
                    )}
                    
                    {subService.max_capacity && (
                      <div className="flex items-center text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        <span className="text-sm">Capacidad máxima: {subService.max_capacity}</span>
                      </div>
                    )}
                    
                    <button className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      <Calendar className="h-4 w-4" />
                      Ver calendario
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">
                  Este servicio no tiene subservicios configurados
                </p>
                <p className="text-amber-700 text-sm mt-1">
                  Contacta al administrador para configurar los subservicios disponibles.
                </p>
                <button
                  onClick={() => router.push(`/dashboard/appointments/new?serviceId=${service.id}`)}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Ir al calendario general
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}