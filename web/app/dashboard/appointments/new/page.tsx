'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Calendar, Clock, CreditCard, Users, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabase } from '@/lib/supabase';
import Link from 'next/link';
import ServiceCalendarPanel from '@/components/admin/ServiceCalendarPanel';
import { useServiceDashboard, type ServiceDashboardViewMode } from '@/hooks/useServiceDashboard';

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

function NewAppointmentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useSupabase();
  
  const serviceId = searchParams.get('serviceId');
  const subServiceId = searchParams.get('subServiceId');
  
  const [service, setService] = useState<Service | null>(null);
  const [selectedSubService, setSelectedSubService] = useState<SubService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'service' | 'subservice' | 'calendar'>('service');
  
  // Calendar state
  const [viewMode, setViewMode] = useState<ServiceDashboardViewMode>('week');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  
  // Hook para el calendario
  const { events, loading: calendarLoading } = useServiceDashboard({
    serviceId: service?.id,
    viewMode,
    referenceDate,
  });

  useEffect(() => {
    if (serviceId) {
      loadServiceDetails();
    } else {
      setStep('service');
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    if (subServiceId && service?.sub_services) {
      const subService = service.sub_services.find(ss => ss.id === subServiceId);
      if (subService) {
        setSelectedSubService(subService);
        setStep('calendar');
      }
    }
  }, [subServiceId, service]);

  const loadServiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('services')
        .select(`
          *,
          sub_services (*)
        `)
        .eq('id', serviceId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        throw new Error('Servicio no encontrado');
      }

      setService(data);
      
      // Determinar el paso inicial
      if (data.sub_services && data.sub_services.length > 0) {
        setStep('subservice');
      } else {
        setStep('calendar');
      }
    } catch (err) {
      console.error('Error loading service details:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (selectedService: Service) => {
    router.push(`/dashboard/appointments/new?serviceId=${selectedService.id}`);
  };

  const handleSubServiceSelect = (subService: SubService) => {
    setSelectedSubService(subService);
    setStep('calendar');
    router.push(`/dashboard/appointments/new?serviceId=${service?.id}&subServiceId=${subService.id}`);
  };

  const handleEventSelect = (event: any) => {
    // Aquí se puede implementar la lógica para seleccionar un horario específico
    console.log('Evento seleccionado:', event);
  };

  const handleSlotSelect = ({ start, end }: { start: Date; end: Date }) => {
    // Aquí se puede implementar la lógica para crear una nueva cita
    console.log('Horario seleccionado:', { start, end });
    // router.push(`/dashboard/appointments/create?serviceId=${service?.id}&subServiceId=${selectedSubService?.id}&start=${start.toISOString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-gray-600">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Link
          href="/dashboard/appointments"
          className="inline-flex items-center mt-4 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver a citas
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/dashboard/appointments" className="hover:text-gray-900">
            Citas
          </Link>
          <ChevronRight className="h-4 w-4" />
          {step === 'service' && <span className="text-gray-900">Seleccionar servicio</span>}
          {step === 'subservice' && (
            <>
              <Link
                href="/dashboard/appointments/new"
                className="hover:text-gray-900"
              >
                Servicios
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900">{service?.name}</span>
            </>
          )}
          {step === 'calendar' && (
            <>
              <Link
                href="/dashboard/appointments/new"
                className="hover:text-gray-900"
              >
                Servicios
              </Link>
              <ChevronRight className="h-4 w-4" />
              {service?.sub_services && service.sub_services.length > 0 ? (
                <>
                  <Link
                    href={`/dashboard/appointments/new?serviceId=${service.id}`}
                    className="hover:text-gray-900"
                  >
                    {service.name}
                  </Link>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-gray-900">{selectedSubService?.name || 'Calendario'}</span>
                </>
              ) : (
                <span className="text-gray-900">{service?.name}</span>
              )}
            </>
          )}
        </nav>
      </div>

      {/* Contenido principal */}
      {step === 'service' && <ServiceSelection onSelect={handleServiceSelect} />}
      
      {step === 'subservice' && service && (
        <SubServiceSelection
          service={service}
          onSelect={handleSubServiceSelect}
          onBack={() => {
            setStep('service');
            router.push('/dashboard/appointments/new');
          }}
        />
      )}
      
      {step === 'calendar' && service && (
        <CalendarView
          service={service}
          subService={selectedSubService}
          events={events}
          loading={calendarLoading}
          viewMode={viewMode}
          referenceDate={referenceDate}
          onViewChange={setViewMode}
          onNavigate={setReferenceDate}
          onSelectEvent={handleEventSelect}
          onSelectSlot={handleSlotSelect}
          onBack={() => {
            if (service.sub_services && service.sub_services.length > 0) {
              setStep('subservice');
              router.push(`/dashboard/appointments/new?serviceId=${service.id}`);
            } else {
              setStep('service');
              router.push('/dashboard/appointments/new');
            }
          }}
        />
      )}
    </div>
  );
}

// Componente para selección de servicio
function ServiceSelection({ onSelect }: { onSelect: (service: Service) => void }) {
  const supabase = useSupabase();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_services_with_details');

      if (error) throw error;

      setServices(data?.map((s: any) => ({
        id: s.service_id,
        code: s.service_code,
        name: s.service_name,
        description: s.service_description,
        category_name: s.category_name,
      })) || []);
    } catch (err) {
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Selecciona un servicio
      </h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card
            key={service.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onSelect(service)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{service.name}</CardTitle>
              {service.category_name && (
                <CardDescription>{service.category_name}</CardDescription>
              )}
            </CardHeader>
            {service.description && (
              <CardContent>
                <p className="text-sm text-gray-600">{service.description}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// Componente para selección de subservicio
function SubServiceSelection({ 
  service, 
  onSelect, 
  onBack 
}: { 
  service: Service; 
  onSelect: (subService: SubService) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
          <p className="text-gray-600 mt-1">Selecciona un servicio específico</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Cambiar servicio
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {service.sub_services?.map((subService) => (
          <Card
            key={subService.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onSelect(subService)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{subService.name}</CardTitle>
              {subService.description && (
                <CardDescription>{subService.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Componente para vista de calendario
function CalendarView({ 
  service,
  subService,
  events,
  loading,
  viewMode,
  referenceDate,
  onViewChange,
  onNavigate,
  onSelectEvent,
  onSelectSlot,
  onBack
}: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {subService ? subService.name : service.name}
          </h1>
          <p className="text-gray-600 mt-1">
            Selecciona un horario disponible
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Cambiar {service.sub_services?.length > 0 ? 'subservicio' : 'servicio'}
        </button>
      </div>
      
      <ServiceCalendarPanel
        events={events}
        loading={loading}
        viewMode={viewMode}
        referenceDate={referenceDate}
        onViewChange={onViewChange}
        onNavigate={onNavigate}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
      />
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
      </div>
    }>
      <NewAppointmentContent />
    </Suspense>
  );
}