import { logger, logError, logInfo, withLogging } from '../../src/utils/logger';

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn()
}));

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
  
  describe('debug logging', () => {
    it('should log debug messages in development', () => {
      logger.debug('Debug message', 'TestContext', { data: 'test' });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('[DEBUG]');
      expect(logCall[0]).toContain('[TestContext]');
      expect(logCall[0]).toContain('Debug message');
    });
  });
  
  describe('info logging', () => {
    it('should log info messages', () => {
      logger.info('Info message', 'TestContext', { userId: 123 });
      
      expect(consoleInfoSpy).toHaveBeenCalled();
      const logCall = consoleInfoSpy.mock.calls[0];
      expect(logCall[0]).toContain('[INFO]');
      expect(logCall[0]).toContain('Info message');
    });
  });
  
  describe('warn logging', () => {
    it('should log warning messages', () => {
      logger.warn('Warning message', 'TestContext');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      const logCall = consoleWarnSpy.mock.calls[0];
      expect(logCall[0]).toContain('[WARN]');
      expect(logCall[0]).toContain('Warning message');
    });
  });
  
  describe('error logging', () => {
    it('should log error with Error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', 'TestContext', error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0];
      expect(logCall[0]).toContain('[ERROR]');
      expect(logCall[0]).toContain('Error occurred');
      expect(logCall[1]).toBe(error);
    });
    
    it('should log error without Error object', () => {
      logger.error('Error message', 'TestContext', { errorCode: 'ERR001' });
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0];
      expect(logCall[0]).toContain('[ERROR]');
    });
  });
  
  describe('network error logging', () => {
    it('should log network errors with context', () => {
      const error = new Error('Network request failed');
      logger.logNetworkError('https://api.example.com', 'POST', error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0];
      expect(logCall[0]).toContain('Network request failed');
      expect(logCall[0]).toContain('[Network]');
    });
  });
  
  describe('Supabase error logging', () => {
    it('should log Supabase errors with operation', () => {
      const error = { message: 'Permission denied' };
      logger.logSupabaseError('insert', error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0];
      expect(logCall[0]).toContain('Supabase operation failed');
      expect(logCall[0]).toContain('[Supabase]');
    });
  });
  
  describe('performance logging', () => {
    it('should log performance with warning for slow operations', () => {
      logger.logPerformance('slowOperation', 4000);
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      const logCall = consoleWarnSpy.mock.calls[0];
      expect(logCall[0]).toContain('Performance');
      expect(logCall[0]).toContain('4000ms');
    });
    
    it('should log performance with debug for fast operations', () => {
      logger.logPerformance('fastOperation', 100);
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('Performance');
      expect(logCall[0]).toContain('100ms');
    });
  });
  
  describe('timer functionality', () => {
    it('should measure operation time', () => {
      jest.useFakeTimers();
      
      const endTimer = logger.startTimer('testOperation');
      
      jest.advanceTimersByTime(1500);
      endTimer();
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('1500ms');
      
      jest.useRealTimers();
    });
  });
  
  describe('withLogging wrapper', () => {
    it('should log successful operations', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await withLogging('testOperation', 'TestContext', mockFn);
      
      expect(result).toBe('success');
      expect(consoleLogSpy).toHaveBeenCalledTimes(3); // start, end, performance
    });
    
    it('should log failed operations', async () => {
      const error = new Error('Operation failed');
      const mockFn = jest.fn().mockRejectedValue(error);
      
      await expect(withLogging('testOperation', 'TestContext', mockFn)).rejects.toThrow('Operation failed');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorCall = consoleErrorSpy.mock.calls[0];
      expect(errorCall[0]).toContain('Failed testOperation');
    });
  });
  
  describe('helper functions', () => {
    it('logError should call logger.error', () => {
      const error = new Error('Test');
      logError('Error message', error, 'Context');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    it('logInfo should call logger.info', () => {
      logInfo('Info message', { data: 'test' }, 'Context');
      
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });
});