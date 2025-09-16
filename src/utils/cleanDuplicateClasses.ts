import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export const cleanDuplicateClasses = async () => {
  try {
    console.log('Starting cleanup of duplicate classes and Sunday classes...');
    
    // First, delete all Sunday classes
    const { error: sundayError } = await supabase
      .from('breathe_move_classes')
      .delete()
      .eq('EXTRACT(DOW FROM class_date)', 0); // DOW = 0 is Sunday
    
    if (sundayError) {
      // Try alternative approach
      const { data: allClasses, error: fetchError } = await supabase
        .from('breathe_move_classes')
        .select('id, class_date');
      
      if (!fetchError && allClasses) {
        const sundayClasses = allClasses.filter(c => {
          const date = new Date(c.class_date);
          return date.getDay() === 0; // Sunday
        });
        
        if (sundayClasses.length > 0) {
          const sundayIds = sundayClasses.map(c => c.id);
          const { error: deleteError } = await supabase
            .from('breathe_move_classes')
            .delete()
            .in('id', sundayIds);
          
          if (deleteError) {
            console.error('Error deleting Sunday classes:', deleteError);
          } else {
            console.log(`Deleted ${sundayClasses.length} Sunday classes`);
          }
        }
      }
    } else {
      console.log('Sunday classes deleted successfully');
    }
    
    // Now handle duplicates
    const { data: allClasses, error: fetchError } = await supabase
      .from('breathe_move_classes')
      .select('*')
      .gte('class_date', format(new Date(), 'yyyy-MM-dd'))
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      console.error('Error fetching classes:', fetchError);
      return { success: false, message: fetchError.message };
    }
    
    if (!allClasses || allClasses.length === 0) {
      return { success: true, message: 'No classes found to clean' };
    }
    
    // Group by unique key: date + time + class name
    const classMap = new Map<string, any[]>();
    
    allClasses.forEach(cls => {
      const key = `${cls.class_date}_${cls.start_time}_${cls.class_name}`;
      if (!classMap.has(key)) {
        classMap.set(key, []);
      }
      classMap.get(key)!.push(cls);
    });
    
    // Find duplicates and delete all but the first
    const idsToDelete: string[] = [];
    
    classMap.forEach((classes) => {
      if (classes.length > 1) {
        // Keep the first, delete the rest
        for (let i = 1; i < classes.length; i++) {
          idsToDelete.push(classes[i].id);
        }
      }
    });
    
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('breathe_move_classes')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) {
        console.error('Error deleting duplicates:', deleteError);
        return { success: false, message: deleteError.message };
      }
      
      console.log(`Successfully deleted ${idsToDelete.length} duplicate classes`);
    }
    
    return { 
      success: true, 
      message: `Cleanup complete. Deleted ${idsToDelete.length} duplicates.` 
    };
    
  } catch (error) {
    console.error('Error in cleanDuplicateClasses:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};