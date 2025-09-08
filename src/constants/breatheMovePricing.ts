export interface PricingPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  classes: number | 'unlimited';
  validity: {
    amount: number;
    unit: 'days' | 'months' | 'year';
  };
  popular?: boolean;
  special?: boolean;
  validUntil?: string;
}

export const BREATHE_MOVE_PRICING: PricingPackage[] = [
  {
    id: 'single',
    name: '1 Clase',
    description: 'Clase individual o clase de prueba',
    price: 65000,
    classes: 1,
    validity: { amount: 1, unit: 'days' }
  },
  {
    id: 'week',
    name: 'Semana',
    description: 'Acceso ilimitado por 1 semana',
    price: 170000,
    classes: 'unlimited',
    validity: { amount: 7, unit: 'days' }
  },
  {
    id: 'pack4',
    name: '4 Clases',
    description: 'Paquete de 4 clases',
    price: 190000,
    classes: 4,
    validity: { amount: 1, unit: 'months' }
  },
  {
    id: 'pack8',
    name: '8 Clases',
    description: 'Nuestro paquete más popular',
    price: 350000,
    classes: 8,
    validity: { amount: 2, unit: 'months' },
    popular: true
  },
  {
    id: 'pack12',
    name: '12 Clases',
    description: 'Paquete trimestral',
    price: 480000,
    classes: 12,
    validity: { amount: 3, unit: 'months' }
  },
  {
    id: 'pack24',
    name: '24 Clases',
    description: 'Paquete semestral',
    price: 720000,
    classes: 24,
    validity: { amount: 6, unit: 'months' }
  },
  {
    id: 'monthly',
    name: 'Mensualidad',
    description: 'Clases ilimitadas por mes',
    price: 450000,
    classes: 'unlimited',
    validity: { amount: 1, unit: 'months' }
  },
  {
    id: 'bimonthly',
    name: 'Bimestral',
    description: 'Clases ilimitadas por 2 meses',
    price: 800000,
    classes: 'unlimited',
    validity: { amount: 2, unit: 'months' }
  },
  {
    id: 'quarterly',
    name: 'Trimestre',
    description: 'Clases ilimitadas por 3 meses',
    price: 1100000,
    classes: 'unlimited',
    validity: { amount: 3, unit: 'months' }
  },
  {
    id: 'semester',
    name: 'Semestral',
    description: 'Clases ilimitadas por 6 meses',
    price: 1800000,
    classes: 'unlimited',
    validity: { amount: 6, unit: 'months' }
  },
  {
    id: 'annual',
    name: 'Anual',
    description: 'Descuento especial hasta marzo 31',
    price: 2290000,
    originalPrice: 3200000,
    classes: 'unlimited',
    validity: { amount: 1, unit: 'year' },
    special: true,
    validUntil: '2025-03-31'
  }
];

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

export const getValidityText = (validity: { amount: number; unit: string }): string => {
  const { amount, unit } = validity;
  
  switch (unit) {
    case 'days':
      return amount === 1 ? '1 día' : `${amount} días`;
    case 'months':
      return amount === 1 ? '1 mes' : `${amount} meses`;
    case 'year':
      return amount === 1 ? '1 año' : `${amount} años`;
    default:
      return '';
  }
};

export const getClassesText = (classes: number | 'unlimited'): string => {
  if (classes === 'unlimited') {
    return 'Clases ilimitadas';
  } else if (classes === 1) {
    return '1 clase';
  } else {
    return `${classes} clases`;
  }
};