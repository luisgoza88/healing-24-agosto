export const SERVICES = [
  {
    id: 'medicina-funcional',
    name: 'Medicina Funcional',
    color: '#3E5444',
    icon: 'medical-bag',
    description: 'Enfoque integral para optimizar tu salud',
  },
  {
    id: 'medicina-estetica',
    name: 'Medicina Estética',
    color: '#B8604D',
    icon: 'face-woman-shimmer',
    description: 'Tratamientos para realzar tu belleza natural',
  },
  {
    id: 'sueroterapia',
    name: 'Sueroterapia',
    color: '#879794',
    icon: 'iv-bag',
    description: 'Hidratación y nutrición intravenosa',
  },
  {
    id: 'bano-helado',
    name: 'Baño Helado',
    color: '#1F2E3B',
    icon: 'snowflake',
    description: 'Crioterapia para recuperación y bienestar',
  },
  {
    id: 'camara-hiperbarica',
    name: 'Cámara Hiperbárica',
    color: '#5E3532',
    icon: 'circle-slice-8',
    description: 'Oxigenación celular avanzada',
  },
  {
    id: 'medicina-regenerativa',
    name: 'Medicina Regenerativa',
    color: '#61473B',
    icon: 'dna',
    description: 'Terapias de regeneración celular',
  },
]

export const HOT_STUDIO_CLASSES = [
  {
    id: 'yoga',
    name: 'Yoga',
    color: '#3E5444',
    icon: 'yoga',
    description: 'Práctica integral de cuerpo y mente',
  },
  {
    id: 'pilates',
    name: 'Pilates',
    color: '#879794',
    icon: 'human',
    description: 'Fortalecimiento y flexibilidad',
  },
  {
    id: 'breathwork',
    name: 'Breathwork',
    color: '#B8604D',
    icon: 'lungs',
    description: 'Técnicas de respiración consciente',
  },
  {
    id: 'breath-sound',
    name: 'Breath & Sound',
    color: '#61473B',
    icon: 'music',
    description: 'Sanación a través del sonido y respiración',
  },
]

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export const STAFF_TYPES = {
  DOCTOR: 'doctor',
  INSTRUCTOR: 'instructor',
  THERAPIST: 'therapist',
} as const