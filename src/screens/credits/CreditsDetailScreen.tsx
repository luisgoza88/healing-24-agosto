import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/colors';
import { useUserCredits, formatCredits, getTransactionColor } from '../../hooks/useCredits';

export const CreditsDetailScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const { credits, transactions, loading: creditsLoading, refresh: refreshCredits } = useUserCredits();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCredits();
    setRefreshing(false);
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'earned':
        return 'Ganado';
      case 'used':
        return 'Usado';
      case 'expired':
        return 'Expirado';
      case 'adjustment':
        return 'Ajuste';
      default:
        return type;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return 'plus-circle';
      case 'used':
        return 'minus-circle';
      case 'expired':
        return 'clock-alert';
      case 'adjustment':
        return 'tune';
      default:
        return 'circle';
    }
  };

  if (creditsLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Créditos</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Créditos</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <MaterialCommunityIcons name="refresh" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary.green}
            colors={[Colors.primary.green]}
          />
        }
      >
        {/* Tarjeta Principal de Saldo */}
        <View style={styles.balanceCard}>
          <MaterialCommunityIcons name="wallet" size={32} color="#FFFFFF" />
          <Text style={styles.balanceLabel}>Saldo Disponible</Text>
          <Text style={styles.balanceAmount}>
            {credits ? formatCredits(credits.available_credits) : '$0'}
          </Text>
          {credits && credits.updated_at && (
            <Text style={styles.lastUpdate}>
              Última actualización: {new Date(credits.updated_at).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          )}
        </View>

        {/* Estadísticas */}
        {credits && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="trending-up" size={24} color={Colors.primary.green} />
              <Text style={styles.statLabel}>Total Ganado</Text>
              <Text style={styles.statValue}>{formatCredits(credits.total_earned)}</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="trending-down" size={24} color="#EF4444" />
              <Text style={styles.statLabel}>Total Usado</Text>
              <Text style={styles.statValue}>{formatCredits(credits.total_used)}</Text>
            </View>
          </View>
        )}

        {/* Historial de Transacciones */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Historial de Transacciones</Text>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={48} color={Colors.ui.border} />
              <Text style={styles.emptyText}>No hay transacciones aún</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: `${getTransactionColor(transaction.transaction_type)}20` }
                  ]}>
                    <MaterialCommunityIcons
                      name={getTransactionIcon(transaction.transaction_type)}
                      size={24}
                      color={getTransactionColor(transaction.transaction_type)}
                    />
                  </View>
                  
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <View style={styles.transactionMeta}>
                      <Text style={styles.transactionDate}>
                        {new Date(transaction.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                      <Text style={styles.transactionSource}>
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={[
                    styles.transactionAmount,
                    { color: getTransactionColor(transaction.transaction_type) }
                  ]}>
                    {transaction.amount > 0 ? '+' : ''}{formatCredits(Math.abs(transaction.amount))}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Información sobre créditos */}
        <View style={styles.infoSection}>
          <MaterialCommunityIcons name="information" size={20} color={Colors.primary.green} />
          <Text style={styles.infoText}>
            Los créditos se generan automáticamente cuando cancelas una cita con pago. 
            Puedes usar estos créditos en tu próxima cita.
          </Text>
        </View>
        
        <View style={{ height: 40 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  balanceCard: {
    backgroundColor: Colors.primary.green,
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 12,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lastUpdate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  transactionsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 12,
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  transactionDate: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  transactionSource: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  transactionAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.light,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary.dark,
    lineHeight: 20,
  },
});