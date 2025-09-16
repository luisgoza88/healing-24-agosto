import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanAndSyncServices() {
  console.log('🧹 Cleaning and synchronizing services...')
  
  try {
    // First, check current services
    const { data: currentServices, error: checkError } = await supabase
      .from('services')
      .select('id, name, description')
      .order('name')
    
    if (checkError) {
      console.error('Error checking services:', checkError)
      return
    }
    
    console.log('\n📋 Current services in database:')
    currentServices?.forEach(service => {
      console.log(`- ${service.name}`)
    })
    
    // Define the ONLY services that should exist
    const correctServiceNames = [
      'Medicina Funcional',
      'Medicina Estética',
      'Medicina Regenerativa & Longevidad',
      'DRIPS - Sueroterapia',
      'Faciales',
      'Masajes',
      'Wellness Integral',
      'Breathe & Move'
    ]
    
    // Find services to delete
    const servicesToDelete = currentServices?.filter(service => 
      !correctServiceNames.includes(service.name)
    )
    
    if (servicesToDelete && servicesToDelete.length > 0) {
      console.log('\n❌ Services to remove:', servicesToDelete.map(s => s.name))
      
      // Delete all incorrect services
      for (const service of servicesToDelete) {
        const { error: deleteError } = await supabase
          .from('services')
          .delete()
          .eq('id', service.id)
        
        if (deleteError) {
          console.error(`Error deleting ${service.name}:`, deleteError)
        } else {
          console.log(`✅ Deleted: ${service.name}`)
        }
      }
    }
    
    // Define correct services with their descriptions
    const correctServices = [
      { name: 'Medicina Funcional', description: 'Consultas especializadas y péptidos' },
      { name: 'Medicina Estética', description: 'Procedimientos estéticos avanzados' },
      { name: 'Medicina Regenerativa & Longevidad', description: 'Terapias antiedad y bienestar' },
      { name: 'DRIPS - Sueroterapia', description: 'Terapias intravenosas y sueroterapia' },
      { name: 'Faciales', description: 'Tratamientos faciales especializados' },
      { name: 'Masajes', description: 'Masajes terapéuticos y relajantes' },
      { name: 'Wellness Integral', description: 'Servicios de bienestar integral' },
      { name: 'Breathe & Move', description: 'Clases de movimiento y respiración consciente' }
    ]
    
    console.log('\n📝 Ensuring correct services exist...')
    
    // Check which services need to be created or updated
    for (const service of correctServices) {
      // Check if service exists
      const { data: existing } = await supabase
        .from('services')
        .select('id, name, description')
        .eq('name', service.name)
        .single()
      
      if (!existing) {
        // Create new service
        const { error: insertError } = await supabase
          .from('services')
          .insert({
            name: service.name,
            description: service.description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (insertError) {
          console.error(`Error creating ${service.name}:`, insertError)
        } else {
          console.log(`✅ Created: ${service.name}`)
        }
      } else if (existing.description !== service.description) {
        // Update description if different
        const { error: updateError } = await supabase
          .from('services')
          .update({
            description: service.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        if (updateError) {
          console.error(`Error updating ${service.name}:`, updateError)
        } else {
          console.log(`✅ Updated: ${service.name}`)
        }
      } else {
        console.log(`✓ ${service.name} is correct`)
      }
    }
    
    // Check final state
    const { data: finalServices } = await supabase
      .from('services')
      .select('name, description')
      .order('name')
    
    console.log('\n✨ Final services list:')
    finalServices?.forEach(service => {
      console.log(`- ${service.name}: ${service.description}`)
    })
    
    if (finalServices?.length !== correctServices.length) {
      console.log('\n⚠️  Warning: Service count mismatch!')
      console.log(`Expected: ${correctServices.length}, Got: ${finalServices?.length || 0}`)
    } else {
      console.log('\n✅ Services synchronization complete!')
      console.log('Total services: ', finalServices?.length)
    }
    
  } catch (error) {
    console.error('Fatal error:', error)
  }
}

// Run the sync
cleanAndSyncServices()