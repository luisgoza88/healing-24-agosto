import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/colors';
import { 
  BREATHE_MOVE_PRICING, 
  formatPrice, 
  getValidityText,
  getClassesText 
} from '../../constants/breatheMovePricing';

const { width } = Dimensions.get('window');

export const PackagesScreen = ({ navigation }: any) => {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
    // Aquí navegarías a la pantalla de pago
    navigation.navigate('PackagePayment', { packageId });
  };

  const renderPackageCard = (pkg: any) => {
    const isPopular = pkg.popular;
    const isSpecial = pkg.special;

    return (
      <TouchableOpacity
        key={pkg.id}
        style={[
          styles.packageCard,
          isPopular && styles.popularCard,
          isSpecial && styles.specialCard
        ]}
        onPress={() => handlePackageSelect(pkg.id)}
        activeOpacity={0.8}
      >
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MÁS POPULAR</Text>
          </View>
        )}
        
        {isSpecial && (
          <View style={styles.specialBadge}>
            <MaterialCommunityIcons name="sale" size={20} color="#FFFFFF" />
            <Text style={styles.specialText}>OFERTA</Text>
          </View>
        )}

        <View style={styles.packageHeader}>
          <Text style={styles.packageName}>{pkg.name}</Text>
          <Text style={styles.packageClasses}>{getClassesText(pkg.classes)}</Text>
        </View>

        <View style={styles.priceContainer}>
          {pkg.originalPrice && (
            <Text style={styles.originalPrice}>{formatPrice(pkg.originalPrice)}</Text>
          )}
          <Text style={styles.price}>{formatPrice(pkg.price)}</Text>
        </View>

        <View style={styles.validityContainer}>
          <Ionicons name="calendar-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.validity}>Vigencia: {getValidityText(pkg.validity)}</Text>
        </View>

        {pkg.description && (
          <Text style={styles.description}>{pkg.description}</Text>
        )}

        {pkg.validUntil && (
          <Text style={styles.validUntil}>Válido hasta: {pkg.validUntil}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paquetes y Precios</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <MaterialCommunityIcons name="yoga" size={48} color={Colors.primary.dark} />
          <Text style={styles.introTitle}>Elige tu plan perfecto</Text>
          <Text style={styles.introText}>
            Descubre nuestros paquetes diseñados para adaptarse a tu ritmo de vida
          </Text>
        </View>

        <View style={styles.packagesContainer}>
          {BREATHE_MOVE_PRICING.map(renderPackageCard)}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Información importante</Text>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary.green} />
            <Text style={styles.infoText}>Todos los paquetes incluyen acceso a todas las clases</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary.green} />
            <Text style={styles.infoText}>Reserva tu espacio con anticipación desde la app</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary.green} />
            <Text style={styles.infoText}>Cancela hasta 2 horas antes sin penalización</Text>
          </View>
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  headerRight: {
    width: 40,
  },
  introSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  introText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  packagesContainer: {
    paddingHorizontal: 24,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  popularCard: {
    borderWidth: 2,
    borderColor: Colors.primary.dark,
  },
  specialCard: {
    borderWidth: 2,
    borderColor: Colors.primary.green,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: Colors.primary.dark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  specialBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: Colors.primary.green,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  specialText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  packageHeader: {
    marginBottom: 12,
  },
  packageName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  packageClasses: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  originalPrice: {
    fontSize: 20,
    color: Colors.text.light,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  validity: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  validUntil: {
    fontSize: 12,
    color: Colors.ui.error,
    marginTop: 8,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    marginTop: 32,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 12,
    flex: 1,
  },
  bottomSpacing: {
    height: 32,
  },
});