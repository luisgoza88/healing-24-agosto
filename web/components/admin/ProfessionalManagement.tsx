'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfessionals, useServices } from '../../../shared/hooks/useServices';
import { createClient } from '@/src/lib/supabase';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  Award,
  Briefcase,
  ChevronRight,
  Search,
  Filter,
  UserPlus,
  Settings,
  AlertCircle,
  Check,
  Star
} from 'lucide-react';

interface Professional {
  id: string;
  user_id?: string;
  full_name: string;
  title?: string;
  specialties?: string[];
  bio?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

interface ProfessionalFormData {
  full_name: string;
  title: string;
  email: string;
  phone: string;
  specialties: string[];
  bio: string;
  active: boolean;
}

export default function ProfessionalManagement() {
  const supabase = createClient();
  const { professionals, loading, error, assignToService, unassignFromService, refresh } = useProfessionals(supabase);
  const { services } = useServices(supabase);
  
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingProfessional, setIsAddingProfessional] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Formulario de profesional
  const [professionalForm, setProfessionalForm] = useState<ProfessionalFormData>({
    full_name: '',
    title: '',
    email: '',
    phone: '',
    specialties: [],
    bio: '',
    active: true
  });

  // Estado para nueva especialidad
  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    if (selectedProfessional) {
      setProfessionalForm({
        full_name: selectedProfessional.full_name,
        title: selectedProfessional.title || '',
        email: selectedProfessional.email || '',
        phone: selectedProfessional.phone || '',
        specialties: selectedProfessional.specialties || [],
        bio: selectedProfessional.bio || '',
        active: selectedProfessional.active
      });
    }
  }, [selectedProfessional]);

  const filteredProfessionals = professionals.filter(prof => {
    const matchesSearch = prof.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          prof.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          prof.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterActive === 'all' || 
                          (filterActive === 'active' && prof.active) ||
                          (filterActive === 'inactive' && !prof.active);
    
    return matchesSearch && matchesFilter;
  });

  const handleSaveProfessional = async () => {
    setSaveStatus('saving');
    try {
      if (isAddingProfessional) {
        // Crear nuevo profesional
        const { data, error } = await supabase
          .from('professionals')
          .insert(professionalForm)
          .select()
          .single();
        
        if (error) throw error;
        
        // Asignar a servicios seleccionados
        for (const serviceId of selectedServices) {
          await assignToService(data.id, serviceId);
        }
      } else if (selectedProfessional) {
        // Actualizar profesional existente
        const { error } = await supabase
          .from('professionals')
          .update(professionalForm)
          .eq('id', selectedProfessional.id);
        
        if (error) throw error;
      }
      
      setSaveStatus('success');
      setIsEditMode(false);
      setIsAddingProfessional(false);
      refresh();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      console.error('Error saving professional:', err);
    }
  };

  const handleDeleteProfessional = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este profesional?')) return;
    
    try {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSelectedProfessional(null);
      refresh();
    } catch (err) {
      console.error('Error deleting professional:', err);
    }
  };

  const handleAddSpecialty = () => {
    if (newSpecialty && !professionalForm.specialties.includes(newSpecialty)) {
      setProfessionalForm({
        ...professionalForm,
        specialties: [...professionalForm.specialties, newSpecialty]
      });
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setProfessionalForm({
      ...professionalForm,
      specialties: professionalForm.specialties.filter(s => s !== specialty)
    });
  };

  const handleAssignServices = async () => {
    if (!selectedProfessional) return;
    
    setSaveStatus('saving');
    try {
      for (const serviceId of selectedServices) {
        await assignToService(selectedProfessional.id, serviceId);
      }
      setSaveStatus('success');
      setShowAssignDialog(false);
      setSelectedServices([]);
      refresh();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      console.error('Error assigning services:', err);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Profesionales</h1>
          <p className="text-muted-foreground">Administra el equipo de profesionales</p>
        </div>
        <Button onClick={() => {
          setIsAddingProfessional(true);
          setSelectedProfessional(null);
          setProfessionalForm({
            full_name: '',
            title: '',
            email: '',
            phone: '',
            specialties: [],
            bio: '',
            active: true
          });
        }}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Profesional
        </Button>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o especialidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterActive} onValueChange={(value: any) => setFilterActive(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Lista de Profesionales */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profesionales</CardTitle>
              <CardDescription>{filteredProfessionals.length} profesionales encontrados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="text-center py-4">Cargando...</div>
              ) : (
                filteredProfessionals.map((professional) => (
                  <div
                    key={professional.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedProfessional?.id === professional.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => {
                      setSelectedProfessional(professional);
                      setIsEditMode(false);
                      setIsAddingProfessional(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={professional.avatar_url} />
                          <AvatarFallback>{getInitials(professional.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{professional.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {professional.title || 'Sin título'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!professional.active && (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalles del Profesional */}
        <div className="md:col-span-2">
          {(selectedProfessional || isAddingProfessional) && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {isAddingProfessional ? 'Nuevo Profesional' : selectedProfessional?.full_name}
                  </CardTitle>
                  <div className="space-x-2">
                    {!isEditMode && !isAddingProfessional && selectedProfessional && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsEditMode(true)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteProfessional(selectedProfessional.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      </>
                    )}
                    {(isEditMode || isAddingProfessional) && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setIsEditMode(false);
                            setIsAddingProfessional(false);
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSaveProfessional}
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
                <Tabs defaultValue="info" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="info">Información</TabsTrigger>
                    <TabsTrigger value="services">Servicios</TabsTrigger>
                    <TabsTrigger value="schedule">Horarios</TabsTrigger>
                    <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                  </TabsList>

                  {/* Tab Información */}
                  <TabsContent value="info" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nombre Completo</Label>
                        <Input
                          id="full_name"
                          value={professionalForm.full_name}
                          onChange={(e) => setProfessionalForm({...professionalForm, full_name: e.target.value})}
                          disabled={!isEditMode && !isAddingProfessional}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                          id="title"
                          value={professionalForm.title}
                          onChange={(e) => setProfessionalForm({...professionalForm, title: e.target.value})}
                          disabled={!isEditMode && !isAddingProfessional}
                          placeholder="Ej: Dr., Dra., Lic."
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={professionalForm.email}
                          onChange={(e) => setProfessionalForm({...professionalForm, email: e.target.value})}
                          disabled={!isEditMode && !isAddingProfessional}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          value={professionalForm.phone}
                          onChange={(e) => setProfessionalForm({...professionalForm, phone: e.target.value})}
                          disabled={!isEditMode && !isAddingProfessional}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Biografía</Label>
                      <Textarea
                        id="bio"
                        value={professionalForm.bio}
                        onChange={(e) => setProfessionalForm({...professionalForm, bio: e.target.value})}
                        disabled={!isEditMode && !isAddingProfessional}
                        rows={4}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Especialidades</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {professionalForm.specialties.map((specialty) => (
                          <Badge key={specialty} variant="secondary">
                            {specialty}
                            {(isEditMode || isAddingProfessional) && (
                              <button
                                onClick={() => handleRemoveSpecialty(specialty)}
                                className="ml-2 text-xs hover:text-destructive"
                              >
                                ×
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                      {(isEditMode || isAddingProfessional) && (
                        <div className="flex space-x-2">
                          <Input
                            value={newSpecialty}
                            onChange={(e) => setNewSpecialty(e.target.value)}
                            placeholder="Nueva especialidad"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddSpecialty()}
                          />
                          <Button type="button" onClick={handleAddSpecialty} size="sm">
                            Agregar
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={professionalForm.active}
                        onCheckedChange={(checked) => setProfessionalForm({...professionalForm, active: checked})}
                        disabled={!isEditMode && !isAddingProfessional}
                      />
                      <Label htmlFor="active">Profesional Activo</Label>
                    </div>
                  </TabsContent>

                  {/* Tab Servicios */}
                  <TabsContent value="services" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Servicios Asignados</h3>
                      {selectedProfessional && (
                        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Plus className="mr-2 h-4 w-4" />
                              Asignar Servicios
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Asignar Servicios</DialogTitle>
                              <DialogDescription>
                                Selecciona los servicios que este profesional puede atender
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              {services.map((service) => (
                                <div key={service.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={service.id}
                                    checked={selectedServices.includes(service.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedServices([...selectedServices, service.id]);
                                      } else {
                                        setSelectedServices(selectedServices.filter(s => s !== service.id));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={service.id} className="flex-1 cursor-pointer">
                                    {service.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleAssignServices}>
                                Asignar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      El profesional puede atender estos servicios
                    </div>
                  </TabsContent>

                  {/* Tab Horarios */}
                  <TabsContent value="schedule" className="space-y-4">
                    <h3 className="text-lg font-semibold">Disponibilidad</h3>
                    <div className="text-sm text-muted-foreground">
                      Configuración de horarios disponibles
                    </div>
                  </TabsContent>

                  {/* Tab Estadísticas */}
                  <TabsContent value="stats" className="space-y-4">
                    <h3 className="text-lg font-semibold">Estadísticas</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Citas Totales</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">0</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Esta Semana</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">0</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Calificación</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="ml-1 text-2xl font-bold">0.0</span>
                          </div>
                        </CardContent>
                      </Card>
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
