import { supabase } from '../lib/supabase';

export const cleanSundayClasses = async () => {
  try {
    console.log('Cleaning Sunday classes...');
    
    // Get all classes
    const { data: allClasses, error: fetchError } = await supabase
      .from('breathe_move_classes')
      .select('id, class_date');
    
    if (fetchError) {
      console.error('Error fetching classes:', fetchError);
      return { success: false, message: fetchError.message };
    }
    
    if (!allClasses || allClasses.length === 0) {
      return { success: true, message: 'No classes to clean' };
    }
    
    // Filter Sunday classes
    const sundayClasses = allClasses.filter(cls => {
      const date = new Date(cls.class_date + 'T00:00:00'); // Ensure proper date parsing
      return date.getDay() === 0; // Sunday
    });
    
    console.log(`Found ${sundayClasses.length} Sunday classes to delete`);
    
    if (sundayClasses.length > 0) {
      // Delete in batches of 100 to avoid query size limits
      const batchSize = 100;
      let deleted = 0;
      
      for (let i = 0; i < sundayClasses.length; i += batchSize) {
        const batch = sundayClasses.slice(i, i + batchSize);
        const idsToDelete = batch.map(c => c.id);
        
        const { error: deleteError } = await supabase
          .from('breathe_move_classes')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error('Error deleting Sunday classes:', deleteError);
          return { success: false, message: deleteError.message };
        }
        
        deleted += idsToDelete.length;
        console.log(`Deleted ${deleted} of ${sundayClasses.length} Sunday classes`);
      }
      
      return { success: true, message: `Deleted ${deleted} Sunday classes` };
    }
    
    return { success: true, message: 'No Sunday classes found' };
    
  } catch (error) {
    console.error('Error in cleanSundayClasses:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};