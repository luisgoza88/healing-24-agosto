'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { createClient } from '@/src/lib/supabase';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Activity,
  TrendingUp,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
  Download,
  Upload,
  Zap,
  Wind,
  Heart,
  Dumbbell,
  Mountain,
  Waves
} from 'lucide-react';

// Tipos de clases de Breathe & Move
const CLASS_TYPES = [
  { id: 'yoga', name: 'Yoga', icon: Wind, color: '#4CAF50', intensity: 'Baja' },
  { id: 'pilates', name: 'Pilates', icon: Activity, color: '#2196F3', intensity: 'Media' },
  { id: 'hiit', name: 'HIIT', icon: Zap, color: '#FF5722', intensity: 'Alta' },
  { id: 'functional', name: 'Functional Training', icon: Dumbbell, color: '#FF9800', intensity: 'Alta' },
  { id: 'meditation', name: 'Meditación', icon: Heart, color: '#9C27B0', intensity: 'Baja' },
  { id: 'breathwork', name: 'Respiración', icon: Wind, color: '#00BCD4', intensity: 'Baja' },
  { id: 'mobility', name: 'Movilidad', icon: Waves, color: '#4CAF50', intensity: 'Media' },
  { id: 'strength', name: 'Fuerza', icon: Mountain, color: '#795548', intensity: 'Alta' }
];

interface BreatheMoveClass {
  id?: string;
  class_name: string;
  instructor: string;
  class_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_capacity: number;
  status: 'active' | 'cancelled' | 'full';
  intensity: string;
  description?: string;
}

interface ClassTemplate {
  id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  instructor: string;
  max_capacity: number;
  intensity: string;
  active: boolean;
}

export default function BreatheMoveManagement() {
  const supabase = createClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWeek, setSelectedWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [classes, setClasses] = useState<BreatheMoveClass[]>([]);
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [instructors, setInstructors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<BreatheMoveClass | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Formulario de clase
  const [classForm, setClassForm] = useState<BreatheMoveClass>({
    class_name: '',
    instructor: '',
    class_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
    max_capacity: 15,
    current_capacity: 0,
    status: 'active',
    intensity: 'Media',
    description: ''
  });

  // Estadísticas
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalEnrollments: 0,
    averageCapacity: 0,
    popularClass: '',
    topInstructor: ''
  });

  useEffect(() => {
    loadClasses();
    loadInstructors();
    loadTemplates();
    loadStats();
  }, [selectedWeek]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const startDate = startOfWeek(selectedWeek, { weekStartsOn: 1 });
      const endDate = endOfWeek(selectedWeek, { weekStartsOn: 1 });
      
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .gte('class_date', format(startDate, 'yyyy-MM-dd'))
        .lte('class_date', format(endDate, 'yyyy-MM-dd'))
        .order('class_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('instructor')
        .order('instructor');

      if (error) throw error;
      
      const uniqueInstructors = [...new Set(data?.map(d => d.instructor) || [])];
      setInstructors(uniqueInstructors);
    } catch (error) {
      console.error('Error loading instructors:', error);
    }
  };

  const loadTemplates = async () => {
    // Por ahora usar templates hardcodeados
    setTemplates([
      {
        id: '1',
        name: 'Yoga Matutino',
        day_of_week: 1,
        start_time: '07:00',
        end_time: '08:00',
        instructor: 'Ana García',
        max_capacity: 15,
        intensity: 'Baja',
        active: true
      },
      {
        id: '2',
        name: 'HIIT Express',
        day_of_week: 3,
        start_time: '18:00',
        end_time: '19:00',
        instructor: 'Carlos Mendez',
        max_capacity: 12,
        intensity: 'Alta',
        active: true
      }
    ]);
  };

  const loadStats = async () => {
    try {
      const { data: classData } = await supabase
        .from('breathe_move_classes')
        .select('*');
      
      const { data: enrollmentData } = await supabase
        .from('breathe_move_enrollments')
        .select('*');
      
      if (classData) {
        const totalClasses = classData.length;
        const totalEnrollments = enrollmentData?.length || 0;
        const avgCapacity = classData.reduce((acc, c) => acc + (c.current_capacity / c.max_capacity), 0) / totalClasses * 100;
        
        // Encontrar clase más popular
        const classCounts: Record<string, number> = {};
        classData.forEach(c => {
          classCounts[c.class_name] = (classCounts[c.class_name] || 0) + c.current_capacity;
        });
        const popularClass = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        
        // Encontrar instructor más popular
        const instructorCounts: Record<string, number> = {};
        classData.forEach(c => {
          instructorCounts[c.instructor] = (instructorCounts[c.instructor] || 0) + c.current_capacity;
        });
        const topInstructor = Object.entries(instructorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        
        setStats({
          totalClasses,
          totalEnrollments,
          averageCapacity: Math.round(avgCapacity),
          popularClass,
          topInstructor
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSaveClass = async () => {
    setSaveStatus('saving');
    try {
      if (editingClass?.id) {
        // Actualizar clase existente
        const { error } = await supabase
          .from('breathe_move_classes')
          .update(classForm)
          .eq('id', editingClass.id);
        
        if (error) throw error;
      } else {
        // Crear nueva clase
        const { error } = await supabase
          .from('breathe_move_classes')
          .insert(classForm);
        
        if (error) throw error;
      }
      
      setSaveStatus('success');
      setShowClassDialog(false);
      setEditingClass(null);
      loadClasses();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving class:', error);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta clase?')) return;
    
    try {
      const { error } = await supabase
        .from('breathe_move_classes')
        .delete()
        .eq('id', classId);
      
      if (error) throw error;
      loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const handleCancelClass = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('breathe_move_classes')
        .update({ status: 'cancelled' })
        .eq('id', classId);
      
      if (error) throw error;
      loadClasses();
    } catch (error) {
      console.error('Error cancelling class:', error);
    }
  };

  const applyTemplate = async (template: ClassTemplate) => {
    const weekDays = eachDayOfInterval({
      start: startOfWeek(selectedWeek, { weekStartsOn: 1 }),
      end: endOfWeek(selectedWeek, { weekStartsOn: 1 })
    });
    
    const targetDate = weekDays.find(day => day.getDay() === template.day_of_week);
    
    if (targetDate) {
      const newClass: BreatheMoveClass = {
        class_name: template.name,
        instructor: template.instructor,
        class_date: format(targetDate, 'yyyy-MM-dd'),
        start_time: template.start_time,
        end_time: template.end_time,
        max_capacity: template.max_capacity,
        current_capacity: 0,
        status: 'active',
        intensity: template.intensity
      };
      
      try {
        const { error } = await supabase
          .from('breathe_move_classes')
          .insert(newClass);
        
        if (error) throw error;
        loadClasses();
      } catch (error) {
        console.error('Error applying template:', error);
      }
    }
  };

  const duplicateWeek = async () => {
    const nextWeek = addDays(selectedWeek, 7);
    
    try {
      for (const cls of classes) {
        const newDate = addDays(parseISO(cls.class_date), 7);
        const newClass = {
          ...cls,
          id: undefined,
          class_date: format(newDate, 'yyyy-MM-dd'),
          current_capacity: 0
        };
        
        const { error } = await supabase
          .from('breathe_move_classes')
          .insert(newClass);
        
        if (error) throw error;
      }
      
      setSelectedWeek(nextWeek);
    } catch (error) {
      console.error('Error duplicating week:', error);
    }
  };

  const getClassesForDay = (date: Date) => {
    return classes.filter(cls => 
      isSameDay(parseISO(cls.class_date), date)
    );
  };

  const getClassType = (className: string) => {
    return CLASS_TYPES.find(type => 
      className.toLowerCase().includes(type.name.toLowerCase())
    ) || CLASS_TYPES[0];
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedWeek, { weekStartsOn: 1 }),
    end: endOfWeek(selectedWeek, { weekStartsOn: 1 })
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Breathe & Move</h1>
          <p className="text-muted-foreground">Administra las clases y horarios</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={duplicateWeek}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicar Semana
          </Button>
          <Button onClick={() => {
            setEditingClass(null);
            setClassForm({
              class_name: '',
              instructor: '',
              class_date: format(selectedDate, 'yyyy-MM-dd'),
              start_time: '09:00',
              end_time: '10:00',
              max_capacity: 15,
              current_capacity: 0,
              status: 'active',
              intensity: 'Media',
              description: ''
            });
            setShowClassDialog(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Clase
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clases Totales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">Esta semana</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inscripciones</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageCapacity}%</div>
            <p className="text-xs text-muted-foreground">Promedio</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clase Popular</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{stats.popularClass || 'N/A'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Instructor</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{stats.topInstructor || 'N/A'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="instructors">Instructores</TabsTrigger>
          <TabsTrigger value="analytics">Analíticas</TabsTrigger>
        </TabsList>

        {/* Tab Calendario */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Controles de navegación */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                Semana del {format(selectedWeek, "d 'de' MMMM", { locale: es })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Hoy
            </Button>
          </div>

          {/* Vista de calendario semanal */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayClasses = getClassesForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <Card key={day.toISOString()} className={isToday ? 'border-primary' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {format(day, 'EEE', { locale: es })}
                    </CardTitle>
                    <CardDescription>{format(day, 'd MMM', { locale: es })}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dayClasses.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Sin clases
                      </p>
                    ) : (
                      dayClasses.map((cls) => {
                        const classType = getClassType(cls.class_name);
                        const IconComponent = classType.icon;
                        
                        return (
                          <div
                            key={cls.id}
                            className="p-2 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                            style={{ borderLeftColor: classType.color, borderLeftWidth: '3px' }}
                            onClick={() => {
                              setEditingClass(cls);
                              setClassForm(cls);
                              setShowClassDialog(true);
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center">
                                <IconComponent className="h-3 w-3 mr-1" style={{ color: classType.color }} />
                                <span className="text-xs font-medium">{cls.class_name}</span>
                              </div>
                              {cls.status === 'cancelled' && (
                                <Badge variant="destructive" className="text-xs">Cancelada</Badge>
                              )}
                              {cls.status === 'full' && (
                                <Badge variant="secondary" className="text-xs">Llena</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {cls.start_time} - {cls.end_time}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cls.instructor}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <Badge variant="outline" className="text-xs">
                                {cls.intensity}
                              </Badge>
                              <span className="text-xs">
                                {cls.current_capacity}/{cls.max_capacity}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setEditingClass(null);
                        setClassForm({
                          class_name: '',
                          instructor: '',
                          class_date: format(day, 'yyyy-MM-dd'),
                          start_time: '09:00',
                          end_time: '10:00',
                          max_capacity: 15,
                          current_capacity: 0,
                          status: 'active',
                          intensity: 'Media',
                          description: ''
                        });
                        setShowClassDialog(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab Plantillas */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Plantillas de Clases</h3>
            <Button size="sm" onClick={() => setShowTemplateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Plantilla
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription>
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][template.day_of_week]} • 
                    {template.start_time} - {template.end_time}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Instructor:</span>
                      <span>{template.instructor}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capacidad:</span>
                      <span>{template.max_capacity} personas</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Intensidad:</span>
                      <Badge variant="outline">{template.intensity}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => applyTemplate(template)}
                    >
                      Aplicar a esta semana
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab Instructores */}
        <TabsContent value="instructors" className="space-y-4">
          <h3 className="text-lg font-semibold">Instructores</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {instructors.map((instructor) => (
              <Card key={instructor}>
                <CardHeader>
                  <CardTitle className="text-base">{instructor}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Clases asignadas esta semana
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab Analíticas */}
        <TabsContent value="analytics" className="space-y-4">
          <h3 className="text-lg font-semibold">Analíticas</h3>
          <div className="text-muted-foreground">
            Próximamente: Gráficos y métricas detalladas
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para editar/crear clase */}
      <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? 'Editar Clase' : 'Nueva Clase'}
            </DialogTitle>
            <DialogDescription>
              Configura los detalles de la clase
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class_name">Nombre de la Clase</Label>
                <Select
                  value={classForm.class_name}
                  onValueChange={(value) => setClassForm({...classForm, class_name: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instructor">Instructor</Label>
                <Input
                  id="instructor"
                  value={classForm.instructor}
                  onChange={(e) => setClassForm({...classForm, instructor: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="class_date">Fecha</Label>
                <Input
                  id="class_date"
                  type="date"
                  value={classForm.class_date}
                  onChange={(e) => setClassForm({...classForm, class_date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="intensity">Intensidad</Label>
                <Select
                  value={classForm.intensity}
                  onValueChange={(value) => setClassForm({...classForm, intensity: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baja">Baja</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start_time">Hora Inicio</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={classForm.start_time}
                  onChange={(e) => setClassForm({...classForm, start_time: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time">Hora Fin</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={classForm.end_time}
                  onChange={(e) => setClassForm({...classForm, end_time: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_capacity">Capacidad Máxima</Label>
                <Input
                  id="max_capacity"
                  type="number"
                  value={classForm.max_capacity}
                  onChange={(e) => setClassForm({...classForm, max_capacity: Number(e.target.value)})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={classForm.status}
                  onValueChange={(value: any) => setClassForm({...classForm, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="full">Llena</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                value={classForm.description || ''}
                onChange={(e) => setClassForm({...classForm, description: e.target.value})}
                placeholder="Descripción adicional de la clase"
              />
            </div>
          </div>
          <DialogFooter>
            {editingClass && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (editingClass.id) {
                    handleDeleteClass(editingClass.id);
                    setShowClassDialog(false);
                  }
                }}
              >
                Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowClassDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveClass} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert de estado */}
      {saveStatus === 'success' && (
        <Alert className="fixed bottom-4 right-4 w-auto">
          <Check className="h-4 w-4" />
          <AlertDescription>
            Cambios guardados exitosamente
          </AlertDescription>
        </Alert>
      )}
      
      {saveStatus === 'error' && (
        <Alert variant="destructive" className="fixed bottom-4 right-4 w-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al guardar los cambios
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
