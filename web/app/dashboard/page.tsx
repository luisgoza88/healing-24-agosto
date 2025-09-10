"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { Calendar, Users, DollarSign, TrendingUp } from "lucide-react";

interface DashboardStats {
  todayAppointments: number;
  totalPatients: number;
  todayRevenue: number;
  monthlyRevenue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    totalPatients: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Citas de hoy
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today)
        .neq('status', 'cancelled');

      // Total de pacientes
      const { count: patientsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Ingresos del día
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('created_at::date', today)
        .eq('status', 'completed');

      const todayRevenue = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Ingresos del mes
      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', firstDayOfMonth)
        .eq('status', 'completed');

      const monthlyRevenue = monthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        todayAppointments: todayCount || 0,
        totalPatients: patientsCount || 0,
        todayRevenue,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Panel Administrativo - Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Citas Hoy</p>
              <p className="text-2xl font-bold text-gray-800">{stats.todayAppointments}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pacientes</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalPatients}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Hoy</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.todayRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.monthlyRevenue)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Aquí puedes agregar más secciones como gráficas, citas próximas, etc. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Citas de Hoy</h2>
          <p className="text-gray-600">Lista de citas programadas para hoy...</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Actividad Reciente</h2>
          <p className="text-gray-600">Últimas actividades en el sistema...</p>
        </div>
      </div>
    </div>
  );
}