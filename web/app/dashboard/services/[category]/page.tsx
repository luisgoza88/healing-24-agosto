'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';
import CalendarView from '@/components/ServiceCalendarView';
import { 
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  MoreVertical,
  Loader2,
  Activity,
  Sparkles,
  Heart,
  TreePine,
  Wind,
  Flower2,
  HandHelping,
  HeartHandshake,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Droplet
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  base_price: number;
  active: boolean;
  created_at: string;
  sub_services?: SubService[];
}

interface SubService {
  id: string;
  service_id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
}

interface Professional {
  id: string;
  full_name: string;
  specialties?: string[];
  avatar_url?: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  total_amount: number;
  patient: {
    full_name: string;
  };
  professional: {
    full_name: string;
  };
  service?: {
    name: string;
  };
}

const categoryInfo: Record<string, { name: string; icon: any; color: string; bgColor: string }> = {
  'medicina-funcional': { name: 'Medicina Funcional', icon: Activity, color: 'text-green-700', bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50' },
  'medicina-estetica': { name: 'Medicina Estética', icon: Sparkles, color: 'text-pink-700', bgColor: 'bg-gradient-to-br from-pink-50 to-rose-50' },
  'medicina-regenerativa': { name: 'Medicina Regenerativa & Longevidad', icon: Heart, color: 'text-red-700', bgColor: 'bg-gradient-to-br from-red-50 to-orange-50' },
  'drips': { name: 'DRIPS - Sueroterapia', icon: Droplet, color: 'text-blue-700', bgColor: 'bg-gradient-to-br from-blue-50 to-sky-50' },
  'faciales': { name: 'Faciales', icon: Flower2, color: 'text-purple-700', bgColor: 'bg-gradient-to-br from-purple-50 to-lavender-50' },
  'masajes': { name: 'Masajes', icon: HandHelping, color: 'text-amber-700', bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-50' },
  'wellness-integral': { name: 'Wellness Integral', icon: HeartHandshake, color: 'text-indigo-700', bgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50' },
  'breathe-move': { name: 'Breathe & Move', icon: Wind, color: 'text-cyan-700', bgColor: 'bg-gradient-to-br from-cyan-50 to-sky-50' },
};

export default function ServiceCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const categoryData = categoryInfo[category] || { 
    name: category, 
    icon: Activity, 
    color: 'text-gray-600',
    bgColor: 'bg-gray-50' 
  };
  const CategoryIcon = categoryData.icon;

  useEffect(() => {
    loadCategoryData();
  }, [category, selectedDate, viewMode]);

  const loadCategoryData = async () => {
    try {
      setLoading(true);

      // Cargar servicios
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('category', category)
        .order('name');

      if (servicesData && !servicesError) {
        setServices(servicesData);
      }

      // Solo cargar profesionales si hay servicios
      if (servicesData && servicesData.length > 0) {
        // Por ahora, cargar todos los profesionales ya que no tenemos la tabla professional_services
        const { data: professionalsData } = await supabase
          .from('professionals')
          .select('id, full_name, specialties, avatar_url')
          .order('full_name');

        if (professionalsData) {
          setProfessionals(professionalsData);
        }

        // Cargar citas según la vista actual
        const serviceIds = servicesData.map(s => s.id);
        let startDate: Date;
        let endDate: Date;
        
        if (viewMode === 'week') {
          // Obtener inicio y fin de la semana
          startDate = new Date(selectedDate);
          const day = startDate.getDay();
          const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
          startDate.setDate(diff);
          
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
        } else {
          // Obtener inicio y fin del mes
          startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        }
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:profiles!appointments_user_id_fkey (full_name, email, phone),
            professional:professionals!appointments_professional_id_fkey (full_name),
            service:services!appointments_service_id_fkey (name)
          `)
          .in('service_id', serviceIds)
          .gte('appointment_date', startStr)
          .lte('appointment_date', endStr)
          .order('appointment_date')
          .order('appointment_time');

        if (appointmentsData) {
          setAppointments(appointmentsData);
        }
      }

    } catch (error) {
      console.error('Error loading category data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')} COP`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-gray-600">Cargando servicios...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push('/dashboard/services')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className={`p-4 ${categoryData.bgColor} rounded-xl ${categoryData.color}`}>
            <CategoryIcon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {categoryData.name}
            </h1>
            <p className="text-gray-600">
              {services.length} servicios disponibles
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Servicios</p>
                <p className="text-2xl font-bold">{services.length}</p>
              </div>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profesionales</p>
                <p className="text-2xl font-bold">{professionals.length}</p>
              </div>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Citas Próximas</p>
                <p className="text-2xl font-bold">{appointments.length}</p>
              </div>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold">
                  {services.filter(s => s.active).length}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="services">Servicios</TabsTrigger>
            <TabsTrigger value="appointments">Citas</TabsTrigger>
            <TabsTrigger value="professionals">Profesionales</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Servicio
            </Button>
          </div>
        </div>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <Card key={service.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {service.description}
                      </p>
                    </div>
                    <Badge variant={service.active ? "success" : "secondary"}>
                      {service.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duración:</span>
                      <span className="font-medium">{service.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Precio base:</span>
                      <span className="font-medium">{formatPrice(service.base_price)}</span>
                    </div>
                    {service.sub_services && service.sub_services.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-600">Sub-servicios:</span>
                        <span className="font-medium ml-1">
                          {service.sub_services.length}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Próximas Citas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {appointment.patient?.full_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {appointment.service?.name} • {formatDate(appointment.appointment_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {appointment.professional?.full_name}
                      </Badge>
                      <Badge variant={
                        appointment.status === 'confirmed' ? 'success' : 
                        appointment.status === 'pending' ? 'warning' : 'secondary'
                      }>
                        {appointment.status === 'confirmed' ? 'Confirmada' :
                         appointment.status === 'pending' ? 'Pendiente' : appointment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professionals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {professionals.map((professional) => (
              <Card key={professional.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {professional.avatar_url ? (
                        <img
                          src={professional.avatar_url}
                          alt={professional.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{professional.full_name}</p>
                      <p className="text-sm text-gray-600">{professional.specialties?.join(', ') || 'Especialista'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <CalendarView 
            category={category}
            categoryData={categoryData}
            services={services}
            professionals={professionals}
            appointments={appointments}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onRefresh={loadCategoryData}
            categoryName={categoryData.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}