import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/src/lib/supabase'

// Hook específico para que admins creen pacientes sin auth
export function useAdminCreatePatient() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (patientData: any) => {
      // Opción 1: Intentar crear usuario primero
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: patientData.email,
          password: patientData.password,
          options: {
            data: {
              full_name: patientData.full_name,
              phone: patientData.phone,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })

        if (!authError && authData.user) {
          // Esperar a que el trigger cree el perfil
          await new Promise(resolve => setTimeout(resolve, 1500))

          // Actualizar el perfil con datos adicionales
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              phone: patientData.phone || null,
              date_of_birth: patientData.date_of_birth || null,
              gender: patientData.gender || null,
              address: patientData.address || null,
              city: patientData.city || null,
              emergency_contact_name: patientData.emergency_contact_name || null,
              emergency_contact_phone: patientData.emergency_contact_phone || null,
              medical_conditions: patientData.medical_conditions || null,
              allergies: patientData.allergies || null,
              bio: patientData.bio || null,
            })
            .eq('id', authData.user.id)

          if (updateError) {
            console.error('Error updating profile:', updateError)
          }

          return authData.user
        }
        
        throw authError
      } catch (error: any) {
        // Si falla el signup (usuario existe), intentar crear solo el perfil
        console.log('Signup failed, trying alternative method:', error)
        
        // Verificar si el usuario ya existe
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', patientData.email)
          .single()

        if (existingUser) {
          throw new Error('Este email ya está registrado en el sistema')
        }

        // Si llegamos aquí, hay otro tipo de error
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patientStats'] })
    },
  })
}

// Hook para crear pacientes sin autenticación (solo perfil)
export function useCreatePatientProfile() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (patientData: any) => {
      // Generar un UUID para el nuevo perfil
      const { data: { user }, error: sessionError } = await supabase.auth.getUser()
      
      if (sessionError || !user) {
        throw new Error('No autorizado para crear pacientes')
      }

      // Crear perfil directamente (sin auth)
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          email: patientData.email,
          full_name: patientData.full_name,
          phone: patientData.phone || null,
          date_of_birth: patientData.date_of_birth || null,
          gender: patientData.gender || null,
          address: patientData.address || null,
          city: patientData.city || null,
          emergency_contact_name: patientData.emergency_contact_name || null,
          emergency_contact_phone: patientData.emergency_contact_phone || null,
          medical_conditions: patientData.medical_conditions || null,
          allergies: patientData.allergies || null,
          bio: patientData.bio || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patientStats'] })
    },
  })
}