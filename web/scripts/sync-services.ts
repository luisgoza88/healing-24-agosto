import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function syncServices() {
  console.log('🔄 Synchronizing services...')
  
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
    
    console.log('\n📋 Current services:')
    currentServices?.forEach(service => {
      console.log(`- ${service.name}: ${service.description}`)
    })
    
    // Check for incorrect services
    const incorrectServices = currentServices?.filter(service => 
      ['Acupuntura', 'Fisioterapia', 'Homeopatía', 'Terapias Alternativas'].includes(service.name)
    )
    
    if (incorrectServices && incorrectServices.length > 0) {
      console.log('\n❌ Found incorrect services to remove:', incorrectServices.map(s => s.name))
      
      // Delete incorrect services
      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .in('name', ['Acupuntura', 'Fisioterapia', 'Homeopatía', 'Terapias Alternativas'])
      
      if (deleteError) {
        console.error('Error deleting incorrect services:', deleteError)
        return
      }
      
      console.log('✅ Incorrect services removed')
    }
    
    // Define correct services
    const correctServices = [
      { name: 'Medicina Funcional', description: 'Consultas especializadas y péptidos', default_duration: 60, base_price: 200000 },
      { name: 'Medicina Estética', description: 'Procedimientos estéticos avanzados', default_duration: 60, base_price: 750000 },
      { name: 'Medicina Regenerativa & Longevidad', description: 'Terapias antiedad y bienestar', default_duration: 60, base_price: 180000 },
      { name: 'DRIPS - Sueroterapia', description: 'Terapias intravenosas y sueroterapia', default_duration: 60, base_price: 265000 },
      { name: 'Faciales', description: 'Tratamientos faciales especializados', default_duration: 90, base_price: 380000 },
      { name: 'Masajes', description: 'Masajes terapéuticos y relajantes', default_duration: 75, base_price: 200000 },
      { name: 'Wellness Integral', description: 'Servicios de bienestar integral', default_duration: 60, base_price: 200000 },
      { name: 'Breathe & Move', description: 'Clases de movimiento y respiración consciente', default_duration: 60, base_price: 50000 }
    ]
    
    console.log('\n📝 Syncing correct services...')
    
    // Upsert correct services
    for (const service of correctServices) {
      const { error: upsertError } = await supabase
        .from('services')
        .upsert({
          ...service,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'name'
        })
      
      if (upsertError) {
        console.error(`Error upserting service ${service.name}:`, upsertError)
      } else {
        console.log(`✅ ${service.name} synced`)
      }
    }
    
    // Check final state
    const { data: finalServices } = await supabase
      .from('services')
      .select('name')
      .order('name')
    
    console.log('\n✨ Final services list:')
    finalServices?.forEach(service => {
      console.log(`- ${service.name}`)
    })
    
    console.log('\n✅ Services synchronization complete!')
    
  } catch (error) {
    console.error('Fatal error:', error)
  }
}

// Run the sync
syncServices()