// Sistema de logging centralizado para la aplicación

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
  error?: Error;
}

class Logger {
  private isDevelopment: boolean;
  private logToConsole: boolean;
  private logLevel: LogLevel;

  constructor() {
    this.isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
    this.logToConsole = this.isDevelopment;
    this.logLevel = this.isDevelopment ? 'debug' : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, context, message } = entry;
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} [${level.toUpperCase()}] ${contextStr} ${message}`;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
      error
    };

    if (this.logToConsole) {
      const formattedMessage = this.formatMessage(entry);
      
      switch (level) {
        case 'debug':
          console.log(formattedMessage, data || '');
          break;
        case 'info':
          console.info(formattedMessage, data || '');
          break;
        case 'warn':
          console.warn(formattedMessage, data || '');
          break;
        case 'error':
          console.error(formattedMessage, error || data || '');
          if (error?.stack) {
            console.error(error.stack);
          }
          break;
      }
    }

    // En producción, aquí podrías enviar logs a un servicio externo
    if (!this.isDevelopment) {
      this.sendToLoggingService(entry);
    }
  }

  private async sendToLoggingService(entry: LogEntry) {
    try {
      // Importar Sentry dinámicamente para evitar problemas si no está configurado
      const Sentry = await import('@sentry/react-native');
      
      if (!Sentry) return;
      
      switch (entry.level) {
        case 'error':
          if (entry.error) {
            Sentry.captureException(entry.error, {
              contexts: {
                app: { context: entry.context || 'Unknown' }
              },
              extra: entry.data,
              level: 'error'
            });
          } else {
            Sentry.captureMessage(entry.message, 'error');
          }
          break;
          
        case 'warn':
          Sentry.captureMessage(entry.message, 'warning');
          break;
          
        case 'info':
          // Solo enviar info importante a Sentry
          if (entry.context?.includes('Payment') || entry.context?.includes('Auth')) {
            Sentry.addBreadcrumb({
              message: entry.message,
              level: 'info',
              category: entry.context || 'app',
              data: entry.data,
              timestamp: new Date(entry.timestamp).getTime() / 1000
            });
          }
          break;
          
        case 'debug':
          // No enviar debug a producción
          break;
      }
    } catch (error) {
      // Si Sentry falla, no queremos que rompa la app
      console.error('Failed to send log to Sentry:', error);
    }
  }

  debug(message: string, context?: string, data?: any) {
    this.log('debug', message, context, data);
  }

  info(message: string, context?: string, data?: any) {
    this.log('info', message, context, data);
  }

  warn(message: string, context?: string, data?: any) {
    this.log('warn', message, context, data);
  }

  error(message: string, context?: string, error?: Error | any, data?: any) {
    // Si el segundo parámetro es un error, úsalo como error
    if (error instanceof Error) {
      this.log('error', message, context, data, error);
    } else {
      // Si no, trata el error como data adicional
      this.log('error', message, context, { ...data, errorData: error });
    }
  }

  // Método para capturar errores de red
  logNetworkError(url: string, method: string, error: any) {
    this.error(
      `Network request failed: ${method} ${url}`,
      'Network',
      error,
      { url, method }
    );
  }

  // Método para capturar errores de Supabase
  logSupabaseError(operation: string, error: any) {
    this.error(
      `Supabase operation failed: ${operation}`,
      'Supabase',
      error,
      { operation }
    );
  }

  // Método para logging de rendimiento
  logPerformance(operation: string, duration: number) {
    const level: LogLevel = duration > 3000 ? 'warn' : 'debug';
    this.log(
      level,
      `Performance: ${operation} took ${duration}ms`,
      'Performance',
      { operation, duration }
    );
  }

  // Método para medir tiempo de operaciones
  startTimer(operation: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.logPerformance(operation, duration);
    };
  }
}

// Exportar instancia única (singleton)
export const logger = new Logger();

// Exportar funciones de utilidad
export function logError(message: string, error?: Error | any, context?: string) {
  logger.error(message, context, error);
}

export function logInfo(message: string, data?: any, context?: string) {
  logger.info(message, context, data);
}

export function logWarn(message: string, data?: any, context?: string) {
  logger.warn(message, context, data);
}

export function logDebug(message: string, data?: any, context?: string) {
  logger.debug(message, context, data);
}

// Wrapper para operaciones asíncronas con logging automático
export async function withLogging<T>(
  operation: string,
  context: string,
  fn: () => Promise<T>
): Promise<T> {
  const endTimer = logger.startTimer(operation);
  try {
    logger.debug(`Starting ${operation}`, context);
    const result = await fn();
    logger.debug(`Completed ${operation}`, context);
    return result;
  } catch (error) {
    logger.error(`Failed ${operation}`, context, error as Error);
    throw error;
  } finally {
    endTimer();
  }
}