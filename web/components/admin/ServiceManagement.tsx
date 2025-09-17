'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useServicesAdmin, useServiceFormatters } from '../../../shared/hooks/useServices';
import { createClient } from '@/src/lib/supabase';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  Settings,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Palette,
  Activity,
  AlertCircle,
  Check,
  ChevronRight,
  Package,
  Briefcase,
  Heart,
  Sparkles,
  Dna,
  Droplet,
  Smile,
  HandHeart,
  HeartPulse,
  Dumbbell
} from 'lucide-react';

// Mapeo de iconos
const iconMap: Record<string, any> = {
  'medical-bag': Briefcase,
  'face-woman-shimmer': Sparkles,
  'dna': Dna,
  'medical-services': Droplet,
  'face': Smile,
  'spa': HandHeart,
  'heart-pulse': HeartPulse,
  'fitness': Dumbbell
};

interface Service {
  id: string;
  code: string;
  name: string;
  description?: string;
  base_price: number;
  duration_minutes: number;
  color: string;
  icon: string;
  category_name?: string;
  category_code?: string;
  active: boolean;
  sub_service_count?: number;
  professional_count?: number;
  total_appointments?: number;
  upcoming_appointments?: number;
}

interface SubService {
  id?: string;
  service_id?: string;
  name: string;
  price: number;
  duration_minutes: number;
  price_note?: string;
  order_index?: number;
  active?: boolean;
}

export default function ServiceManagement() {
  const supabase = createClient();
  const { dashboardStats, loading, error, createService, updateService, createSubService, updateSubService, refresh } = useServicesAdmin(supabase);
  const { formatPrice, formatDuration } = useServiceFormatters();
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isAddingSubService, setIsAddingSubService] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  // Formulario de servicio
  const [serviceForm, setServiceForm] = useState({
    name: '',
    code: '',
    description: '',
    base_price: 0,
    duration_minutes: 60,
    color: '#000000',
    icon: 'medical-bag',
    category_code: 'medical',
    active: true
  });

  // Formulario de sub-servicio
  const [subServiceForm, setSubServiceForm] = useState<SubService>({
    name: '',
    price: 0,
    duration_minutes: 60,
    price_note: '',
    order_index: 0,
    active: true
  });

  useEffect(() => {
    if (selectedService) {
      setServiceForm({
        name: selectedService.name,
        code: selectedService.code,
        description: selectedService.description || '',
        base_price: selectedService.base_price,
        duration_minutes: selectedService.duration_minutes,
        color: selectedService.color,
        icon: selectedService.icon,
        category_code: selectedService.category_code || 'medical',
        active: selectedService.active
      });
    }
  }, [selectedService]);

  const handleSaveService = async () => {
    setSaveStatus('saving');
    try {
      if (isAddingService) {
        await createService(serviceForm);
      } else if (selectedService) {
        await updateService(selectedService.id, serviceForm);
      }
      setSaveStatus('success');
      setIsEditMode(false);
      setIsAddingService(false);
      refresh();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      console.error('Error saving service:', err);
    }
  };

  const handleSaveSubService = async () => {
    if (!selectedService) return;
    
    setSaveStatus('saving');
    try {
      await createSubService({
        ...subServiceForm,
        service_id: selectedService.id
      });
      setSaveStatus('success');
      setIsAddingSubService(false);
      refresh();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      console.error('Error saving sub-service:', err);
    }
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || Activity;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Servicios</h1>
          <p className="text-muted-foreground">Administra todos los servicios y configuraciones</p>
        </div>
        <Button onClick={() => {
          setIsAddingService(true);
          setSelectedService(null);
          setServiceForm({
            name: '',
            code: '',
            description: '',
            base_price: 0,
            duration_minutes: 60,
            color: '#000000',
            icon: 'medical-bag',
            category_code: 'medical',
            active: true
          });
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Servicio
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servicios</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.length}</div>
            <p className="text-xs text-muted-foreground">Servicios activos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sub-servicios</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.reduce((acc, s) => acc + (s.sub_service_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total sub-servicios</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profesionales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.reduce((acc, s) => acc + (s.professional_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Asignaciones totales</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.reduce((acc, s) => acc + (s.upcoming_appointments || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Próximas citas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Lista de Servicios */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Servicios</CardTitle>
              <CardDescription>Selecciona un servicio para editar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="text-center py-4">Cargando...</div>
              ) : (
                dashboardStats.map((service) => {
                  const IconComponent = getIconComponent(service.icon);
                  return (
                    <div
                      key={service.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedService?.id === service.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => {
                        setSelectedService(service);
                        setIsEditMode(false);
                        setIsAddingService(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${service.color}20` }}
                          >
                            <IconComponent 
                              className="h-5 w-5" 
                              style={{ color: service.color }}
                            />
                          </div>
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {service.sub_service_count || 0} sub-servicios
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalles del Servicio */}
        <div className="md:col-span-2">
          {(selectedService || isAddingService) && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {isAddingService ? 'Nuevo Servicio' : selectedService?.name}
                  </CardTitle>
                  <div className="space-x-2">
                    {!isEditMode && !isAddingService && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditMode(true)}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    )}
                    {(isEditMode || isAddingService) && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setIsEditMode(false);
                            setIsAddingService(false);
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSaveService}
                          disabled={saveStatus === 'saving'}
                        >
                          {saveStatus === 'saving' ? (
                            <>Guardando...</>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Guardar
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="general" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="subservices">Sub-servicios</TabsTrigger>
                    <TabsTrigger value="professionals">Profesionales</TabsTrigger>
                    <TabsTrigger value="settings">Configuración</TabsTrigger>
                  </TabsList>

                  {/* Tab General */}
                  <TabsContent value="general" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                          id="name"
                          value={serviceForm.name}
                          onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                          disabled={!isEditMode && !isAddingService}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="code">Código</Label>
                        <Input
                          id="code"
                          value={serviceForm.code}
                          onChange={(e) => setServiceForm({...serviceForm, code: e.target.value})}
                          disabled={!isEditMode && !isAddingService}
                          placeholder="ej: medicina-funcional"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="price">Precio Base</Label>
                        <Input
                          id="price"
                          type="number"
                          value={serviceForm.base_price}
                          onChange={(e) => setServiceForm({...serviceForm, base_price: Number(e.target.value)})}
                          disabled={!isEditMode && !isAddingService}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duración (minutos)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={serviceForm.duration_minutes}
                          onChange={(e) => setServiceForm({...serviceForm, duration_minutes: Number(e.target.value)})}
                          disabled={!isEditMode && !isAddingService}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="color"
                            type="color"
                            value={serviceForm.color}
                            onChange={(e) => setServiceForm({...serviceForm, color: e.target.value})}
                            disabled={!isEditMode && !isAddingService}
                            className="w-20"
                          />
                          <Input
                            value={serviceForm.color}
                            onChange={(e) => setServiceForm({...serviceForm, color: e.target.value})}
                            disabled={!isEditMode && !isAddingService}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="icon">Icono</Label>
                        <Select 
                          value={serviceForm.icon}
                          onValueChange={(value) => setServiceForm({...serviceForm, icon: value})}
                          disabled={!isEditMode && !isAddingService}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(iconMap).map((iconName) => {
                              const IconComp = iconMap[iconName];
                              return (
                                <SelectItem key={iconName} value={iconName}>
                                  <div className="flex items-center space-x-2">
                                    <IconComp className="h-4 w-4" />
                                    <span>{iconName}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                        disabled={!isEditMode && !isAddingService}
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={serviceForm.active}
                        onCheckedChange={(checked) => setServiceForm({...serviceForm, active: checked})}
                        disabled={!isEditMode && !isAddingService}
                      />
                      <Label htmlFor="active">Servicio Activo</Label>
                    </div>

                    {selectedService && !isEditMode && (
                      <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Citas</p>
                          <p className="text-2xl font-bold">{selectedService.total_appointments || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Próximas Citas</p>
                          <p className="text-2xl font-bold">{selectedService.upcoming_appointments || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Profesionales</p>
                          <p className="text-2xl font-bold">{selectedService.professional_count || 0}</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab Sub-servicios */}
                  <TabsContent value="subservices" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Sub-servicios</h3>
                      <Button 
                        size="sm"
                        onClick={() => setIsAddingSubService(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                    </div>

                    {isAddingSubService && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Nuevo Sub-servicio</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Nombre</Label>
                              <Input
                                value={subServiceForm.name}
                                onChange={(e) => setSubServiceForm({...subServiceForm, name: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Precio</Label>
                              <Input
                                type="number"
                                value={subServiceForm.price}
                                onChange={(e) => setSubServiceForm({...subServiceForm, price: Number(e.target.value)})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Duración (min)</Label>
                              <Input
                                type="number"
                                value={subServiceForm.duration_minutes}
                                onChange={(e) => setSubServiceForm({...subServiceForm, duration_minutes: Number(e.target.value)})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Nota de precio</Label>
                              <Input
                                value={subServiceForm.price_note || ''}
                                onChange={(e) => setSubServiceForm({...subServiceForm, price_note: e.target.value})}
                                placeholder="ej: desde"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline"
                              onClick={() => setIsAddingSubService(false)}
                            >
                              Cancelar
                            </Button>
                            <Button onClick={handleSaveSubService}>
                              Guardar Sub-servicio
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="text-sm text-muted-foreground">
                      {selectedService?.sub_service_count || 0} sub-servicios configurados
                    </div>
                  </TabsContent>

                  {/* Tab Profesionales */}
                  <TabsContent value="professionals" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Profesionales Asignados</h3>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Asignar Profesional
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedService?.professional_count || 0} profesionales asignados
                    </div>
                  </TabsContent>

                  {/* Tab Configuración */}
                  <TabsContent value="settings" className="space-y-4">
                    <h3 className="text-lg font-semibold">Configuración Avanzada</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Reserva Online</Label>
                          <p className="text-sm text-muted-foreground">
                            Permitir reservas desde la app
                          </p>
                        </div>
                        <Switch />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Requiere Depósito</Label>
                          <p className="text-sm text-muted-foreground">
                            Solicitar pago anticipado
                          </p>
                        </div>
                        <Switch />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Horas de Cancelación</Label>
                        <Input type="number" placeholder="24" />
                        <p className="text-sm text-muted-foreground">
                          Horas mínimas para cancelar sin penalización
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {saveStatus === 'success' && (
                  <Alert className="mt-4">
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      Cambios guardados exitosamente
                    </AlertDescription>
                  </Alert>
                )}
                
                {saveStatus === 'error' && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Error al guardar los cambios
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
