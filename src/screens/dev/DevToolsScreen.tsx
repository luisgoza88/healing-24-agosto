import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { seedTestAppointments, clearUserAppointments } from '../../utils/seedTestData';
import { supabase } from '../../lib/supabase';
import { createTestBreatheMovePackage } from '../../utils/testPayment';
import { checkBreatheMoveCitas } from '../../utils/checkBreatheMoveCitas';
import { testSupabasePermissions, formatTestResults } from '../../utils/testSupabasePermissions';
import { seedBreatheMoveClasses } from '../../utils/seedBreatheMoveClasses';
import { forceSeedClasses } from '../../utils/forceSeedClasses';

export const DevToolsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<any>(null);

  const handleSeedData = async () => {
    Alert.alert(
      'Crear datos de prueba',
      '¿Deseas crear citas de prueba? Esto agregará 6 citas de ejemplo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear',
          onPress: async () => {
            try {
              setLoading(true);
              await seedTestAppointments();
              Alert.alert('Éxito', 'Citas de prueba creadas correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudieron crear las citas de prueba');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearData = async () => {
    Alert.alert(
      'Eliminar datos',
      '¿Estás seguro de eliminar todas tus citas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await clearUserAppointments();
              Alert.alert('Éxito', 'Citas eliminadas correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudieron eliminar las citas');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRunMigration = async () => {
    Alert.alert(
      'Ejecutar migración',
      'Esto agregará la columna appointment_time si no existe. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ejecutar',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Ejecutar la migración directamente
              const { error } = await supabase.rpc('exec_sql', {
                sql: `
                  ALTER TABLE appointments 
                  ADD COLUMN IF NOT EXISTS appointment_time TIME NOT NULL DEFAULT '09:00:00';
                  
                  ALTER TABLE appointments 
                  ALTER COLUMN appointment_date TYPE DATE USING appointment_date::DATE;
                `
              });

              if (error) throw error;

              Alert.alert('Éxito', 'Migración ejecutada correctamente');
            } catch (error) {
              // Si falla, intentamos una alternativa
              try {
                // Verificar si la columna ya existe
                const { data, error: checkError } = await supabase
                  .from('appointments')
                  .select('appointment_time')
                  .limit(1);

                if (checkError && checkError.message.includes('appointment_time')) {
                  Alert.alert(
                    'Información',
                    'La columna appointment_time no existe. Por favor, ejecuta esta migración en el dashboard de Supabase:\n\n' +
                    'ALTER TABLE appointments ADD COLUMN appointment_time TIME NOT NULL DEFAULT \'09:00:00\';'
                  );
                } else {
                  Alert.alert('Info', 'La columna ya existe o la migración se completó');
                }
              } catch (e) {
                Alert.alert('Error', 'No se pudo ejecutar la migración');
              }
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCreateNotificationTables = async () => {
    Alert.alert(
      'Crear tablas de notificaciones',
      'Esto creará las tablas notification_preferences y breathe_move_classes. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear',
          onPress: async () => {
            try {
              setLoading(true);
              Alert.alert(
                'Instrucciones',
                'Por favor, ejecuta el archivo de migración:\n\n' +
                'supabase/migrations/20240109_create_notification_tables.sql\n\n' +
                'en el dashboard de Supabase (SQL Editor) para crear las tablas necesarias.'
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleActivateTestAccess = async () => {
    Alert.alert(
      'Activar Acceso de Prueba',
      'Esto te dará acceso completo a Hot Studio y Breathe & Move para pruebas. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Activar',
          onPress: async () => {
            try {
              setLoading(true);
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error('No user found');

              // Primero buscar si hay tipos de membresía
              const { data: membershipTypes } = await supabase
                .from('hot_studio_memberships')
                .select('id')
                .eq('active', true)
                .limit(1)
                .single();

              if (membershipTypes) {
                // Crear membresía de prueba para Hot Studio
                await supabase
                  .from('user_memberships')
                  .insert({
                    user_id: user.id,
                    membership_id: membershipTypes.id,
                    start_date: new Date().toISOString(),
                    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'active',
                    classes_used: 0,
                    payment_id: null,
                    auto_renew: false
                  });
              }

              // Crear paquete de prueba para Breathe & Move
              await createTestBreatheMovePackage(user.id, 12);

              Alert.alert(
                'Éxito', 
                'Se activó el acceso de prueba:\n\n' +
                '• Hot Studio: Membresía ilimitada por 30 días\n' +
                '• Breathe & Move: 12 clases válidas por 30 días\n\n' +
                'Ahora puedes reservar clases sin pagar.'
              );
            } catch (error) {
              console.error('Error activating test access:', error);
              Alert.alert('Error', 'No se pudo activar el acceso de prueba');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCreateProfilesAndStorage = async () => {
    Alert.alert(
      'Crear profiles y storage',
      'Esto creará la tabla profiles y el bucket avatars. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ver instrucciones',
          onPress: async () => {
            try {
              setLoading(true);
              Alert.alert(
                'Instrucciones - IMPORTANTE',
                '1. Ejecuta el archivo:\n' +
                'supabase/migrations/20240110_create_profiles_and_storage.sql\n\n' +
                '2. Esto creará:\n' +
                '   - Tabla "profiles" para datos del usuario\n' +
                '   - Bucket "avatars" para fotos de perfil\n' +
                '   - Políticas de seguridad RLS\n\n' +
                '3. Lee docs/SUPABASE_SETUP.md para más detalles'
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const loadCurrentPackage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('breathe_move_packages')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setCurrentPackage(data);
      }
    } catch (error) {
      console.error('Error loading package:', error);
    }
  };

  React.useEffect(() => {
    loadCurrentPackage();
  }, []);

  const createTestPackage = async () => {
    Alert.alert(
      'Crear paquete de prueba',
      '¿Deseas crear un paquete de 8 clases para pruebas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear',
          onPress: async () => {
            try {
              setLoading(true);
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert('Error', 'No hay usuario autenticado');
                return;
              }

              // Desactivar paquetes existentes
              await supabase
                .from('breathe_move_packages')
                .update({ status: 'expired' })
                .eq('user_id', user.id)
                .eq('status', 'active');

              // Crear nuevo paquete
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + 30);

              const { data, error } = await supabase
                .from('breathe_move_packages')
                .insert({
                  user_id: user.id,
                  package_type: '8-classes',
                  classes_total: 8,
                  classes_used: 0,
                  status: 'active',
                  valid_until: expiryDate.toISOString(),
                  payment_status: 'paid',
                  payment_amount: 520000
                })
                .select()
                .single();

              if (error) throw error;

              setCurrentPackage(data);
              Alert.alert('Éxito', 'Paquete de 8 clases creado correctamente');
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'No se pudo crear el paquete de prueba');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const resetPackageUsage = async () => {
    if (!currentPackage) {
      Alert.alert('Info', 'No tienes un paquete activo');
      return;
    }

    Alert.alert(
      'Resetear uso del paquete',
      '¿Deseas resetear el uso del paquete a 0/8 clases?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear',
          onPress: async () => {
            try {
              setLoading(true);
              
              const { error } = await supabase
                .from('breathe_move_packages')
                .update({ classes_used: 0 })
                .eq('id', currentPackage.id);

              if (error) throw error;

              // Eliminar inscripciones existentes
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('breathe_move_enrollments')
                  .delete()
                  .eq('user_id', user.id)
                  .eq('package_id', currentPackage.id);
              }

              await loadCurrentPackage();
              Alert.alert('Éxito', 'Paquete reseteado correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo resetear el paquete');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const viewRawAppointments = async () => {
    try {
      setLoading(true);
      console.log('=== VIEWING RAW APPOINTMENTS ===');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }
      
      // Simple direct query
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      console.log('Raw query result:', { data, error });
      
      if (error) {
        Alert.alert('Query Error', error.message);
        return;
      }
      
      if (!data || data.length === 0) {
        Alert.alert('No Data', 'No se encontraron citas para este usuario.\n\nUser ID: ' + user.id);
        return;
      }
      
      const summary = data.map((apt, idx) => 
        `${idx + 1}. ${apt.appointment_date} - ${apt.status}\n   ID: ${apt.id.substring(0, 8)}...`
      ).join('\n\n');
      
      Alert.alert(
        `Citas Encontradas (${data.length})`,
        summary.substring(0, 500) + (summary.length > 500 ? '...' : '')
      );
      
    } catch (error) {
      console.error('View error:', error);
      Alert.alert('Error', 'Error al ver citas');
    } finally {
      setLoading(false);
    }
  };

  const debugBreatheMovePackages = async () => {
    try {
      setLoading(true);
      console.log('=== DEBUGGING BREATHE & MOVE PACKAGES ===');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }
      
      // 1. Query sin filtros
      const { data: allPackages, error: allError } = await supabase
        .from('breathe_move_packages')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('All packages (no filters):', allPackages);
      console.log('Query error:', allError);
      
      // 2. Query con filtros como en ClassEnrollmentScreen
      const { data: filteredPackages, error: filteredError } = await supabase
        .from('breathe_move_packages')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('valid_until', new Date().toISOString());
      
      console.log('Filtered packages:', filteredPackages);
      console.log('Current date ISO:', new Date().toISOString());
      
      // 3. Verificar estructura de datos
      if (allPackages && allPackages.length > 0) {
        const firstPackage = allPackages[0];
        console.log('First package structure:', {
          id: firstPackage.id,
          status: firstPackage.status,
          valid_until: firstPackage.valid_until,
          classes_total: firstPackage.classes_total,
          classes_used: firstPackage.classes_used,
          classes_remaining: (firstPackage.classes_total - firstPackage.classes_used)
        });
      }
      
      const message = `
📦 Breathe & Move Packages Debug:
- User ID: ${user.id}

Sin filtros:
- Total paquetes: ${allPackages?.length || 0}
${allPackages?.map((p, i) => `
${i+1}. ${p.package_type}
   Status: ${p.status}
   Valid until: ${p.valid_until}
   Classes: ${p.classes_used}/${p.classes_total}`).join('') || '  (No packages)'}

Con filtros (active + valid_until):
- Paquetes activos: ${filteredPackages?.length || 0}

Fecha actual: ${new Date().toISOString()}

${allError ? `\n❌ Error sin filtros: ${allError.message}` : ''}
${filteredError ? `\n❌ Error con filtros: ${filteredError.message}` : ''}
      `;
      
      Alert.alert('Debug Packages', message);
      
    } catch (error) {
      console.error('Debug error:', error);
      Alert.alert('Error', 'Error al depurar paquetes');
    } finally {
      setLoading(false);
    }
  };

  const checkRLSStatus = async () => {
    try {
      setLoading(true);
      console.log('=== CHECKING RLS AND DATA VISIBILITY ===');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }
      
      console.log('Current user:', user.id, user.email);
      
      // 1. Check appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('Appointments found:', appointments?.length || 0);
      if (appointmentsError) console.error('Appointments error:', appointmentsError);
      
      // 2. Check breathe_move_packages
      const { data: packages, error: packagesError } = await supabase
        .from('breathe_move_packages')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('Packages found:', packages?.length || 0);
      if (packagesError) console.error('Packages error:', packagesError);
      
      // 3. Check hot studio memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('Memberships found:', memberships?.length || 0);
      if (membershipsError) console.error('Memberships error:', membershipsError);
      
      // 4. Check if RLS is preventing data visibility
      const { data: rlsCheck } = await supabase.rpc('current_setting', { 
        setting_name: 'request.jwt.claims' 
      }).maybeSingle();
      
      const message = `
📊 Data Visibility Check:
- User ID: ${user.id}
- Email: ${user.email}

📅 Appointments: ${appointments?.length || 0}
${appointments?.length ? appointments.map((a, i) => `  ${i+1}. ${a.appointment_date} - ${a.status}`).join('\n') : '  (No appointments found)'}

📦 Breathe & Move Packages: ${packages?.length || 0}
${packages?.length ? packages.map((p, i) => `  ${i+1}. ${p.package_type} - ${p.status}`).join('\n') : '  (No packages found)'}

💪 Hot Studio Memberships: ${memberships?.length || 0}
${memberships?.length ? memberships.map((m, i) => `  ${i+1}. Status: ${m.status}`).join('\n') : '  (No memberships found)'}

🔒 RLS Status: ${rlsCheck ? 'Active' : 'Unknown'}

${appointmentsError ? `\n❌ Appointments Error: ${appointmentsError.message}` : ''}
${packagesError ? `\n❌ Packages Error: ${packagesError.message}` : ''}
${membershipsError ? `\n❌ Memberships Error: ${membershipsError.message}` : ''}
      `;
      
      Alert.alert('Data Visibility Report', message);
      
    } catch (error) {
      console.error('RLS check error:', error);
      Alert.alert('Error', 'Error checking data visibility');
    } finally {
      setLoading(false);
    }
  };

  const testRLSPermissions = async () => {
    try {
      setLoading(true);
      
      console.log('=== RUNNING COMPREHENSIVE RLS PERMISSIONS TEST ===');
      
      const results = await testSupabasePermissions();
      
      if (results.error) {
        Alert.alert('Error', results.error);
        return;
      }
      
      const formattedResults = formatTestResults(results);
      console.log(formattedResults);
      
      // Create a shorter summary for the alert
      const alertSummary = results.results.map((r: any) => 
        `${r.success ? '✅' : '❌'} ${r.table} - ${r.operation}`
      ).join('\n');
      
      Alert.alert(
        `Permission Test Results (${results.summary.passed}/${results.summary.total} passed)`,
        alertSummary + '\n\nCheck console for detailed results.',
        [
          {
            text: 'Ver Detalles',
            onPress: () => {
              Alert.alert(
                'Detailed Results',
                formattedResults.substring(0, 500) + '...\n\n(Full results in console)'
              );
            }
          },
          { text: 'OK' }
        ]
      );
      
    } catch (error) {
      console.error('Permission test error:', error);
      Alert.alert('Error', 'Failed to run permission tests');
    } finally {
      setLoading(false);
    }
  };

  const testCreateAppointment = async () => {
    try {
      setLoading(true);
      
      // 1. Debug: Get current user
      console.log('=== DEBUGGING APPOINTMENT CREATION ===');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        Alert.alert('Error', 'Error al obtener usuario: ' + userError.message);
        return;
      }
      
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }
      
      console.log('Current user ID:', user.id);
      console.log('User email:', user.email);

      // 2. Debug: Check for existing professionals
      const { data: professionals, error: profListError } = await supabase
        .from('professionals')
        .select('*')
        .limit(5);
      
      console.log('Available professionals:', professionals);
      if (profListError) console.error('Error listing professionals:', profListError);

      // Get or create professional
      let professionalId;
      if (professionals && professionals.length > 0) {
        professionalId = professionals[0].id;
        console.log('Using existing professional:', professionals[0]);
      } else {
        // Create a professional if none exist
        const { data: newProf, error: profError } = await supabase
          .from('professionals')
          .insert({
            full_name: 'Dra. Estefanía González',
            title: 'Médica Funcional',
            specialties: ['Medicina Funcional'],
            active: true
          })
          .select()
          .single();

        if (profError) {
          console.error('Error creating professional:', profError);
          throw profError;
        }
        
        professionalId = newProf.id;
        console.log('Created new professional:', newProf);
      }

      // 3. Debug: Check for services
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*');
      
      console.log('Available services:', services);
      if (servicesError) console.error('Error listing services:', servicesError);

      // Get service
      const service = services?.find(s => s.code === 'medicina-funcional') || services?.[0];
      
      if (!service) {
        Alert.alert('Error', 'No hay servicios disponibles en la base de datos');
        return;
      }
      
      console.log('Using service:', service);

      // 4. Create appointment with detailed logging
      const testAppointment = {
        user_id: user.id,
        service_id: service.id,
        professional_id: professionalId,
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        appointment_time: '14:00:00',
        end_time: '15:00:00',
        duration: 60,
        status: 'confirmed',
        total_amount: 250000,
        notes: 'Medicina Funcional - Consulta de prueba (Debug)'
      };

      console.log('Appointment data to insert:', testAppointment);

      const { data, error } = await supabase
        .from('appointments')
        .insert(testAppointment)
        .select()
        .single();

      if (error) {
        console.error('=== INSERT ERROR ===');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        Alert.alert('Error al insertar', `${error.message}\n\nCode: ${error.code}\nHint: ${error.hint}`);
      } else {
        console.log('=== APPOINTMENT CREATED SUCCESSFULLY ===');
        console.log('Created appointment:', data);
        
        // 5. Verify the appointment was created
        const { data: verifyData, error: verifyError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', data.id)
          .single();
        
        console.log('Verification - appointment exists:', verifyData);
        if (verifyError) console.error('Verification error:', verifyError);
        
        // 6. Check all user appointments
        const { data: allAppointments, error: allError } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user.id);
        
        console.log('Total user appointments:', allAppointments?.length || 0);
        if (allError) console.error('Error fetching all appointments:', allError);
        
        Alert.alert(
          'Éxito', 
          `Cita creada con ID: ${data.id}\n\nTotal de citas del usuario: ${allAppointments?.length || 0}`
        );
      }
    } catch (error) {
      console.error('=== UNEXPECTED ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error:', error);
      Alert.alert('Error', 'Error inesperado al crear la cita');
    } finally {
      setLoading(false);
    }
  };

  const seedBreatheMoveClassesHandler = async () => {
    Alert.alert(
      'Cargar Clases de Breathe & Move',
      '¿Deseas cargar las clases de Breathe & Move para los próximos 7 días en la base de datos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cargar',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await seedBreatheMoveClasses();
              
              if (result.success) {
                Alert.alert(
                  'Éxito',
                  result.message,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Refrescar la pantalla o navegar
                        console.log('Classes seeded successfully');
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudieron cargar las clases');
              console.error('Seed error:', error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Herramientas de Desarrollo</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Breathe & Move - Paquetes de Prueba</Text>
          
          {currentPackage ? (
            <View style={styles.packageInfo}>
              <Text style={styles.packageInfoText}>
                Paquete activo: {currentPackage.package_type.replace('-', ' ')}
              </Text>
              <Text style={styles.packageInfoText}>
                Clases usadas: {currentPackage.classes_used} / {currentPackage.classes_total}
              </Text>
              <Text style={styles.packageInfoText}>
                Válido hasta: {new Date(currentPackage.valid_until).toLocaleDateString('es-CO')}
              </Text>
            </View>
          ) : (
            <View style={styles.packageInfo}>
              <Text style={styles.packageInfoText}>No tienes paquetes activos</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={createTestPackage}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🎫 Crear paquete de 8 clases</Text>
          </TouchableOpacity>

          {currentPackage && (
            <TouchableOpacity
              style={[styles.button, styles.warningButton]}
              onPress={resetPackageUsage}
              disabled={loading}
            >
              <Text style={styles.buttonText}>🔄 Resetear uso del paquete (0/8)</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base de Datos - Citas Médicas</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={seedBreatheMoveClassesHandler}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🏃 Cargar clases de Breathe & Move</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#F59E0B' }]}
            onPress={async () => {
              try {
                setLoading(true);
                const result = await forceSeedClasses();
                Alert.alert('Éxito', 'Clases regeneradas correctamente');
              } catch (error) {
                Alert.alert('Error', 'No se pudieron regenerar las clases');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔄 Forzar regeneración de clases</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#7C3AED' }]}
            onPress={() => {
              Alert.alert(
                'Fix RLS para Breathe & Move',
                'Ejecuta este SQL en Supabase:\n\n' +
                '-- Allow authenticated users to insert\n' +
                'DROP POLICY IF EXISTS "Authenticated users can insert classes" ON breathe_move_classes;\n' +
                'CREATE POLICY "Authenticated users can insert classes" ON breathe_move_classes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);\n\n' +
                '-- Allow authenticated users to delete\n' +
                'CREATE POLICY "Authenticated users can delete classes" ON breathe_move_classes FOR DELETE USING (auth.uid() IS NOT NULL);',
                [
                  { text: 'Copiar SQL', onPress: () => console.log('SQL copiado') },
                  { text: 'OK' }
                ]
              );
            }}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>🔐 Ver SQL para Fix RLS B&M</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRunMigration}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔧 Ejecutar migración appointments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreateNotificationTables}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔔 Crear tablas de notificaciones</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreateProfilesAndStorage}
            disabled={loading}
          >
            <Text style={styles.buttonText}>👤 Crear profiles y storage</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={handleSeedData}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🌱 Crear citas de prueba</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={testCreateAppointment}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🧪 Probar crear una cita</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#DC2626' }]}
            onPress={testRLSPermissions}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>🔐 Test RLS Permissions (DELETE/UPDATE)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#6B46C1' }]}
            onPress={checkRLSStatus}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>🔍 Verificar Visibilidad de Datos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#E91E63' }]}
            onPress={debugBreatheMovePackages}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>🐛 Debug Paquetes B&M</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#0891B2' }]}
            onPress={viewRawAppointments}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>👁️ Ver Citas Raw</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearData}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🗑️ Eliminar todas las citas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceso de Prueba</Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.primary.green }]}
            onPress={handleActivateTestAccess}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>🎫 Activar Acceso Total de Prueba</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.primary.dark }]}
            onPress={async () => {
              setLoading(true);
              await checkBreatheMoveCitas();
              setLoading(false);
              Alert.alert('Verificación completada', 'Revisa la consola para ver los detalles');
            }}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>🧘 Verificar Citas Breathe & Move</Text>
          </TouchableOpacity>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              El acceso de prueba incluye:
              {'\n'}• Hot Studio: Membresía ilimitada por 30 días
              {'\n'}• Breathe & Move: 12 clases válidas por 30 días
              {'\n'}• Sin pagos reales - todo es simulado
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Las citas de prueba incluyen:
              {'\n'}• 3 citas futuras (confirmadas y pendientes)
              {'\n'}• 3 citas pasadas (completadas y canceladas)
              {'\n'}• Diferentes servicios y profesionales
              {'\n'}• Diferentes estados y fechas
            </Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary.green} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.divider,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backIcon: {
    fontSize: 28,
    color: Colors.primary.green,
    marginRight: 4,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary.green,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary.green,
  },
  successButton: {
    backgroundColor: Colors.ui.success,
  },
  warningButton: {
    backgroundColor: Colors.ui.warning,
  },
  dangerButton: {
    backgroundColor: Colors.ui.error,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: Colors.ui.surface,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  packageInfo: {
    backgroundColor: Colors.primary.beige,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  packageInfoText: {
    fontSize: 14,
    color: Colors.primary.dark,
    lineHeight: 22,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});