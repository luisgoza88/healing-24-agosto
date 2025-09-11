export const SERVICES = [
  {
    id: 'medicina-funcional',
    name: 'Medicina Funcional',
    color: '#3E5444',
    icon: 'medical-bag',
    description: 'Consultas especializadas y péptidos',
    subServices: [
      { name: 'Consulta funcional – primera vez', duration: 75, price: 300000 },
      { name: 'Consulta funcional – seguimiento', duration: 30, price: 150000 },
      { name: 'Consulta péptidos', duration: 60, price: 200000 },
      { name: 'Consulta células madre', duration: 60, price: 200000 },
    ]
  },
  {
    id: 'medicina-estetica',
    name: 'Medicina Estética',
    color: '#B8604D',
    icon: 'face-woman-shimmer',
    description: 'Procedimientos estéticos avanzados',
    subServices: [
      { name: 'Consulta medicina estética valoración', duration: 60, price: 150000 },
      { name: 'Procedimientos estéticos', duration: 60, price: 750000, priceNote: 'desde' },
    ]
  },
  {
    id: 'medicina-regenerativa',
    name: 'Medicina Regenerativa & Longevidad',
    color: '#5E3532',
    icon: 'dna',
    description: 'Terapias antiedad y bienestar',
    subServices: [
      { name: 'Baño helado', duration: 30, price: 80000 },
      { name: 'Sauna infrarrojo', duration: 45, price: 130000 },
      { name: 'Baño helado + sauna infrarrojo', duration: 60, price: 190000 },
      { name: 'Cámara hiperbárica', duration: 60, price: 180000 },
    ]
  },
  {
    id: 'drips',
    name: 'DRIPS - Sueroterapia',
    color: '#4A6C9B',
    icon: 'medical-services',
    description: 'Terapias intravenosas y sueroterapia',
    subServices: [
      { name: 'Vitaminas - IV Drips', duration: 60, price: 265000, priceNote: 'desde' },
      { name: 'NAD 125 mg', duration: 90, price: 400000 },
      { name: 'NAD 500 mg', duration: 180, price: 1500000 },
      { name: 'NAD 1000 mg', duration: 240, price: 2300000 },
      { name: 'Ozonoterapia – suero ozonizado', duration: 60, price: 300000 },
      { name: 'Ozonoterapia – autohemoterapia mayor', duration: 60, price: 350000 },
    ]
  },
  {
    id: 'faciales',
    name: 'Faciales',
    color: '#879794',
    icon: 'face',
    description: 'Tratamientos faciales especializados',
    subServices: [
      { name: 'Clean Facial', duration: 75, price: 280000 },
      { name: 'Glow Facial', duration: 90, price: 380000 },
      { name: 'Anti-Age Facial', duration: 90, price: 380000 },
      { name: 'Anti-Acné Facial', duration: 90, price: 380000 },
      { name: 'Lymph Facial', duration: 90, price: 380000 },
    ]
  },
  {
    id: 'masajes',
    name: 'Masajes',
    color: '#61473B',
    icon: 'spa',
    description: 'Masajes terapéuticos y relajantes',
    subServices: [
      { name: 'Drenaje linfático', duration: 75, price: 190000 },
      { name: 'Relajante', duration: 75, price: 200000 },
    ]
  },
  {
    id: 'wellness-integral',
    name: 'Wellness Integral',
    color: '#879794',
    icon: 'heart-pulse',
    description: 'Servicios de bienestar integral',
    subServices: []
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