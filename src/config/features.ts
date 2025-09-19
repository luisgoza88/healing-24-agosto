// Sistema de Feature Flags para controlar funcionalidades en diferentes ambientes

export const FEATURES = {
  // Pantallas de desarrollo
  DEV_TOOLS: {
    enabled: __DEV__,
    description: 'Acceso a herramientas de desarrollo',
  },
  
  // Funcionalidades de prueba
  TEST_USER_BUTTON: {
    enabled: __DEV__,
    description: 'Botón para llenar credenciales de prueba',
  },
  
  // Sistema de pagos
  PAYMENTS: {
    CREDIT_CARD: {
      enabled: true,
      description: 'Pagos con tarjeta de crédito',
    },
    PSE: {
      enabled: true,
      description: 'Pagos con PSE',
    },
    CASH: {
      enabled: false,
      description: 'Pagos en efectivo',
    },
    MOCK_PAYMENTS: {
      enabled: __DEV__ || process.env.EXPO_PUBLIC_OFFLINE_MODE === 'true',
      description: 'Simular pagos sin procesador real',
    }
  },
  
  // Notificaciones
  NOTIFICATIONS: {
    PUSH: {
      enabled: true,
      description: 'Notificaciones push',
    },
    EMAIL: {
      enabled: true,
      description: 'Notificaciones por email',
    },
    SMS: {
      enabled: false,
      description: 'Notificaciones por SMS',
    }
  },
  
  // Funcionalidades de citas
  APPOINTMENTS: {
    ONLINE_BOOKING: {
      enabled: true,
      description: 'Reserva de citas en línea',
    },
    CANCELLATION: {
      enabled: true,
      description: 'Cancelación de citas',
    },
    RESCHEDULING: {
      enabled: true,
      description: 'Reprogramación de citas',
    },
    RATINGS: {
      enabled: false,
      description: 'Sistema de calificaciones de profesionales',
    },
    VIDEO_CALLS: {
      enabled: false,
      description: 'Videollamadas para citas virtuales',
    }
  },
  
  // Breathe & Move
  BREATHE_AND_MOVE: {
    enabled: true,
    description: 'Clases de Breathe & Move',
    ONLINE_ENROLLMENT: {
      enabled: true,
      description: 'Inscripción en línea a clases',
    },
    PACKAGES: {
      enabled: true,
      description: 'Venta de paquetes de clases',
    },
    UNLIMITED_MEMBERSHIP: {
      enabled: true,
      description: 'Membresías ilimitadas mensuales',
    }
  },
  
  // Hot Studio
  HOT_STUDIO: {
    enabled: true,
    description: 'Clases de Hot Studio',
    MEMBERSHIPS: {
      enabled: true,
      description: 'Sistema de membresías',
    }
  },
  
  // Sistema de créditos
  CREDITS: {
    enabled: true,
    description: 'Sistema de créditos del usuario',
    MANUAL_ADDITION: {
      enabled: true,
      description: 'Agregar créditos manualmente (admin)',
    },
    EXPIRATION: {
      enabled: false,
      description: 'Expiración de créditos',
    }
  },
  
  // Funcionalidades administrativas
  ADMIN: {
    REPORTS: {
      enabled: true,
      description: 'Reportes y analytics',
    },
    USER_MANAGEMENT: {
      enabled: true,
      description: 'Gestión de usuarios',
    },
    BULK_ACTIONS: {
      enabled: false,
      description: 'Acciones masivas',
    }
  },
  
  // Integraciones
  INTEGRATIONS: {
    GOOGLE_CALENDAR: {
      enabled: false,
      description: 'Sincronización con Google Calendar',
    },
    WHATSAPP: {
      enabled: false,
      description: 'Integración con WhatsApp Business',
    },
    ACCOUNTING: {
      enabled: false,
      description: 'Integración con sistema contable',
    }
  },
  
  // Características experimentales
  EXPERIMENTAL: {
    AI_RECOMMENDATIONS: {
      enabled: false,
      description: 'Recomendaciones de servicios con IA',
    },
    VOICE_COMMANDS: {
      enabled: false,
      description: 'Comandos de voz',
    }
  }
};

// Helper para verificar si una característica está habilitada
export function isFeatureEnabled(featurePath: string): boolean {
  const keys = featurePath.split('.');
  let current: any = FEATURES;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }
  
  return current?.enabled === true;
}

// Helper para obtener todas las características habilitadas
export function getEnabledFeatures(): string[] {
  const enabled: string[] = [];
  
  function traverse(obj: any, path: string[] = []) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      if (value && typeof value === 'object') {
        if ('enabled' in value && value.enabled === true) {
          enabled.push(currentPath.join('.'));
        }
        if (!('enabled' in value)) {
          traverse(value, currentPath);
        }
      }
    }
  }
  
  traverse(FEATURES);
  return enabled;
}

// Helper para desarrollo - muestra todas las características y su estado
export function logFeatureStatus() {
  if (!__DEV__) return;
  
  console.log('=== Feature Flags Status ===');
  const enabled = getEnabledFeatures();
  enabled.forEach(feature => {
    console.log(`✅ ${feature}`);
  });
}