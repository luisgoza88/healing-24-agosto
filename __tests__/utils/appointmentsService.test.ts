import { 
  createAppointment, 
  getUserAppointments,
  updateAppointmentStatus,
  checkSlotAvailability
} from '../../src/utils/appointmentsService';
import { supabase } from '../../src/lib/supabase';

// Mock supabase
jest.mock('../../src/lib/supabase');

describe('Appointments Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createAppointment', () => {
    it('should create appointment successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockAppointment = {
        id: 'apt-123',
        user_id: 'user-123',
        service_id: 'service-1',
        professional_id: 'prof-1',
        appointment_date: '2024-01-10',
        appointment_time: '10:00:00',
        total_amount: 100000,
        status: 'pending'
      };
      
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser }
      });
      
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockAppointment, error: null });
      
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle
      });
      
      const appointmentData = {
        service_id: 'service-1',
        professional_id: 'prof-1',
        appointment_date: '2024-01-10',
        appointment_time: '10:00:00',
        total_amount: 100000
      };
      
      const result = await createAppointment(appointmentData);
      
      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockAppointment);
      expect(mockInsert).toHaveBeenCalledWith([{
        ...appointmentData,
        user_id: 'user-123',
        status: 'pending',
        payment_status: 'pending',
        duration_minutes: 60
      }]);
    });
    
    it('should handle user not authenticated error', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null }
      });
      
      const result = await createAppointment({
        service_id: 'service-1',
        professional_id: 'prof-1',
        appointment_date: '2024-01-10',
        appointment_time: '10:00:00',
        total_amount: 100000
      });
      
      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });
  
  describe('updateAppointmentStatus', () => {
    it('should update appointment status successfully', async () => {
      const mockUser = { id: 'user-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser }
      });
      
      const mockUpdate = jest.fn().mockReturnThis();
      const mockMatch = jest.fn().mockResolvedValue({ error: null });
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        match: mockMatch
      });
      
      const result = await updateAppointmentStatus('apt-123', 'cancelled', 'User requested');
      
      expect(result.error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'cancelled',
        cancellation_reason: 'User requested'
      });
      expect(mockMatch).toHaveBeenCalledWith({ id: 'apt-123', user_id: 'user-123' });
    });
    
    it('should update status without cancellation reason', async () => {
      const mockUser = { id: 'user-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser }
      });
      
      const mockUpdate = jest.fn().mockReturnThis();
      const mockMatch = jest.fn().mockResolvedValue({ error: null });
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        match: mockMatch
      });
      
      const result = await updateAppointmentStatus('apt-123', 'confirmed');
      
      expect(result.error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'confirmed' });
      expect(mockMatch).toHaveBeenCalledWith({ id: 'apt-123', user_id: 'user-123' });
    });
  });
  
  describe('checkSlotAvailability', () => {
    it('should return true when slot is available', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockLt = jest.fn().mockResolvedValue({ data: [], error: null });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        neq: mockNeq,
        gte: mockGte,
        lt: mockLt
      });
      
      const result = await checkSlotAvailability('prof-1', '2024-01-10', '10:00:00');
      
      expect(result.isAvailable).toBe(true);
      expect(result.error).toBeNull();
    });
    
    it('should return false when slot is taken', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockLt = jest.fn().mockResolvedValue({ 
        data: [{ id: 'existing-apt' }], 
        error: null 
      });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        neq: mockNeq,
        gte: mockGte,
        lt: mockLt
      });
      
      const result = await checkSlotAvailability('prof-1', '2024-01-10', '10:00:00');
      
      expect(result.isAvailable).toBe(false);
      expect(result.error).toBeNull();
    });
  });
});
