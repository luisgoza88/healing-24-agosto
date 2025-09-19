-- =====================================================
-- MIGRACIÓN: VISTAS PARA DASHBOARD DE SERVICIOS
-- Fecha: 2025-09-12
-- Descripción: Crea vistas optimizadas para el dashboard administrativo
-- =====================================================

-- 1. Vista de estadísticas generales del dashboard
-- =====================================================
CREATE OR REPLACE VIEW public.dashboard_stats_view AS
SELECT 
    -- Citas de hoy
    (SELECT COUNT(*) 
     FROM appointments 
     WHERE DATE(appointment_date) = CURRENT_DATE 
     AND status NOT IN ('cancelled', 'no_show')) as today_appointments,
    
    -- Total de pacientes activos
    (SELECT COUNT(DISTINCT id) 
     FROM profiles 
     WHERE role = 'client') as total_patients,
    
    -- Ingresos del día
    (SELECT COALESCE(SUM(amount), 0) 
     FROM payments 
     WHERE DATE(created_at) = CURRENT_DATE 
     AND status = 'completed') as today_revenue,
    
    -- Ingresos del mes
    (SELECT COALESCE(SUM(amount), 0) 
     FROM payments 
     WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
     AND status = 'completed') as monthly_revenue,
    
    -- Servicios activos
    (SELECT COUNT(*) 
     FROM services 
     WHERE active = true) as active_services,
    
    -- Profesionales activos
    (SELECT COUNT(*) 
     FROM professionals 
     WHERE is_active = true) as active_professionals;

-- Permisos para la vista
GRANT SELECT ON public.dashboard_stats_view TO authenticated;

-- 2. Vista de citas del día con detalles
-- =====================================================
CREATE OR REPLACE VIEW public.today_appointments_view AS
SELECT 
    a.id,
    a.appointment_date,
    a.status,
    a.notes,
    a.created_at,
    -- Información del paciente
    p.full_name as patient_name,
    p.email as patient_email,
    p.phone as patient_phone,
    -- Información del servicio
    s.name as service_name,
    s.duration_minutes,
    s.base_price as service_price,
    -- Información del profesional
    pr.full_name as professional_name,
    pr.specialties as professional_specialty
FROM appointments a
INNER JOIN profiles p ON a.user_id = p.id
INNER JOIN services s ON a.service_id = s.id
LEFT JOIN professionals pr ON a.professional_id = pr.id
WHERE DATE(a.appointment_date) = CURRENT_DATE
ORDER BY a.appointment_date ASC;

-- Permisos
GRANT SELECT ON public.today_appointments_view TO authenticated;

-- 3. Vista de estadísticas por servicio
-- =====================================================
CREATE OR REPLACE VIEW public.service_stats_view AS
SELECT 
    s.id,
    s.name,
    s.code,
    s.active,
    s.base_price,
    sc.name as category_name,
    -- Estadísticas de uso
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT a.user_id) as unique_patients,
    COALESCE(SUM(p.amount), 0) as total_revenue,
    -- Estadísticas del mes actual
    COUNT(DISTINCT CASE 
        WHEN DATE_TRUNC('month', a.appointment_date) = DATE_TRUNC('month', CURRENT_DATE) 
        THEN a.id 
    END) as monthly_appointments,
    COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', CURRENT_DATE) 
        THEN p.amount 
    END), 0) as monthly_revenue
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
LEFT JOIN appointments a ON s.id = a.service_id AND a.status = 'completed'
LEFT JOIN payments p ON a.id = p.appointment_id AND p.status = 'completed'
GROUP BY s.id, s.name, s.code, s.active, s.base_price, sc.name;

-- Permisos
GRANT SELECT ON public.service_stats_view TO authenticated;

-- 4. Vista de ocupación de profesionales
-- =====================================================
CREATE OR REPLACE VIEW public.professional_occupancy_view AS
SELECT 
    pr.id,
    pr.full_name,
    pr.specialties,
    pr.is_active,
    -- Citas de hoy
    COUNT(DISTINCT CASE 
        WHEN DATE(a.appointment_date) = CURRENT_DATE 
        THEN a.id 
    END) as today_appointments,
    -- Citas de esta semana
    COUNT(DISTINCT CASE 
        WHEN DATE_TRUNC('week', a.appointment_date) = DATE_TRUNC('week', CURRENT_DATE) 
        THEN a.id 
    END) as week_appointments,
    -- Citas del mes
    COUNT(DISTINCT CASE 
        WHEN DATE_TRUNC('month', a.appointment_date) = DATE_TRUNC('month', CURRENT_DATE) 
        THEN a.id 
    END) as month_appointments,
    -- Próxima cita disponible
    MIN(CASE 
        WHEN a.appointment_date > CURRENT_TIMESTAMP 
        THEN a.appointment_date 
    END) as next_appointment
FROM professionals pr
LEFT JOIN appointments a ON pr.id = a.professional_id 
    AND a.status NOT IN ('cancelled', 'no_show')
GROUP BY pr.id, pr.full_name, pr.specialties, pr.is_active;

-- Permisos
GRANT SELECT ON public.professional_occupancy_view TO authenticated;

-- 5. Vista de resumen de pagos
-- =====================================================
CREATE OR REPLACE VIEW public.payment_summary_view AS
SELECT 
    DATE_TRUNC('day', created_at) as payment_date,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_amount,
    SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
    SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_amount,
    COUNT(CASE WHEN payment_method = 'credit_card' THEN 1 END) as credit_card_count,
    COUNT(CASE WHEN payment_method = 'debit_card' THEN 1 END) as debit_card_count,
    COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_count,
    COUNT(CASE WHEN payment_method = 'transfer' THEN 1 END) as transfer_count
FROM payments
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY payment_date DESC;

-- Permisos
GRANT SELECT ON public.payment_summary_view TO authenticated;

-- 6. Vista de actividad reciente
-- =====================================================
CREATE OR REPLACE VIEW public.recent_activity_view AS
SELECT * FROM (
    -- Nuevas citas
    SELECT 
        'appointment' as activity_type,
        a.id,
        a.created_at,
        'Nueva cita agendada' as description,
        json_build_object(
            'patient_name', p.full_name,
            'service', s.name,
            'date', a.appointment_date
        ) as details
    FROM appointments a
    JOIN profiles p ON a.user_id = p.id
    JOIN services s ON a.service_id = s.id
    WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
    
    UNION ALL
    
    -- Nuevos pagos
    SELECT 
        'payment' as activity_type,
        pay.id,
        pay.created_at,
        'Pago procesado' as description,
        json_build_object(
            'amount', pay.amount,
            'method', pay.payment_method,
            'status', pay.status
        ) as details
    FROM payments pay
    WHERE pay.created_at >= CURRENT_DATE - INTERVAL '7 days'
    
    UNION ALL
    
    -- Nuevos pacientes
    SELECT 
        'new_patient' as activity_type,
        p.id,
        p.created_at,
        'Nuevo paciente registrado' as description,
        json_build_object(
            'name', p.full_name,
            'email', p.email
        ) as details
    FROM profiles p
    WHERE p.role = 'client'
    AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'
) as activities
ORDER BY created_at DESC
LIMIT 50;

-- Permisos
GRANT SELECT ON public.recent_activity_view TO authenticated;

-- 7. Índices para mejorar performance
-- =====================================================
-- Índice para búsquedas por fecha en appointments
CREATE INDEX IF NOT EXISTS idx_appointments_date 
ON appointments(appointment_date);

-- Índice para búsquedas por estado en appointments
CREATE INDEX IF NOT EXISTS idx_appointments_status 
ON appointments(status);

-- Índice para búsquedas por fecha en payments
CREATE INDEX IF NOT EXISTS idx_payments_created_at 
ON payments(created_at);

-- Índice para búsquedas por estado en payments
CREATE INDEX IF NOT EXISTS idx_payments_status 
ON payments(status);

-- 8. Función para obtener métricas del dashboard
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    metric_change NUMERIC,
    metric_trend TEXT
) AS $$
DECLARE
    v_prev_start DATE := p_start_date - (p_end_date - p_start_date);
    v_prev_end DATE := p_start_date - INTERVAL '1 day';
BEGIN
    RETURN QUERY
    WITH current_period AS (
        SELECT 
            COUNT(DISTINCT CASE WHEN a.appointment_date BETWEEN p_start_date AND p_end_date THEN a.id END) as appointments,
            COUNT(DISTINCT CASE WHEN p.created_at BETWEEN p_start_date AND p_end_date THEN p.id END) as new_patients,
            COALESCE(SUM(CASE WHEN pay.created_at BETWEEN p_start_date AND p_end_date THEN pay.amount END), 0) as revenue
        FROM appointments a
        FULL OUTER JOIN profiles p ON p.role = 'client'
        FULL OUTER JOIN payments pay ON pay.status = 'completed'
    ),
    previous_period AS (
        SELECT 
            COUNT(DISTINCT CASE WHEN a.appointment_date BETWEEN v_prev_start AND v_prev_end THEN a.id END) as appointments,
            COUNT(DISTINCT CASE WHEN p.created_at BETWEEN v_prev_start AND v_prev_end THEN p.id END) as new_patients,
            COALESCE(SUM(CASE WHEN pay.created_at BETWEEN v_prev_start AND v_prev_end THEN pay.amount END), 0) as revenue
        FROM appointments a
        FULL OUTER JOIN profiles p ON p.role = 'client'
        FULL OUTER JOIN payments pay ON pay.status = 'completed'
    )
    SELECT 
        'appointments'::TEXT,
        current_period.appointments::NUMERIC,
        CASE 
            WHEN previous_period.appointments > 0 
            THEN ((current_period.appointments - previous_period.appointments)::NUMERIC / previous_period.appointments * 100)
            ELSE 0 
        END,
        CASE 
            WHEN current_period.appointments > previous_period.appointments THEN 'up'
            WHEN current_period.appointments < previous_period.appointments THEN 'down'
            ELSE 'stable'
        END
    FROM current_period, previous_period
    
    UNION ALL
    
    SELECT 
        'new_patients'::TEXT,
        current_period.new_patients::NUMERIC,
        CASE 
            WHEN previous_period.new_patients > 0 
            THEN ((current_period.new_patients - previous_period.new_patients)::NUMERIC / previous_period.new_patients * 100)
            ELSE 0 
        END,
        CASE 
            WHEN current_period.new_patients > previous_period.new_patients THEN 'up'
            WHEN current_period.new_patients < previous_period.new_patients THEN 'down'
            ELSE 'stable'
        END
    FROM current_period, previous_period
    
    UNION ALL
    
    SELECT 
        'revenue'::TEXT,
        current_period.revenue::NUMERIC,
        CASE 
            WHEN previous_period.revenue > 0 
            THEN ((current_period.revenue - previous_period.revenue)::NUMERIC / previous_period.revenue * 100)
            ELSE 0 
        END,
        CASE 
            WHEN current_period.revenue > previous_period.revenue THEN 'up'
            WHEN current_period.revenue < previous_period.revenue THEN 'down'
            ELSE 'stable'
        END
    FROM current_period, previous_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO authenticated;

-- 9. Comentarios para documentación
-- =====================================================
COMMENT ON VIEW public.dashboard_stats_view IS 'Vista consolidada de estadísticas principales para el dashboard';
COMMENT ON VIEW public.today_appointments_view IS 'Vista de citas del día actual con información completa';
COMMENT ON VIEW public.service_stats_view IS 'Estadísticas de uso y revenue por servicio';
COMMENT ON VIEW public.professional_occupancy_view IS 'Vista de ocupación y disponibilidad de profesionales';
COMMENT ON VIEW public.payment_summary_view IS 'Resumen de pagos agrupados por día';
COMMENT ON VIEW public.recent_activity_view IS 'Actividad reciente del sistema (últimos 7 días)';
COMMENT ON FUNCTION public.get_dashboard_metrics IS 'Obtiene métricas comparativas del dashboard para un período específico';