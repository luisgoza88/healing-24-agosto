// Configuración centralizada de reglas de negocio
// Estas configuraciones deben ser movidas a variables de entorno o base de datos en producción

export const CANCELLATION_POLICIES = {
  // Política de créditos por cancelación según tiempo de anticipación
  credits: {
    moreThan48Hours: 1.0,      // 100% de crédito
    between24And48Hours: 0.75,  // 75% de crédito
    between6And24Hours: 0.5,    // 50% de crédito
    between2And6Hours: 0.25,    // 25% de crédito
    lessThan2Hours: 0,          // Sin crédito
  },
  
  // Horas mínimas para diferentes acciones
  minimumHours: {
    cancellation: 2,
    rescheduling: 6,
    booking: 24,
  },
  
  // Mensajes para el usuario
  messages: {
    noCredit: 'Las cancelaciones con menos de 2 horas de anticipación no generan crédito',
    partialCredit: (percentage: number) => `Se aplicará un ${percentage}% de crédito a tu cuenta`,
    fullCredit: 'Se aplicará el 100% del valor como crédito en tu cuenta',
  }
};

export const APPOINTMENT_RULES = {
  // Horarios de atención
  workingHours: {
    start: '09:00',
    end: '18:00',
    lunchStart: '13:00',
    lunchEnd: '14:00',
  },
  
  // Días laborables (0 = Domingo, 6 = Sábado)
  workingDays: [1, 2, 3, 4, 5], // Lunes a Viernes
  
  // Duración por defecto y límites
  duration: {
    default: 60,
    minimum: 30,
    maximum: 180,
  },
  
  // Límites de citas
  limits: {
    maxPerDay: 3,
    maxAdvanceBookingDays: 90,
    maxPendingAppointments: 5,
  }
};

export const PAYMENT_RULES = {
  // Tiempo de espera para confirmación de pago (minutos)
  confirmationTimeout: 30,
  
  // Métodos de pago habilitados
  enabledMethods: ['credit_card', 'pse', 'cash'],
  
  // Configuración por método
  methodConfig: {
    credit_card: {
      enabled: true,
      minAmount: 10000,
      maxAmount: 10000000,
    },
    pse: {
      enabled: true,
      minAmount: 10000,
      maxAmount: 50000000,
    },
    cash: {
      enabled: false,
      minAmount: 0,
      maxAmount: 1000000,
    }
  },
  
  // Comisiones o descuentos
  fees: {
    credit_card: 0, // Sin comisión adicional
    pse: 0,
    cash: 0,
  }
};

export const CREDIT_RULES = {
  // Valor inicial de créditos para nuevos usuarios
  initialCredits: 0,
  
  // Créditos de bienvenida
  welcomeBonus: {
    enabled: false,
    amount: 100000,
  },
  
  // Expiración de créditos (días)
  expirationDays: 365,
  
  // Mínimo para usar créditos
  minimumUsage: 10000,
  
  // Máximo de créditos aplicables por transacción
  maxPerTransaction: null, // null = sin límite
};

export const NOTIFICATION_RULES = {
  // Recordatorios de citas (horas antes)
  appointmentReminders: [24, 2],
  
  // Notificaciones de clase (minutos antes)
  classReminders: [60, 15],
  
  // Horario para enviar notificaciones
  quietHours: {
    start: 22, // 10 PM
    end: 8,    // 8 AM
  }
};

export const BREATHE_MOVE_RULES = {
  // Máximo de clases por día
  maxClassesPerDay: 1,
  
  // Tiempo mínimo para inscribirse (horas antes)
  minimumEnrollmentTime: 2,
  
  // Paquetes disponibles
  packages: {
    single: { classes: 1, price: 100000, expirationDays: 7 },
    pack4: { classes: 4, price: 350000, expirationDays: 30 },
    pack8: { classes: 8, price: 650000, expirationDays: 60 },
    unlimited: { classes: -1, price: 900000, expirationDays: 30 },
  }
};

// Función helper para calcular créditos por cancelación
export function calculateCancellationCredit(
  appointmentDate: Date,
  cancellationDate: Date,
  appointmentPrice: number
): { creditAmount: number; creditPercentage: number; message: string } {
  const hoursUntilAppointment = (appointmentDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60);
  
  let creditPercentage = 0;
  let message = '';
  
  if (hoursUntilAppointment >= 48) {
    creditPercentage = CANCELLATION_POLICIES.credits.moreThan48Hours;
    message = CANCELLATION_POLICIES.messages.fullCredit;
  } else if (hoursUntilAppointment >= 24) {
    creditPercentage = CANCELLATION_POLICIES.credits.between24And48Hours;
    message = CANCELLATION_POLICIES.messages.partialCredit(creditPercentage * 100);
  } else if (hoursUntilAppointment >= 6) {
    creditPercentage = CANCELLATION_POLICIES.credits.between6And24Hours;
    message = CANCELLATION_POLICIES.messages.partialCredit(creditPercentage * 100);
  } else if (hoursUntilAppointment >= 2) {
    creditPercentage = CANCELLATION_POLICIES.credits.between2And6Hours;
    message = CANCELLATION_POLICIES.messages.partialCredit(creditPercentage * 100);
  } else {
    creditPercentage = CANCELLATION_POLICIES.credits.lessThan2Hours;
    message = CANCELLATION_POLICIES.messages.noCredit;
  }
  
  const creditAmount = Math.round(appointmentPrice * creditPercentage);
  
  return {
    creditAmount,
    creditPercentage,
    message
  };
}

// Función para verificar si un horario está disponible
export function isWorkingHour(date: Date): boolean {
  const day = date.getDay();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const time = hours * 60 + minutes;
  
  // Verificar día laboral
  if (!APPOINTMENT_RULES.workingDays.includes(day)) {
    return false;
  }
  
  // Convertir horarios a minutos
  const [startH, startM] = APPOINTMENT_RULES.workingHours.start.split(':').map(Number);
  const [endH, endM] = APPOINTMENT_RULES.workingHours.end.split(':').map(Number);
  const [lunchStartH, lunchStartM] = APPOINTMENT_RULES.workingHours.lunchStart.split(':').map(Number);
  const [lunchEndH, lunchEndM] = APPOINTMENT_RULES.workingHours.lunchEnd.split(':').map(Number);
  
  const workStart = startH * 60 + startM;
  const workEnd = endH * 60 + endM;
  const lunchStart = lunchStartH * 60 + lunchStartM;
  const lunchEnd = lunchEndH * 60 + lunchEndM;
  
  // Verificar horario laboral
  if (time < workStart || time >= workEnd) {
    return false;
  }
  
  // Verificar hora de almuerzo
  if (time >= lunchStart && time < lunchEnd) {
    return false;
  }
  
  return true;
}