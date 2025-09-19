import * as Sentry from '@sentry/react-native';
import { isFeatureEnabled } from './features';

// Configuración de Sentry
export const initSentry = () => {
  // Solo inicializar si tenemos DSN configurado
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  
  if (!sentryDsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    debug: __DEV__, // Solo debug en desarrollo
    environment: __DEV__ ? 'development' : 'production',
    
    // Configuración de muestreo
    tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% en dev, 10% en prod
    
    // Configuración de release
    release: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    dist: process.env.EXPO_PUBLIC_BUILD_NUMBER || '1',
    
    // Integrations
    integrations: [
      // React Native Tracing integration
      Sentry.reactNativeTracingIntegration({
        tracingOrigins: ['localhost', /^https:\/\/vgwyhegpymqbljqtskra\.supabase\.co/],
        // Rastreo de requests
        enableNativeFramesTracking: !__DEV__,
        // Navigation tracking will be set up separately
      }),
      // React Navigation integration
      Sentry.reactNavigationIntegration(),
    ],
    
    // Filtros
    beforeSend(event, hint) {
      // No enviar errores en desarrollo
      if (__DEV__) {
        console.log('Sentry Event (dev):', event);
        return null;
      }
      
      // Filtrar errores conocidos que no son críticos
      const error = hint.originalException as Error;
      if (error && error.message) {
        // Ignorar errores de red temporales
        if (error.message.includes('Network request failed')) {
          return null;
        }
        
        // Ignorar errores de cancelación
        if (error.message.includes('cancelled') || error.message.includes('aborted')) {
          return null;
        }
      }
      
      // Agregar contexto adicional
      event.contexts = {
        ...event.contexts,
        app: {
          ...event.contexts?.app,
          features: getEnabledFeaturesForSentry(),
        }
      };
      
      return event;
    },
    
    // Configuración de breadcrumbs
    beforeBreadcrumb(breadcrumb, hint) {
      // Filtrar breadcrumbs de console en producción
      if (breadcrumb.category === 'console' && !__DEV__) {
        return null;
      }
      
      // Filtrar navegación sensible
      if (breadcrumb.category === 'navigation') {
        // Ocultar parámetros sensibles
        if (breadcrumb.data?.params) {
          breadcrumb.data.params = sanitizeParams(breadcrumb.data.params);
        }
      }
      
      return breadcrumb;
    },
  });
};

// Funciones helper
function getEnabledFeaturesForSentry() {
  // Solo enviar features no sensibles a Sentry
  return {
    payments_enabled: isFeatureEnabled('PAYMENTS.CREDIT_CARD'),
    notifications_enabled: isFeatureEnabled('NOTIFICATIONS.PUSH'),
    breathe_move_enabled: isFeatureEnabled('BREATHE_AND_MOVE'),
    credits_enabled: isFeatureEnabled('CREDITS'),
  };
}

function sanitizeParams(params: any) {
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credit_card'];
  const sanitized = { ...params };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Exportar funciones de utilidad
export const captureException = (error: Error, context?: any) => {
  Sentry.captureException(error, {
    contexts: {
      custom: context
    }
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

export const setUser = (user: { id: string; email?: string; username?: string } | null) => {
  Sentry.setUser(user);
};

export const setContext = (key: string, context: any) => {
  Sentry.setContext(key, context);
};

// Wrapper para transacciones de performance
export async function sentryTransaction<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = Sentry.startTransaction({
    name,
    op: operation,
  });
  
  Sentry.getCurrentScope().setSpan(transaction);
  
  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}