import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { 
  getUserCreditBalance, 
  getUserCreditsHistory, 
  getUserCreditTransactions,
  UserCredit,
  CreditTransaction 
} from '../../utils/creditsManager';

interface MyCreditsScreenProps {
  navigation: any;
}

export const MyCreditsScreen: React.FC<MyCreditsScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [credits, setCredits] = useState<UserCredit[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'credits' | 'history'>('credits');

  useEffect(() => {
    loadCreditsData();
  }, []);

  const loadCreditsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cargar datos en paralelo
      const [userBalance, userCredits, userTransactions] = await Promise.all([
        getUserCreditBalance(user.id),
        getUserCreditsHistory(user.id),
        getUserCreditTransactions(user.id)
      ]);

      setBalance(userBalance);
      setCredits(userCredits);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error loading credits data:', error);
      // No mostrar alerta si solo es que las tablas no existen
      if (!error.message?.includes('user_credits') && !error.message?.includes('credit_transactions')) {
        Alert.alert('Error', 'No se pudieron cargar los créditos');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCreditsData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-CO')} COP`;
  };

  const getCreditTypeIcon = (type: string) => {
    switch (type) {
      case 'cancellation':
        return 'calendar-remove';
      case 'refund':
        return 'cash-refund';
      case 'promotion':
        return 'gift';
      case 'admin_adjustment':
        return 'account-cog';
      default:
        return 'cash';
    }
  };

  const getCreditTypeLabel = (type: string) => {
    switch (type) {
      case 'cancellation':
        return 'Cancelación';
      case 'refund':
        return 'Reembolso';
      case 'promotion':
        return 'Promoción';
      case 'admin_adjustment':
        return 'Ajuste administrativo';
      default:
        return type;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return 'plus-circle';
      case 'used':
        return 'minus-circle';
      case 'expired':
        return 'clock-alert';
      case 'refunded':
        return 'cash-refund';
      default:
        return 'cash';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'earned':
        return Colors.ui.success;
      case 'used':
        return Colors.primary.dark;
      case 'expired':
        return Colors.ui.warning;
      case 'refunded':
        return Colors.secondary.terracotta;
      default:
        return Colors.text.secondary;
    }
  };

  const renderCreditCard = (credit: UserCredit) => {
    const isExpired = credit.expires_at && new Date(credit.expires_at) < new Date();
    const isUsed = credit.is_used;
    
    return (
      <View key={credit.id} style={[styles.creditCard, (isExpired || isUsed) && styles.creditCardInactive]}>
        <View style={styles.creditHeader}>
          <View style={[styles.creditIcon, { backgroundColor: isExpired || isUsed ? Colors.text.light : Colors.ui.success }]}>
            <MaterialCommunityIcons 
              name={getCreditTypeIcon(credit.credit_type)} 
              size={20} 
              color="#FFFFFF" 
            />
          </View>
          <View style={styles.creditInfo}>
            <Text style={[styles.creditAmount, (isExpired || isUsed) && styles.inactiveText]}>
              {formatCurrency(credit.amount)}
            </Text>
            <Text style={[styles.creditDate, (isExpired || isUsed) && styles.inactiveText]}>
              {formatDate(credit.created_at)}
            </Text>
          </View>
          <View style={styles.creditStatus}>
            {isUsed ? (
              <Text style={styles.usedLabel}>Usado</Text>
            ) : isExpired ? (
              <Text style={styles.expiredLabel}>Expirado</Text>
            ) : (
              <Text style={styles.availableLabel}>Disponible</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTransactionItem = (transaction: CreditTransaction) => {
    const color = getTransactionTypeColor(transaction.transaction_type);
    const isPositive = transaction.transaction_type === 'earned';
    
    return (
      <View key={transaction.id} style={styles.transactionItem}>
        <View style={[styles.transactionIcon, { backgroundColor: color + '20' }]}>
          <MaterialCommunityIcons 
            name={getTransactionTypeIcon(transaction.transaction_type)} 
            size={18} 
            color={color} 
          />
        </View>
        
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionAmount}>
            {isPositive ? '+' : ''}{formatCurrency(transaction.amount)}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(transaction.created_at)}
          </Text>
        </View>
        
        <Text style={[styles.transactionBalance, { color: isPositive ? Colors.ui.success : color }]}>
          {formatCurrency(transaction.balance_after)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.dark} />
          <Text style={styles.loadingText}>Cargando créditos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Créditos</Text>
      </View>

      {/* Balance Section */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceContent}>
          <MaterialCommunityIcons name="wallet" size={32} color={Colors.primary.dark} />
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Balance disponible</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          </View>
        </View>
        <Text style={styles.balanceNote}>
          Disponible para usar
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'credits' && styles.activeTab]}
          onPress={() => setActiveTab('credits')}
        >
          <Text style={[styles.tabText, activeTab === 'credits' && styles.activeTabText]}>
            Créditos
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

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.dark]}
          />
        }
      >
        {activeTab === 'credits' ? (
          <View style={styles.creditsContainer}>
            {credits.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="wallet-outline" 
                  size={64} 
                  color={Colors.text.secondary} 
                />
                <Text style={styles.emptyTitle}>No tienes créditos</Text>
                <Text style={styles.emptyDescription}>
                  Cancela una cita y recibirás créditos automáticamente
                </Text>
              </View>
            ) : (
              credits.map(renderCreditCard)
            )}
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="history" 
                  size={64} 
                  color={Colors.text.secondary} 
                />
                <Text style={styles.emptyTitle}>Sin historial</Text>
                <Text style={styles.emptyDescription}>
                  Aquí verás el historial de movimientos
                </Text>
              </View>
            ) : (
              transactions.map(renderTransactionItem)
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  balanceCard: {
    backgroundColor: Colors.ui.surface,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: Colors.primary.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceInfo: {
    marginLeft: 16,
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  balanceNote: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
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
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.primary.dark,
  },
  content: {
    flex: 1,
  },
  creditsContainer: {
    padding: 20,
  },
  creditCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.ui.success,
  },
  creditCardInactive: {
    opacity: 0.6,
    borderLeftColor: Colors.text.light,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  creditIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  creditInfo: {
    flex: 1,
  },
  creditAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  creditStatus: {
    alignItems: 'flex-end',
  },
  availableLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ui.success,
    backgroundColor: Colors.ui.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    backgroundColor: Colors.text.secondary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiredLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ui.warning,
    backgroundColor: Colors.ui.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creditDescription: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  creditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditDate: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  expirationDate: {
    fontSize: 12,
    color: Colors.ui.warning,
  },
  expiredText: {
    color: Colors.ui.error,
  },
  usedDate: {
    fontSize: 12,
    color: Colors.text.light,
  },
  inactiveText: {
    color: Colors.text.light,
  },
  historyContainer: {
    padding: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  transactionBalance: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});