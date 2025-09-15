'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/utils/supabase/client';
import { 
  Wallet, 
  Plus, 
  Filter, 
  Search, 
  Download,
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  Gift
} from 'lucide-react';

interface UserCredit {
  id: string;
  user_id: string;
  amount: number;
  credit_type: 'cancellation' | 'refund' | 'promotion' | 'admin_adjustment';
  description?: string;
  expires_at?: string;
  is_used: boolean;
  used_at?: string;
  used_in_appointment_id?: string;
  source_appointment_id?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface CreditTransaction {
  id: string;
  user_id: string;
  credit_id?: string;
  transaction_type: 'earned' | 'used' | 'expired' | 'refunded';
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  appointment_id?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface CreditSummary {
  user_id: string;
  full_name: string;
  email: string;
  available_balance: number;
  total_earned: number;
  total_used: number;
  total_expired: number;
  active_credits_count: number;
}

export default function CreditsManagementPage() {
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<UserCredit[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [creditSummaries, setCreditSummaries] = useState<CreditSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newCreditAmount, setNewCreditAmount] = useState('');
  const [newCreditType, setNewCreditType] = useState<'promotion' | 'admin_adjustment'>('promotion');
  const [newCreditDescription, setNewCreditDescription] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);

  const supabase = createClient();

  // Estadísticas para el overview
  const [stats, setStats] = useState({
    totalActiveCredits: 0,
    totalCreditValue: 0,
    totalUsersWithCredits: 0,
    creditsUsedThisMonth: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCreditSummaries(),
        loadCredits(),
        loadTransactions(),
        loadUsers(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading credits data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCreditSummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('user_credits_summary')
        .select('*')
        .order('available_balance', { ascending: false });

      if (error) throw error;
      setCreditSummaries(data || []);
    } catch (error) {
      console.error('Error loading credit summaries:', error);
    }
  };

  const loadCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCredits(data || []);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'client')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Total créditos activos
      const { data: activeCredits } = await supabase
        .from('user_credits')
        .select('amount')
        .eq('is_used', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      const totalActiveCredits = activeCredits?.length || 0;
      const totalCreditValue = activeCredits?.reduce((sum, credit) => sum + credit.amount, 0) || 0;

      // Usuarios únicos con créditos
      const { data: usersWithCredits } = await supabase
        .from('user_credits')
        .select('user_id')
        .eq('is_used', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      const uniqueUsers = new Set(usersWithCredits?.map(c => c.user_id) || []);
      const totalUsersWithCredits = uniqueUsers.size;

      // Créditos usados este mes
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usedThisMonth } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('transaction_type', 'used')
        .gte('created_at', startOfMonth.toISOString());

      const creditsUsedThisMonth = usedThisMonth?.reduce((sum, t) => sum + t.amount, 0) || 0;

      setStats({
        totalActiveCredits,
        totalCreditValue,
        totalUsersWithCredits,
        creditsUsedThisMonth
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const createCredit = async () => {
    if (!selectedUserId || !newCreditAmount || !newCreditDescription) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      const amount = parseFloat(newCreditAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('El monto debe ser un número válido mayor a 0');
        return;
      }

      // Obtener el usuario actual para created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Error: No hay usuario autenticado');
        return;
      }

      // Crear el crédito
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 12); // Expira en 12 meses

      const { error: creditError } = await supabase
        .from('user_credits')
        .insert({
          user_id: selectedUserId,
          amount: amount,
          credit_type: newCreditType,
          description: newCreditDescription,
          expires_at: expiresAt.toISOString(),
          created_by: user.id
        });

      if (creditError) throw creditError;

      // Obtener balance actual para la transacción
      const { data: balanceData } = await supabase
        .rpc('get_user_credit_balance', { p_user_id: selectedUserId });

      const currentBalance = balanceData || 0;

      // Crear transacción
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: selectedUserId,
          transaction_type: 'earned',
          amount: amount,
          balance_before: currentBalance - amount,
          balance_after: currentBalance,
          description: newCreditDescription,
          created_by: user.id
        });

      // Resetear formulario
      setSelectedUserId('');
      setNewCreditAmount('');
      setNewCreditDescription('');
      setIsCreateDialogOpen(false);

      // Recargar datos
      await loadData();

      alert('Crédito creado exitosamente');
    } catch (error) {
      console.error('Error creating credit:', error);
      alert('Error al crear el crédito');
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-CO')} COP`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCreditTypeLabel = (type: string) => {
    const labels = {
      cancellation: 'Cancelación',
      refund: 'Reembolso',
      promotion: 'Promoción',
      admin_adjustment: 'Ajuste Admin'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      earned: 'Ganado',
      used: 'Usado',
      expired: 'Expirado',
      refunded: 'Reembolsado'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredCredits = credits.filter(credit => {
    const matchesSearch = credit.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credit.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credit.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'active' && !credit.is_used && (!credit.expires_at || new Date(credit.expires_at) > new Date())) ||
                         (filterType === 'used' && credit.is_used) ||
                         (filterType === 'expired' && credit.expires_at && new Date(credit.expires_at) <= new Date());

    return matchesSearch && matchesFilter;
  });

  const filteredTransactions = transactions.filter(transaction => {
    return transaction.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           transaction.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando datos de créditos...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Créditos</h1>
          <p className="text-gray-600 mt-2">
            Administra los créditos de los clientes y visualiza el historial de transacciones
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Crear Crédito
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Crédito</DialogTitle>
              <DialogDescription>
                Otorga créditos manuales a los clientes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user">Cliente</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="amount">Monto (COP)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newCreditAmount}
                  onChange={(e) => setNewCreditAmount(e.target.value)}
                  placeholder="50000"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Tipo de Crédito</Label>
                <Select value={newCreditType} onValueChange={(value: 'promotion' | 'admin_adjustment') => setNewCreditType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotion">Promoción</SelectItem>
                    <SelectItem value="admin_adjustment">Ajuste Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newCreditDescription}
                  onChange={(e) => setNewCreditDescription(e.target.value)}
                  placeholder="Motivo del crédito..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createCredit}>
                Crear Crédito
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos Activos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActiveCredits}</div>
            <p className="text-xs text-muted-foreground">
              créditos sin usar
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCreditValue)}</div>
            <p className="text-xs text-muted-foreground">
              en créditos disponibles
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios con Créditos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsersWithCredits}</div>
            <p className="text-xs text-muted-foreground">
              clientes activos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usados Este Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.creditsUsedThisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              en créditos redimidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen por Cliente</TabsTrigger>
          <TabsTrigger value="credits">Todos los Créditos</TabsTrigger>
          <TabsTrigger value="transactions">Historial de Transacciones</TabsTrigger>
        </TabsList>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, email o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {activeTab === 'credits' && (
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los créditos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="used">Usados</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Créditos por Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Balance Disponible</TableHead>
                    <TableHead>Total Ganado</TableHead>
                    <TableHead>Total Usado</TableHead>
                    <TableHead>Créditos Activos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditSummaries
                    .filter(summary => 
                      summary.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      summary.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((summary) => (
                    <TableRow key={summary.user_id}>
                      <TableCell className="font-medium">{summary.full_name}</TableCell>
                      <TableCell>{summary.email}</TableCell>
                      <TableCell>
                        <Badge variant={summary.available_balance > 0 ? "default" : "secondary"}>
                          {formatCurrency(summary.available_balance)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(summary.total_earned)}</TableCell>
                      <TableCell>{formatCurrency(summary.total_used)}</TableCell>
                      <TableCell>{summary.active_credits_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Créditos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead>Fecha de Expiración</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredits.map((credit) => {
                    const isExpired = credit.expires_at && new Date(credit.expires_at) < new Date();
                    const isUsed = credit.is_used;
                    
                    return (
                      <TableRow key={credit.id}>
                        <TableCell className="font-medium">
                          {credit.profiles?.full_name}
                        </TableCell>
                        <TableCell>{formatCurrency(credit.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getCreditTypeLabel(credit.credit_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isUsed ? (
                            <Badge variant="secondary">Usado</Badge>
                          ) : isExpired ? (
                            <Badge variant="destructive">Expirado</Badge>
                          ) : (
                            <Badge variant="default">Disponible</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {credit.description}
                        </TableCell>
                        <TableCell>{formatDate(credit.created_at)}</TableCell>
                        <TableCell>
                          {credit.expires_at ? formatDate(credit.expires_at) : 'Sin expiración'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Transacciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Balance Anterior</TableHead>
                    <TableHead>Balance Posterior</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {transaction.profiles?.full_name}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            transaction.transaction_type === 'earned' ? 'default' :
                            transaction.transaction_type === 'used' ? 'secondary' :
                            transaction.transaction_type === 'expired' ? 'destructive' :
                            'outline'
                          }
                        >
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className={
                        transaction.transaction_type === 'earned' ? 'text-green-600' : 'text-red-600'
                      }>
                        {transaction.transaction_type === 'earned' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.balance_before)}</TableCell>
                      <TableCell>{formatCurrency(transaction.balance_after)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell>{formatDate(transaction.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}