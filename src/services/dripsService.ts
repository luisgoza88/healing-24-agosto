import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export interface DripsStation {
  id: string;
  station_number: number;
  name: string;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface DripsAvailability {
  slot_time: string;
  available_stations: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  availableStations: number;
}

export class DripsService {
  // Check availability for a specific date and duration
  static async getAvailableSlots(date: Date, durationMinutes: number): Promise<TimeSlot[]> {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('get_drips_available_slots', {
        p_date: dateStr,
        p_duration_minutes: durationMinutes
      });

      if (error) throw error;

      // Generate all possible time slots based on duration
      const allSlots: TimeSlot[] = [];
      const closeHour = 19; // 7:00 PM
      const lastPossibleHour = closeHour - (durationMinutes / 60);
      
      console.log(`DRIPS Debug - Duration: ${durationMinutes} min, Last possible hour: ${lastPossibleHour}`);
      
      for (let hour = 8; hour <= lastPossibleHour; hour += 0.5) {
        const h = Math.floor(hour);
        const m = (hour % 1) * 60;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        allSlots.push({
          time: timeStr,
          available: false,
          availableStations: 0
        });
      }
      
      console.log(`DRIPS Debug - Generated ${allSlots.length} slots, last: ${allSlots[allSlots.length - 1]?.time}`);

      // Mark available slots based on database response
      if (data && Array.isArray(data)) {
        console.log(`DRIPS Debug - DB returned ${data.length} slots`);
        console.log(`DRIPS Debug - Last DB slot: ${data[data.length - 1]?.slot_time}`);
        
        data.forEach((slot: any) => {
          const timeStr = slot.slot_time.substring(0, 5); // Extract HH:MM
          const slotIndex = allSlots.findIndex(s => s.time === timeStr);
          if (slotIndex !== -1) {
            allSlots[slotIndex].available = true;
            allSlots[slotIndex].availableStations = slot.available_stations;
          }
        });
      }

      return allSlots;
    } catch (error) {
      console.error('Error fetching DRIPS availability:', error);
      return [];
    }
  }

  // Check availability for a specific time
  static async checkAvailability(
    date: Date, 
    time: string, 
    durationMinutes: number
  ): Promise<{ stationId: string; stationNumber: number; isAvailable: boolean }[]> {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('check_drips_availability', {
        p_date: dateStr,
        p_time: time + ':00', // Add seconds
        p_duration_minutes: durationMinutes
      });

      if (error) throw error;

      return data?.map((item: any) => ({
        stationId: item.available_station_id,
        stationNumber: item.station_number,
        isAvailable: item.is_available
      })) || [];
    } catch (error) {
      console.error('Error checking DRIPS availability:', error);
      return [];
    }
  }

  // Create a DRIPS appointment
  static async createDripsAppointment(
    userId: string,
    serviceId: string,
    subServiceId: string | null,
    date: Date,
    time: string,
    professionalId: string,
    durationMinutes: number
  ) {
    try {
      // Check availability first
      const availability = await this.checkAvailability(date, time, durationMinutes);
      const availableStation = availability.find(s => s.isAvailable);
      
      if (!availableStation) {
        throw new Error('No hay estaciones disponibles para este horario');
      }

      // Create the appointment
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          user_id: userId,
          service_id: serviceId,
          sub_service_id: subServiceId,
          appointment_date: format(date, 'yyyy-MM-dd'),
          appointment_time: time,
          professional_id: professionalId,
          duration_minutes: durationMinutes,
          status: 'pending',
          drips_station_id: availableStation.stationId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating DRIPS appointment:', error);
      throw error;
    }
  }

  // Get all DRIPS stations
  static async getStations(): Promise<DripsStation[]> {
    try {
      const { data, error } = await supabase
        .from('drips_stations')
        .select('*')
        .order('station_number');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching DRIPS stations:', error);
      return [];
    }
  }

  // Get current DRIPS appointments for a date
  static async getDripsAppointments(date: Date) {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          user:users!user_id (
            full_name,
            phone
          ),
          service:services!service_id (
            name,
            code
          ),
          sub_service:sub_services!sub_service_id (
            name,
            duration_minutes
          ),
          station:drips_stations!drips_station_id (
            station_number,
            name
          )
        `)
        .eq('appointment_date', dateStr)
        .eq('service.code', 'drips')
        .in('status', ['confirmed', 'pending'])
        .order('appointment_time');

      if (error) throw error;
      
      return data?.filter(apt => apt.service?.code === 'drips') || [];
    } catch (error) {
      console.error('Error fetching DRIPS appointments:', error);
      return [];
    }
  }
}