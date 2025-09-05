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

interface MembershipType {
  id: string;
  name: string;
  description: string;
  type: 'class_pack' | 'monthly' | 'quarterly' | 'yearly';
  class_count: number | null;
  duration_days: number;
  price: number;
  is_active: boolean;
}

export const MembershipsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [selectedMembership, setSelectedMembership] = useState<string | null>(null);

  useEffect(() => {
    loadMembershipTypes();
  }, []);

  const loadMembershipTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_types')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setMembershipTypes(data || []);
    } catch (error) {
      console.error('Error loading membership types:', error);
      Alert.alert('Error', 'No se pudieron cargar las membresías');
    } finally {
      setLoading(false);
    }
  };

  const getMembershipIcon = (type: string) => {
    switch (type) {
      case 'class_pack':
        return '🎫';
      case 'monthly':
        return '📅';
      case 'quarterly':
        return '📆';
      case 'yearly':
        return '🗓️';
      default:
        return '🎟️';
    }
  };

  const getMembershipBenefits = (membership: MembershipType) => {
    if (membership.class_count) {
      return [
        `${membership.class_count} clases`,
        `Válido por ${membership.duration_days} días`,
        'Usa en cualquier clase',
        'Transferible'
      ];
    } else {
      return [
        'Clases ilimitadas',
        `Válido por ${membership.duration_days} días`,
        'Acceso a todas las clases',
        'Prioridad en reservas',
        'Descuentos en productos'
      ];
    }
  };

  const handleSelectMembership = (membershipId: string) => {
    setSelectedMembership(membershipId);
  };

  const handlePurchase = async () => {
    if (!selectedMembership) {
      Alert.alert('Error', 'Por favor selecciona una membresía');
      return;
    }

    const membership = membershipTypes.find(m => m.id === selectedMembership);
    if (!membership) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para continuar');
        return;
      }

      // Calcular fechas
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + membership.duration_days);

      // Crear membresía
      const { data, error } = await supabase
        .from('user_memberships')
        .insert({
          user_id: user.id,
          membership_type_id: membership.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          classes_remaining: membership.class_count,
          status: 'active',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Navegar a la pantalla de pago
      navigation.navigate('MembershipPayment', {
        membership,
        userMembershipId: data.id
      });
    } catch (error) {
      console.error('Error creating membership:', error);
      Alert.alert('Error', 'No se pudo procesar tu solicitud');
    }
  };

  const renderMembershipCard = (membership: MembershipType) => {
    const isSelected = selectedMembership === membership.id;
    const benefits = getMembershipBenefits(membership);

    return (
      <TouchableOpacity
        key={membership.id}
        style={[styles.membershipCard, isSelected && styles.membershipCardSelected]}
        onPress={() => handleSelectMembership(membership.id)}
        activeOpacity={0.8}
      >
        {membership.type === 'yearly' && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MÁS POPULAR</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <Text style={styles.membershipIcon}>{getMembershipIcon(membership.type)}</Text>
          <View style={styles.membershipInfo}>
            <Text style={styles.membershipName}>{membership.name}</Text>
            <Text style={styles.membershipDescription}>{membership.description}</Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.priceValue}>
            ${membership.price.toLocaleString('es-CO')}
          </Text>
          <Text style={styles.priceCurrency}>COP</Text>
        </View>

        <View style={styles.benefitsContainer}>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedText}>Seleccionado</Text>
          </View>
        )}
      </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Elige tu membresía</Text>
          <Text style={styles.subtitle}>
            Accede a todas nuestras clases de Hot Studio y transforma tu bienestar
          </Text>

          <View style={styles.membershipList}>
            {membershipTypes.map(renderMembershipCard)}
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>¿Cómo funcionan las membresías?</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                • Los paquetes de clases son perfectos si quieres probar
                {'\n'}• Las membresías mensuales te dan acceso ilimitado
                {'\n'}• Puedes cambiar o cancelar tu membresía en cualquier momento
                {'\n'}• Las clases no utilizadas en paquetes no expiran
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {selectedMembership && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={handlePurchase}
          >
            <Text style={styles.purchaseButtonText}>Continuar con el pago</Text>
          </TouchableOpacity>
        </View>
      )}
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
  content: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 32,
    lineHeight: 24,
  },
  membershipList: {
    marginBottom: 32,
  },
  membershipCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.ui.surface,
    position: 'relative',
  },
  membershipCardSelected: {
    borderColor: Colors.primary.green,
    backgroundColor: Colors.primary.beige + '20',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: Colors.primary.orange,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  membershipIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  membershipInfo: {
    flex: 1,
  },
  membershipName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  membershipDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginRight: 8,
  },
  priceCurrency: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  benefitsContainer: {
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitIcon: {
    color: Colors.primary.green,
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  benefitText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  selectedIndicator: {
    backgroundColor: Colors.primary.green,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 100,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: Colors.ui.info + '10',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.ui.background,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.divider,
  },
  purchaseButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});