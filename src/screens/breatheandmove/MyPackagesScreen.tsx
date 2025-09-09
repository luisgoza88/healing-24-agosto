import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { format, parseISO, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserPackage {
  id: string;
  package_type: string;
  classes_total: number;
  classes_used: number;
  created_at: string;
  valid_until: string;
  status: 'active' | 'expired' | 'completed';
}

interface ClassHistory {
  id: string;
  class_name: string;
  class_date: string;
  instructor: string;
  status: string;
}

export const MyPackagesScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePackages, setActivePackages] = useState<UserPackage[]>([]);
  const [expiredPackages, setExpiredPackages] = useState<UserPackage[]>([]);
  const [recentClasses, setRecentClasses] = useState<ClassHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Cargar paquetes del usuario
      const { data: packages, error: packagesError } = await supabase
        .from('breathe_move_packages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;

      if (packages) {
        // Separar paquetes activos y expirados
        const now = new Date();
        const active = packages.filter(p => 
          p.status === 'active' && 
          isAfter(parseISO(p.valid_until), now) &&
          (p.classes_total - p.classes_used) > 0
        );
        const expired = packages.filter(p => 
          p.status !== 'active' || 
          !isAfter(parseISO(p.valid_until), now) ||
          (p.classes_total - p.classes_used) === 0
        );

        setActivePackages(active);
        setExpiredPackages(expired);
      }

      // Cargar historial de clases recientes
      const { data: classHistory, error: historyError } = await supabase
        .from('breathe_move_enrollments')
        .select(`
          id,
          status,
          breathe_move_classes (
            class_name,
            class_date,
            instructor
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!historyError && classHistory) {
        const formattedHistory = classHistory.map(item => ({
          id: item.id,
          class_name: item.breathe_move_classes.class_name,
          class_date: item.breathe_move_classes.class_date,
          instructor: item.breathe_move_classes.instructor,
          status: item.status
        }));
        setRecentClasses(formattedHistory);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleBuyPackage = () => {
    navigation.navigate('Packages');
  };

  const handleBookClass = () => {
    navigation.navigate('BreatheAndMove');
  };

  const renderPackageCard = (pkg: UserPackage, isActive: boolean = true) => {
    const classesRemaining = pkg.classes_total - pkg.classes_used;
    const usagePercentage = (pkg.classes_used / pkg.classes_total) * 100;

    return (
      <View key={pkg.id} style={[styles.packageCard, !isActive && styles.expiredCard]}>
        <View style={styles.packageHeader}>
          <Text style={[styles.packageType, !isActive && styles.expiredText]}>
            {pkg.package_type}
          </Text>
          {isActive && classesRemaining < 3 && classesRemaining > 0 && (
            <View style={styles.lowClassesBadge}>
              <Text style={styles.lowClassesText}>Pocas clases</Text>
            </View>
          )}
        </View>

        <View style={styles.classesInfo}>
          <Text style={[styles.classesRemaining, !isActive && styles.expiredText]}>
            {classesRemaining}
          </Text>
          <Text style={[styles.classesLabel, !isActive && styles.expiredText]}>
            clases restantes de {pkg.classes_total}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${usagePercentage}%` },
                !isActive && styles.progressFillExpired
              ]} 
            />
          </View>
        </View>

        <View style={styles.packageFooter}>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Comprado:</Text>
            <Text style={styles.dateValue}>
              {format(parseISO(pkg.created_at), 'd MMM yyyy', { locale: es })}
            </Text>
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>
              {isActive ? 'Vence:' : 'Venció:'}
            </Text>
            <Text style={[styles.dateValue, !isActive && styles.expiredDateText]}>
              {format(parseISO(pkg.valid_until), 'd MMM yyyy', { locale: es })}
            </Text>
          </View>
        </View>

        {isActive && (
          <TouchableOpacity 
            style={styles.usePackageButton}
            onPress={handleBookClass}
          >
            <Text style={styles.usePackageButtonText}>Reservar clase</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderClassHistoryItem = (classItem: ClassHistory) => {
    const statusConfig = {
      confirmed: { color: Colors.primary.green, text: 'Confirmada', icon: 'checkmark-circle' },
      cancelled: { color: Colors.ui.error, text: 'Cancelada', icon: 'close-circle' },
      attended: { color: Colors.primary.dark, text: 'Asistida', icon: 'checkmark-done-circle' },
      no_show: { color: Colors.text.light, text: 'No asistió', icon: 'remove-circle' }
    };

    const config = statusConfig[classItem.status as keyof typeof statusConfig] || statusConfig.confirmed;

    return (
      <View key={classItem.id} style={styles.historyItem}>
        <View style={styles.historyIcon}>
          <Ionicons name={config.icon as any} size={24} color={config.color} />
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyClassName}>{classItem.class_name}</Text>
          <Text style={styles.historyDetails}>
            {format(parseISO(classItem.class_date), "d 'de' MMMM yyyy", { locale: es })} • {classItem.instructor}
          </Text>
          <Text style={[styles.historyStatus, { color: config.color }]}>
            {config.text}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.dark} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Paquetes</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleBuyPackage}
        >
          <Ionicons name="add" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Activos ({activePackages.length})
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

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.dark]}
          />
        }
      >
        {activeTab === 'active' ? (
          <View style={styles.content}>
            {activePackages.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="package-variant-closed" 
                  size={64} 
                  color={Colors.text.light} 
                />
                <Text style={styles.emptyTitle}>No tienes paquetes activos</Text>
                <Text style={styles.emptyDescription}>
                  Compra un paquete para empezar a reservar clases
                </Text>
                <TouchableOpacity 
                  style={styles.buyButton}
                  onPress={handleBuyPackage}
                >
                  <Text style={styles.buyButtonText}>Ver paquetes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Paquetes activos</Text>
                </View>
                {activePackages.map(pkg => renderPackageCard(pkg, true))}
                
                {expiredPackages.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Paquetes vencidos</Text>
                    </View>
                    {expiredPackages.slice(0, 3).map(pkg => renderPackageCard(pkg, false))}
                  </>
                )}
              </>
            )}
          </View>
        ) : (
          <View style={styles.content}>
            {recentClasses.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="history" 
                  size={64} 
                  color={Colors.text.light} 
                />
                <Text style={styles.emptyTitle}>Sin historial de clases</Text>
                <Text style={styles.emptyDescription}>
                  Aún no has tomado ninguna clase
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Clases recientes</Text>
                </View>
                {recentClasses.map(renderClassHistoryItem)}
              </>
            )}
          </View>
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  bottomSpacing: {
    height: 90, // Espacio para la barra de navegación
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.ui.border,
  },
  activeTab: {
    borderBottomColor: Colors.primary.dark,
  },
  tabText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.primary.dark,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  expiredCard: {
    opacity: 0.7,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  expiredText: {
    color: Colors.text.light,
  },
  lowClassesBadge: {
    backgroundColor: Colors.ui.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lowClassesText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  classesInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  classesRemaining: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary.green,
  },
  classesLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.ui.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary.green,
    borderRadius: 4,
  },
  progressFillExpired: {
    backgroundColor: Colors.text.light,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
  },
  dateInfo: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.text.light,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  expiredDateText: {
    color: Colors.ui.error,
  },
  usePackageButton: {
    backgroundColor: Colors.primary.dark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  usePackageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyClassName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  historyDetails: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.text.light,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  buyButton: {
    backgroundColor: Colors.primary.dark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});