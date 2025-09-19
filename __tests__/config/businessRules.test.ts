import { 
  calculateCancellationCredit, 
  isWorkingHour,
  CANCELLATION_POLICIES,
  APPOINTMENT_RULES
} from '../../src/config/businessRules';

describe('Business Rules', () => {
  describe('calculateCancellationCredit', () => {
    const basePrice = 100000; // 100,000 COP
    
    it('should give 100% credit for cancellations more than 48 hours in advance', () => {
      const appointmentDate = new Date('2024-01-10T10:00:00');
      const cancellationDate = new Date('2024-01-07T10:00:00'); // 3 days before
      
      const result = calculateCancellationCredit(appointmentDate, cancellationDate, basePrice);
      
      expect(result.creditPercentage).toBe(1.0);
      expect(result.creditAmount).toBe(100000);
      expect(result.message).toBe(CANCELLATION_POLICIES.messages.fullCredit);
    });
    
    it('should give 75% credit for cancellations between 24-48 hours', () => {
      const appointmentDate = new Date('2024-01-10T10:00:00');
      const cancellationDate = new Date('2024-01-09T08:00:00'); // 26 hours before
      
      const result = calculateCancellationCredit(appointmentDate, cancellationDate, basePrice);
      
      expect(result.creditPercentage).toBe(0.75);
      expect(result.creditAmount).toBe(75000);
      expect(result.message).toContain('75%');
    });
    
    it('should give 50% credit for cancellations between 6-24 hours', () => {
      const appointmentDate = new Date('2024-01-10T10:00:00');
      const cancellationDate = new Date('2024-01-10T02:00:00'); // 8 hours before
      
      const result = calculateCancellationCredit(appointmentDate, cancellationDate, basePrice);
      
      expect(result.creditPercentage).toBe(0.5);
      expect(result.creditAmount).toBe(50000);
      expect(result.message).toContain('50%');
    });
    
    it('should give 25% credit for cancellations between 2-6 hours', () => {
      const appointmentDate = new Date('2024-01-10T10:00:00');
      const cancellationDate = new Date('2024-01-10T07:00:00'); // 3 hours before
      
      const result = calculateCancellationCredit(appointmentDate, cancellationDate, basePrice);
      
      expect(result.creditPercentage).toBe(0.25);
      expect(result.creditAmount).toBe(25000);
      expect(result.message).toContain('25%');
    });
    
    it('should give no credit for cancellations less than 2 hours', () => {
      const appointmentDate = new Date('2024-01-10T10:00:00');
      const cancellationDate = new Date('2024-01-10T08:30:00'); // 1.5 hours before
      
      const result = calculateCancellationCredit(appointmentDate, cancellationDate, basePrice);
      
      expect(result.creditPercentage).toBe(0);
      expect(result.creditAmount).toBe(0);
      expect(result.message).toBe(CANCELLATION_POLICIES.messages.noCredit);
    });
  });
  
  describe('isWorkingHour', () => {
    it('should return true for valid working hours on weekdays', () => {
      // Monday at 10:00 AM
      const validDate = new Date('2024-01-08T10:00:00');
      expect(isWorkingHour(validDate)).toBe(true);
      
      // Friday at 5:00 PM
      const fridayAfternoon = new Date('2024-01-12T17:00:00');
      expect(isWorkingHour(fridayAfternoon)).toBe(true);
    });
    
    it('should return false for lunch hours', () => {
      // Monday at 1:30 PM (lunch time)
      const lunchTime = new Date('2024-01-08T13:30:00');
      expect(isWorkingHour(lunchTime)).toBe(false);
    });
    
    it('should return false for weekends', () => {
      // Saturday
      const saturday = new Date('2024-01-13T10:00:00');
      expect(isWorkingHour(saturday)).toBe(false);
      
      // Sunday
      const sunday = new Date('2024-01-14T10:00:00');
      expect(isWorkingHour(sunday)).toBe(false);
    });
    
    it('should return false for hours outside working time', () => {
      // Before work hours
      const earlyMorning = new Date('2024-01-08T08:00:00');
      expect(isWorkingHour(earlyMorning)).toBe(false);
      
      // After work hours
      const evening = new Date('2024-01-08T19:00:00');
      expect(isWorkingHour(evening)).toBe(false);
    });
  });
  
  describe('Business Rules Constants', () => {
    it('should have valid appointment duration limits', () => {
      expect(APPOINTMENT_RULES.duration.minimum).toBeLessThanOrEqual(APPOINTMENT_RULES.duration.default);
      expect(APPOINTMENT_RULES.duration.default).toBeLessThanOrEqual(APPOINTMENT_RULES.duration.maximum);
    });
    
    it('should have valid working days (Monday to Friday)', () => {
      expect(APPOINTMENT_RULES.workingDays).toEqual([1, 2, 3, 4, 5]);
    });
    
    it('should have descending cancellation credit percentages', () => {
      const credits = CANCELLATION_POLICIES.credits;
      expect(credits.moreThan48Hours).toBeGreaterThan(credits.between24And48Hours);
      expect(credits.between24And48Hours).toBeGreaterThan(credits.between6And24Hours);
      expect(credits.between6And24Hours).toBeGreaterThan(credits.between2And6Hours);
      expect(credits.between2And6Hours).toBeGreaterThanOrEqual(credits.lessThan2Hours);
    });
  });
});