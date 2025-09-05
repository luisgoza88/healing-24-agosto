import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserMembership {
  id: string;
  membership_type_id: string;
  start_date: string;
  end_date: string;
  classes_remaining: number | null;
  status: string;
  payment_status: string;
  created_at: string;
  membership_type?: {
    name: string;
    description: string;
    type: string;
    class_count: number | null;
    duration_days: number;
    price: number;
  };
}

interface ClassHistory {
  id: string;
  class_id: string;
  status: string;
  created_at: string;
  class?: {
    class_date: string;
    start_time: string;
    class_type?: {
      name: string;
      icon: string;
      color: string;
    };
    instructor?: {
      name: string;
    };
  };
}

export const MyMembershipScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [classHistory, setClassHistory] = useState<ClassHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadMembership(),
        loadClassHistory()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_memberships')
        .select(`
          *,
          membership_type:membership_types(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setMembership(data);
    } catch (error) {
      console.error('Error loading membership:', error);
    }
  };

  const loadClassHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('class_enrollments')
        .select(`
          *,
          class:classes(
            class_date,
            start_time,
            class_type:class_types(name, icon, color),
            instructor:instructors(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setClassHistory(data || []);
    } catch (error) {
      console.error('Error loading class history:', error);
    }
  };

  const getDaysRemaining = () => {
    if (!membership) return 0;
    const endDate = new Date(membership.end_date);
    const today = new Date();
    return Math.max(0, differenceInDays(endDate, today));
  };

  const getClassesAttended = () => {
    return classHistory.filter(c => c.status === 'attended').length;
  };

  const handleCancelMembership = () => {
    Alert.alert(
      'Cancelar membresía',
      '¿Estás seguro de que deseas cancelar tu membresía? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_memberships')
                .update({ status: 'cancelled' })
                .eq('id', membership?.id);

              if (error) throw error;
              Alert.alert('Membresía cancelada', 'Tu membresía ha sido cancelada.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar la membresía');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!membership) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backText}>Atrás</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎫</Text>
          <Text style={styles.emptyTitle}>No tienes una membresía activa</Text>
          <Text style={styles.emptyDescription}>
            Obtén una membresía para acceder a todas nuestras clases
          </Text>
          <TouchableOpacity
            style={styles.getMembershipButton}
            onPress={() => navigation.navigate('Memberships')}
          >
            <Text style={styles.getMembershipButtonText}>Ver membresías</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const daysRemaining = getDaysRemaining();
  const classesAttended = getClassesAttended();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.membershipHeader}>
          <Text style={styles.membershipIcon}>
            {membership.membership_type?.type === 'class_pack' ? '🎫' :
             membership.membership_type?.type === 'monthly' ? '📅' :
             membership.membership_type?.type === 'quarterly' ? '📆' : '🗓️'}
          </Text>
          <Text style={styles.membershipName}>
            {membership.membership_type?.name}
          </Text>
          <Text style={styles.membershipStatus}>
            Membresía activa
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.activeTab]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
              Información
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              Historial
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'info' ? (
          <View style={styles.content}>
            {/* Estadísticas */}
            <View style={styles.statsContainer}>
              {membership.classes_remaining !== null ? (
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{membership.classes_remaining}</Text>
                  <Text style={styles.statLabel}>Clases restantes</Text>
                </View>
              ) : (
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>∞</Text>
                  <Text style={styles.statLabel}>Clases ilimitadas</Text>
                </View>
              )}
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{daysRemaining}</Text>
                <Text style={styles.statLabel}>Días restantes</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{classesAttended}</Text>
                <Text style={styles.statLabel}>Clases tomadas</Text>
              </View>
            </View>

            {/* Detalles de la membresía */}
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Detalles de tu membresía</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fecha de inicio:</Text>
                <Text style={styles.detailValue}>
                  {format(new Date(membership.start_date), "d 'de' MMMM, yyyy", { locale: es })}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fecha de vencimiento:</Text>
                <Text style={styles.detailValue}>
                  {format(new Date(membership.end_date), "d 'de' MMMM, yyyy", { locale: es })}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tipo:</Text>
                <Text style={styles.detailValue}>
                  {membership.membership_type?.description}
                </Text>
              </View>
            </View>

            {/* Beneficios */}
            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsTitle}>Tus beneficios</Text>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>
                  Acceso a todas las clases de Hot Studio
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>
                  Reserva con anticipación
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>
                  Cancela sin penalización
                </Text>
              </View>
              {membership.membership_type?.type !== 'class_pack' && (
                <View style={styles.benefitRow}>
                  <Text style={styles.benefitIcon}>✓</Text>
                  <Text style={styles.benefitText}>
                    10% de descuento en productos
                  </Text>
                </View>
              )}
            </View>

            {/* Botones de acción */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.renewButton}
                onPress={() => navigation.navigate('Memberships')}
              >
                <Text style={styles.renewButtonText}>Renovar membresía</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelMembership}
              >
                <Text style={styles.cancelButtonText}>Cancelar membresía</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            {classHistory.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryText}>
                  Aún no has asistido a ninguna clase
                </Text>
              </View>
            ) : (
              classHistory.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View 
                    style={[
                      styles.historyIcon,
                      { backgroundColor: item.class?.class_type?.color || Colors.primary.green }
                    ]}
                  >
                    <Text style={styles.historyIconText}>
                      {item.class?.class_type?.icon || '🧘‍♀️'}
                    </Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyClassName}>
                      {item.class?.class_type?.name}
                    </Text>
                    <Text style={styles.historyDate}>
                      {item.class && format(
                        new Date(item.class.class_date), 
                        "d 'de' MMMM", 
                        { locale: es }
                      )} - {item.class?.start_time.slice(0, 5)}
                    </Text>
                    <Text style={styles.historyInstructor}>
                      {item.class?.instructor?.name}
                    </Text>
                  </View>
                  <View style={styles.historyStatus}>
                    <Text style={[
                      styles.historyStatusText,
                      { color: item.status === 'attended' ? Colors.ui.success :
                               item.status === 'enrolled' ? Colors.primary.green :
                               item.status === 'cancelled' ? Colors.ui.error : Colors.text.secondary }
                    ]}>
                      {item.status === 'attended' ? 'Asistido' :
                       item.status === 'enrolled' ? 'Inscrito' :
                       item.status === 'cancelled' ? 'Cancelado' : 'No asistió'}
                    </Text>
                  </View>
                </View>
              ))
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  getMembershipButton: {
    backgroundColor: Colors.primary.green,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 50,
  },
  getMembershipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  membershipHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  membershipIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  membershipName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  membershipStatus: {
    fontSize: 16,
    color: Colors.ui.success,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.ui.divider,
  },
  activeTab: {
    borderBottomColor: Colors.primary.green,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.primary.green,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.primary.dark,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  benefitsCard: {
    backgroundColor: Colors.primary.beige + '30',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    color: Colors.primary.green,
    fontSize: 16,
    marginRight: 12,
    fontWeight: 'bold',
  },
  benefitText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  actions: {
    gap: 12,
  },
  renewButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  renewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.ui.error,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.ui.error,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyIconText: {
    fontSize: 24,
  },
  historyInfo: {
    flex: 1,
  },
  historyClassName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  historyInstructor: {
    fontSize: 12,
    color: Colors.text.light,
  },
  historyStatus: {
    marginLeft: 12,
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});