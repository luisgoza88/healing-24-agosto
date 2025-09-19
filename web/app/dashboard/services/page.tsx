"use client"

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronRight,
  Activity,
  Heart,
  Sparkles,
  Dna,
  Droplet,
  Smile,
  HandHeart,
  HeartPulse,
  Wind,
  Calendar,
  Users,
  Clock,
  Loader2,
  AlertTriangle,
  Stethoscope,
  Flower2,
  HandHelping,
  HeartHandshake,
  ArrowRight,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSupabase } from "@/lib/supabase";

interface RpcServiceRow {
  service_id: string;
  service_code: string;
  service_name: string;
  service_description?: string;
  category_name?: string | null;
  category_code?: string | null;
  base_price?: number | null;
  duration_minutes?: number | null;
  color?: string | null;
  icon?: string | null;
  sub_services?: Array<{
    id: string;
    name: string;
    price?: number;
    duration_minutes?: number;
    price_note?: string | null;
  }>;
}

interface DashboardViewRow {
  id: string;
  code: string;
  name: string;
  category_name?: string | null;
  category_code?: string | null;
  total_appointments?: number | null;
  upcoming_appointments?: number | null;
  professional_count?: number | null;
  sub_service_count?: number | null;
}

interface ServiceSummary {
  id: string;
  code: string;
  name: string;
  description?: string;
  iconComponent: any;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  subServices: string[];
  categoryName?: string | null;
}

interface ServiceStats {
  totalAppointments: number;
  upcomingAppointments: number;
  totalRevenue: number;
  totalPatients: number;
  professionalCount: number;
  subServiceCount: number;
}

interface CategoryCard {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  subServices: string[];
  serviceCount?: number;
}

const STATIC_CATEGORIES: CategoryCard[] = [
  {
    id: "Medicina Funcional",
    name: "Medicina Funcional",
    icon: Stethoscope,
    color: "text-green-700",
    bgColor: "bg-gradient-to-br from-green-50 to-emerald-50",
    borderColor: "border-green-200",
    description: "Consultas especializadas y péptidos",
    subServices: [
      "Consulta funcional – primera vez",
      "Consulta funcional – seguimiento",
      "Consulta péptidos",
      "Consulta células madre"
    ]
  },
  {
    id: "Medicina Estética",
    name: "Medicina Estética",
    icon: Sparkles,
    color: "text-pink-700",
    bgColor: "bg-gradient-to-br from-pink-50 to-rose-50",
    borderColor: "border-pink-200",
    description: "Procedimientos estéticos avanzados",
    subServices: [
      "Consulta medicina estética valoración",
      "Procedimientos estéticos"
    ]
  },
  {
    id: "Medicina Regenerativa & Longevidad",
    name: "Medicina Regenerativa & Longevidad",
    icon: Heart,
    color: "text-red-700",
    bgColor: "bg-gradient-to-br from-red-50 to-orange-50",
    borderColor: "border-red-200",
    description: "Terapias antiedad y bienestar",
    subServices: [
      "Baño helado",
      "Sauna infrarrojo",
      "Baño helado + sauna infrarrojo",
      "Cámara hiperbárica"
    ]
  },
  {
    id: "DRIPS - Sueroterapia",
    name: "DRIPS - Sueroterapia",
    icon: Droplet,
    color: "text-blue-700",
    bgColor: "bg-gradient-to-br from-blue-50 to-sky-50",
    borderColor: "border-blue-200",
    description: "Terapias intravenosas y sueroterapia",
    subServices: [
      "Vitaminas - IV Drips",
      "NAD 125 mg",
      "NAD 500 mg",
      "NAD 1000 mg",
      "Ozonoterapia – suero ozonizado",
      "Ozonoterapia – autohemoterapia mayor"
    ]
  },
  {
    id: "Faciales",
    name: "Faciales",
    icon: Flower2,
    color: "text-purple-700",
    bgColor: "bg-gradient-to-br from-purple-50 to-lavender-50",
    borderColor: "border-purple-200",
    description: "Tratamientos faciales especializados",
    subServices: [
      "Clean Facial",
      "Glow Facial",
      "Anti-Age Facial",
      "Anti-Acné Facial",
      "Lymph Facial"
    ]
  },
  {
    id: "Masajes",
    name: "Masajes",
    icon: HandHelping,
    color: "text-amber-700",
    bgColor: "bg-gradient-to-br from-amber-50 to-yellow-50",
    borderColor: "border-amber-200",
    description: "Masajes terapéuticos y relajantes",
    subServices: [
      "Drenaje linfático",
      "Relajante"
    ]
  },
  {
    id: "Wellness Integral",
    name: "Wellness Integral",
    icon: HeartHandshake,
    color: "text-indigo-700",
    bgColor: "bg-gradient-to-br from-indigo-50 to-blue-50",
    borderColor: "border-indigo-200",
    description: "Servicios de bienestar integral",
    subServices: []
  },
  {
    id: "Breathe & Move",
    name: "Breathe & Move",
    icon: Wind,
    color: "text-cyan-700",
    bgColor: "bg-gradient-to-br from-cyan-50 to-sky-50",
    borderColor: "border-cyan-200",
    description: "Clases de movimiento consciente y respiración",
    subServices: [
      "Clases individuales",
      "Paquetes de clases"
    ]
  }
];

const ICON_FALLBACKS: Record<string, any> = {
  "medicina funcional": Stethoscope,
  "medicina estética": Sparkles,
  "medicina regenerativa & longevidad": Heart,
  "drips - sueroterapia": Droplet,
  faciales: Smile,
  masajes: HandHeart,
  "wellness integral": HeartPulse,
  "breathe & move": Activity
};

const SERVICE_COLOR_FALLBACKS: Record<string, string> = {
  "medicina funcional": "bg-gradient-to-br from-green-50 to-emerald-50",
  "medicina estética": "bg-gradient-to-br from-pink-50 to-rose-50",
  "medicina regenerativa & longevidad": "bg-gradient-to-br from-red-50 to-orange-50",
  "drips - sueroterapia": "bg-gradient-to-br from-blue-50 to-sky-50",
  faciales: "bg-gradient-to-br from-purple-50 to-lavender-50",
  masajes: "bg-gradient-to-br from-amber-50 to-yellow-50",
  "wellness integral": "bg-gradient-to-br from-indigo-50 to-blue-50",
  "breathe & move": "bg-gradient-to-br from-cyan-50 to-sky-50"
};

const asErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Error inesperado al cargar la información de servicios.";
};

export default function ServicesPage() {
  const router = useRouter();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [categories, setCategories] = useState<CategoryCard[]>(STATIC_CATEGORIES);
  const [statsByService, setStatsByService] = useState<Record<string, ServiceStats>>({});
  const [totalServices, setTotalServices] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [{ data: servicesData, error: servicesError }, { data: viewData, error: viewError }] = await Promise.all([
        supabase.rpc("get_services_with_details"),
        supabase.from("service_dashboard_view").select("*")
      ]);

      if (servicesError) {
        throw servicesError;
      }
      if (viewError) {
        throw viewError;
      }

      const rpcRows: RpcServiceRow[] = servicesData ?? [];
      const viewRows: DashboardViewRow[] = viewData ?? [];
      const statsMap = new Map<string, DashboardViewRow>(
        viewRows.map((row) => [row.id, row])
      );

      const mappedServices: ServiceSummary[] = rpcRows.map((service) => {
        const key = service.service_name?.toLowerCase() ?? "";
        const fallbackCategory = STATIC_CATEGORIES.find((cat) => cat.name === service.category_name);
        const iconComponent = fallbackCategory?.icon || ICON_FALLBACKS[key] || Briefcase;

        return {
          id: service.service_id,
          code: service.service_code,
          name: service.service_name,
          description: service.service_description ?? fallbackCategory?.description ?? "",
          iconComponent,
          colorClass: fallbackCategory?.color || "text-gray-700",
          bgClass: fallbackCategory?.bgColor || SERVICE_COLOR_FALLBACKS[key] || "bg-gradient-to-br from-gray-50 to-gray-100",
          borderClass: fallbackCategory?.borderColor || "border-gray-200",
          subServices: (service.sub_services ?? []).map((sub) => sub.name),
          categoryName: service.category_name ?? fallbackCategory?.name
        };
      });

      setServices(mappedServices);
      setTotalServices(mappedServices.length);

      const countByCategory = mappedServices.reduce<Record<string, number>>((acc, service) => {
        if (service.categoryName) {
          acc[service.categoryName] = (acc[service.categoryName] || 0) + 1;
        }
        return acc;
      }, {});

      setCategories(
        STATIC_CATEGORIES.map((category) => ({
          ...category,
          serviceCount: countByCategory[category.name] || 0
        }))
      );

      const serviceIds = mappedServices.map((service) => service.id).filter(Boolean);
      const today = new Date();
      const todayIso = today.toISOString().split("T")[0];

      if (serviceIds.length === 0) {
        setStatsByService({});
        setTodayAppointments(0);
        return;
      }

      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("service_id, status, appointment_date, total_amount, payment_status, user_id")
        .in("service_id", serviceIds);

      if (appointmentsError) {
        const message = appointmentsError.message?.toLowerCase().includes("permission denied")
          ? "No tienes permisos para ver la información de citas. Asegúrate de usar una cuenta administradora."
          : appointmentsError.message;
        throw new Error(message || "Error al cargar las citas");
      }

      const statsAccumulator: Record<string, ServiceStats> = {};
      const patientTracker: Record<string, Set<string>> = {};

      mappedServices.forEach((service) => {
        const viewRow = statsMap.get(service.id);
        statsAccumulator[service.id] = {
          totalAppointments: viewRow?.total_appointments ?? 0,
          upcomingAppointments: viewRow?.upcoming_appointments ?? 0,
          totalRevenue: 0,
          totalPatients: 0,
          professionalCount: viewRow?.professional_count ?? 0,
          subServiceCount: viewRow?.sub_service_count ?? 0,
        };
        patientTracker[service.id] = new Set();
      });

      if (appointments?.length) {
        appointments.forEach((apt) => {
          const serviceId = apt.service_id;
          const stats = statsAccumulator[serviceId];
          if (!stats) {
            return;
          }

          stats.totalAppointments += 1;

          if (apt.appointment_date >= todayIso && ["confirmed", "pending"].includes(apt.status)) {
            stats.upcomingAppointments += 1;
          }

          if (apt.payment_status === "paid" && typeof apt.total_amount === "number") {
            stats.totalRevenue += Number(apt.total_amount);
          }

          if (apt.user_id) {
            patientTracker[serviceId].add(apt.user_id);
          }
        });

        Object.entries(patientTracker).forEach(([serviceId, patients]) => {
          statsAccumulator[serviceId].totalPatients = patients.size;
        });

        const todayConfirmed = appointments.filter(
          (apt) => apt.appointment_date === todayIso && apt.status === "confirmed"
        ).length;
        setTodayAppointments(todayConfirmed);
      } else {
        setTodayAppointments(0);
      }

      setStatsByService(statsAccumulator);
    } catch (dashboardError) {
      console.error("[Services] Fatal error:", dashboardError);
      setError(asErrorMessage(dashboardError));
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryName?: string | null) => {
    if (!categoryName) {
      return;
    }

    if (categoryName === "Breathe & Move") {
      router.push("/dashboard/admin/breathe-move");
      return;
    }

    router.push("/dashboard/admin/services");
  };

  const aggregateStats = useMemo(() => {
    const values = Object.values(statsByService);
    return {
      totalAppointments: values.reduce((acc, item) => acc + item.totalAppointments, 0),
      upcomingAppointments: values.reduce((acc, item) => acc + item.upcomingAppointments, 0),
      totalRevenue: values.reduce((acc, item) => acc + item.totalRevenue, 0),
      totalPatients: values.reduce((acc, item) => acc + item.totalPatients, 0),
    };
  }, [statsByService]);

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestión de Servicios</h1>
          <p className="text-gray-600 text-lg">
            Administra todos los servicios médicos y de bienestar de Healing Forest
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            onClick={() => router.push("/dashboard/reports")}
          >
            <BarChart3 className="h-4 w-4" />
            Reportes
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            onClick={() => router.push("/dashboard/admin/services")}
          >
            <Activity className="h-4 w-4" />
            Nuevo Servicio
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total Servicios</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{totalServices}</p>
                <p className="text-xs text-green-600 mt-1">En todas las categorías</p>
              </div>
              <div className="p-3 bg-green-200/50 rounded-xl">
                <Activity className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Citas Confirmadas Hoy</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{todayAppointments}</p>
                <p className="text-xs text-blue-600 mt-1">Registros confirmados</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Pacientes Únicos</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{aggregateStats.totalPatients}</p>
                <p className="text-xs text-purple-600 mt-1">Últimas citas registradas</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Próximas Citas</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">{aggregateStats.upcomingAppointments}</p>
                <p className="text-xs text-amber-600 mt-1">Confirmadas y pendientes</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="h-6 w-6 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.name}
              className={`border ${category.borderColor} hover:shadow-lg transition-shadow`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {category.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
                <div className={`rounded-xl p-3 ${category.bgColor}`}>
                  <Icon className={`h-6 w-6 ${category.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{category.serviceCount || 0}</p>
                    <p className="text-xs text-gray-500">Servicios configurados</p>
                  </div>
                  <button
                    className="inline-flex items-center text-sm font-medium text-green-700 hover:text-green-800"
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    Gestionar
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </button>
                </div>
                {category.subServices.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm text-gray-600">
                    {category.subServices.slice(0, 4).map((subService) => (
                      <li key={subService} className="flex items-center">
                        <span className="mr-2 text-green-600">•</span>
                        {subService}
                      </li>
                    ))}
                    {category.subServices.length > 4 && (
                      <li className="text-xs text-gray-400">y más…</li>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service, index) => {
          const Icon = service.iconComponent || Briefcase;
          const stats = statsByService[service.id];

          return (
            <Card
              key={`${service.id || service.code || "service"}-${index}`}
              className={`border ${service.borderClass} hover:shadow-lg transition-shadow`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    {service.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
                <div className={`rounded-xl p-3 ${service.bgClass}`}>
                  <Icon className={`h-6 w-6 ${service.colorClass}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Total citas</p>
                      <p className="text-lg font-semibold text-gray-900">{stats.totalAppointments}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Próximas citas</p>
                      <p className="text-lg font-semibold text-gray-900">{stats.upcomingAppointments}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Profesionales asignados</p>
                      <p className="text-lg font-semibold text-gray-900">{stats.professionalCount}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Pacientes únicos</p>
                      <p className="text-lg font-semibold text-gray-900">{stats.totalPatients}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                    No hay información estadística disponible.
                  </div>
                )}

                {service.subServices.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Sub-servicios disponibles</p>
                    <div className="flex flex-wrap gap-2">
                      {service.subServices.map((subService) => (
                        <span key={subService} className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                          {subService}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  className="inline-flex items-center text-sm font-medium text-green-700 hover:text-green-800"
                  onClick={() => router.push(`/dashboard/admin/services?service=${service.code}`)}
                >
                  Ver detalles
                  <ArrowRight className="ml-1 h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
